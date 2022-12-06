package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/hesusruiz/vcutils/yaml"

	"errors"

	"github.com/evanw/esbuild/pkg/api"

	"flag"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/otiai10/copy"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
)

var (
	port      = flag.String("port", ":3500", "Port to listen on")
	autobuild = flag.Bool("auto", true, "Perform build on every request to the root path")
)

const (
	defaultsourcedir               = "front/src"
	defaulttargetdir               = "docs"
	defaulthtmlfile                = "index.html"
	defaultentryPoints             = "app.js"
	defaultpagedir                 = "/pages"
	defaultstaticAssets_source     = "front/src/public"
	defaultstaticAssets_target     = "docs"
	defaultsubdomainprefix         = "/faster"
	defaultdevserver_listenAddress = ":3500"
	defaultdevserver_autobuild     = true
)

type Application struct {
	cfg               *yaml.YAML
	entryPointMapping map[string]string
	entryPointCSS     map[string]string
	pageMapping       map[string]string
}

// main starts the build process, with the option of starting a development
// server for tool-less workflows
func main() {

	// Initialize the log and its format
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zlog.Logger = zlog.With().Caller().Logger()

	var result api.BuildResult

	flag.Usage = func() {
		fmt.Printf("Usage of faster (v0.3)\n")
		fmt.Println("  faster build\tBuild the application")
		fmt.Println("  faster serve\tStart a development server that builds automatically when reloading")
		fmt.Println()
		fmt.Println("faster uses a configuration file named 'devserver.yaml' located in the current directory.")
		fmt.Println()
		fmt.Println("The development server has the following flags:")
		flag.PrintDefaults()
	}

	// Parse the cli flags
	flag.Parse()
	argsCmd := flag.Args()

	app := &Application{}

	// Read the configuration file
	cfg := readConfiguration()
	app.cfg = cfg

	// Prepare the arguments map
	args := map[string]bool{}
	for _, arg := range argsCmd {
		args[arg] = true
	}

	// Perform a standard build if no arguments specified
	if len(args) == 0 {
		args["build"] = true
	}

	// This is here to facilitate experiments
	if args["test"] {
		performExperiments(cfg)
		os.Exit(0)
	}

	// Extract dependencies and prebuild them
	if args["deps"] {
		result = buildDeps(cfg)
	}

	// Perform a standard build
	if args["build"] {
		result = build(cfg)
	}

	// Display information about the bundling results
	if args["meta"] {
		if len(result.Metafile) > 0 {
			fmt.Println("*******************************")
			text := api.AnalyzeMetafile(result.Metafile, api.AnalyzeMetafileOptions{})
			fmt.Printf("%s", text)
			fmt.Println("*******************************")
		}
	}

	// Start the development web server, serving requests until stopped
	if args["serve"] {
		DevServer(cfg)
		<-make(chan bool)
	}

}

// build performs a standard build
func build(cfg *yaml.YAML) api.BuildResult {
	// processTemplates(cfg)

	preprocess(cfg)
	result := buildAndBundle(cfg)
	// processResult(result, cfg)
	copyStaticAssets(cfg)
	postprocess(result, cfg)

	return result

}

// preprocess is executed before build, for example to clean the target directory
func preprocess(cfg *yaml.YAML) {
	fmt.Println("Preprocessing")
	if cfg.Bool("cleantarget") {
		deleteTargetDir(cfg)
	}
}

// Clean the target directory from all build artifacts
func deleteTargetDir(cfg *yaml.YAML) {
	targetDir := cfg.String("targetdir", defaulttargetdir)
	if len(targetDir) > 0 {
		os.RemoveAll(targetDir)
	}
}

// buildAndBundle uses ESBUILD to build and bundle js/css files
func buildAndBundle(cfg *yaml.YAML) api.BuildResult {
	fmt.Println("Building")

	// Generate the options structure
	options := buildOptions(cfg)

	// Run ESBUILD
	result := api.Build(options)

	// Print any errors
	printErrors(result.Errors)
	if len(result.Errors) > 0 {
		os.Exit(1)
	}

	return result

}

// Generate the build options struct for ESBUILD
func buildOptions(cfg *yaml.YAML) api.BuildOptions {

	// The base input directory of the project
	sourceDir := cfg.String("sourcedir", defaultsourcedir)

	// Build an array with the relative path of the main entrypoints
	entryPoints := cfg.ListString("entryPoints")
	for i := range entryPoints {
		entryPoints[i] = filepath.Join(sourceDir, entryPoints[i])
	}

	// The pages are also entrypoints to process, because they are lazy-loaded
	pages := pageEntryPoints(cfg)

	// Consolidate all entrypoints in a single list
	entryPoints = append(entryPoints, pages...)

	options := api.BuildOptions{
		EntryPoints: entryPoints,
		Format:      api.FormatESModule,
		Outdir:      cfg.String("targetdir"),
		Write:       true,
		Bundle:      true,
		Splitting:   true,
		ChunkNames:  "chunks/[name]-[hash]",
		Define: map[string]string{
			"JR_IN_DEVELOPMENT": "true",
		},
		Loader: map[string]api.Loader{
			".png": api.LoaderDataURL,
			".svg": api.LoaderText,
		},
		Incremental: true,
		Metafile:    true,
		Charset:     api.CharsetUTF8,
	}

	if cfg.Bool("hashEntrypointNames") {
		options.EntryNames = "[dir]/[name]-[hash]"
	}

	return options
}

// postprocess is executed after the build for example to modify the resulting files
func postprocess(r api.BuildResult, cfg *yaml.YAML) error {
	fmt.Println("Postprocessing")

	// Get the metafile data and parse it as a string representing a JSON file
	meta, err := yaml.ParseJson(r.Metafile)
	if err != nil {
		return err
	}

	// Get the outputs field, which is a map with the key as each output file name
	outputs := meta.Map("outputs")
	if err != nil {
		return err
	}

	targetFullDir := cfg.String("pagedir", defaultpagedir)

	// Get a map of the source entrypoints full path, by getting the list in the config file
	// and prepending the source directory path
	sourceDir := cfg.String("sourcedir", defaultsourcedir)
	entryPoints := cfg.ListString("entryPoints")
	entryPointsMap := map[string]bool{}
	for i := range entryPoints {
		entryPointsMap[filepath.Join(sourceDir, entryPoints[i])] = true
	}

	// Get a list of the pages of the application, to generate the routing page map
	// This is the list of file path names in the pagesdir directory, relative to sourcedir
	pageSourceFileNames := pageEntryPointsAsMap(cfg)

	// pageNamesMapping will be a mapping between the page name (the file name without the path and extension),
	// and the full file path for the corresponding target file with the JavaScript code for the page.
	// This will be used for dynamic loading of the code when routing to a given page name. The router will
	// dynamically load the JavascriptFile before giving control to the page entry point
	pageNamesMapping := map[string]string{}

	// rootEntryPointMap is a mapping between the target name of the entry point (possibly including its hash in the name),
	// and the CSS file bundle that is associated to that entry point (possibly because some CSS was imported by the entrypoint
	// or its dependencies).
	rootEntryPointMap := map[string]string{}

	// Iterate over all output files in the metadata file
	// Find the source entrypoint in the output metadata map
	for outFile, metaData := range outputs {
		outMetaEntry := yaml.New(metaData)

		// The name of the source entrypoint file
		outEntryPoint := outMetaEntry.String("entryPoint")

		// Get the base name for the outfile of the entrypoint
		outFileBaseName := filepath.Base(outFile)

		// Get the base name for the CSS bundle corresponding to the entrypoint
		cssBundleBasename := filepath.Base(outMetaEntry.String("cssBundle"))

		// If the entry point of this outfile is in the configured list of entrypoints
		if entryPointsMap[outEntryPoint] {

			// Add an entry to the root entry point map
			rootEntryPointMap[outFile] = cssBundleBasename

			fmt.Println("entryPoint:", outEntryPoint, "baseJS:", outFileBaseName, "baseCSS:", cssBundleBasename)

		}

		// If this entry corresponds to a file in the source page directory
		if pageSourceFileNames[outEntryPoint] {

			// Get the page pageName (the pageName of the file without path or extension)
			pageName := strings.TrimSuffix(filepath.Base(outEntryPoint), filepath.Ext(filepath.Base(outEntryPoint)))

			// Get the path of the file in the output, relative to the target directory for serving the file
			targetPageFilePath := filepath.Join(targetFullDir, outFileBaseName)

			// Add an entry in the page mapping
			pageNamesMapping[pageName] = targetPageFilePath
			fmt.Println("page:", pageName, "module:", targetPageFilePath)

		}
	}

	// We are going to modify the HTML file to:
	// - Load the JavaScript main entrypoints
	// - Load the associated CSS bundles (one for each entrypoint)

	pageNamesMappingJSON, _ := json.MarshalIndent(pageNamesMapping, "", "  ")

	// Read the contents of the output HTML file
	bytesOut, err := os.ReadFile("docs/index.html")
	if err != nil {
		log.Fatal(err)
	}

	for outFile, cssBundleBasename := range rootEntryPointMap {

		// Get the base name for the outfile of the entrypoint
		outFileBaseName := filepath.Base(outFile)

		// Replace the entrypoint name for JavaScript
		bytesOut = bytes.Replace(bytesOut, []byte("PUT_APP_JS_NAME_HERE"), []byte(outFileBaseName), 1)

		// Replace the entrypoint name for CSS
		bytesOut = bytes.Replace(bytesOut, []byte("PUT_APP_CSS_NAME_HERE"), []byte(cssBundleBasename), 1)

		bytesOut = bytes.Replace(bytesOut, []byte("PUT_PAGEMAP_HERE"), pageNamesMappingJSON, 1)

	}

	// Overwrite file with modified contents
	err = os.WriteFile("docs/index.html", bytesOut, 0755)
	if err != nil {
		log.Fatal(err)
	}

	return nil

}

func buildDeps(cfg *yaml.YAML) api.BuildResult {
	// processTemplates(cfg)

	preprocess(cfg)
	result := buildDependencies(cfg)

	return result

}

func performExperiments(cfg *yaml.YAML) api.BuildResult {
	return api.BuildResult{}
}

// pageEntryPointsAsMap returns a map with all source page file names (path relative to sourcedir) in the application,
// which will be entrypoints for the building process.
func pageEntryPointsAsMap(cfg *yaml.YAML) map[string]bool {

	// The directory where the pages are located
	pageDir := filepath.Join(cfg.String("sourcedir", defaultsourcedir), cfg.String("pagedir", defaultpagedir))

	// Get the files in the directory
	files, err := os.ReadDir(pageDir)
	if err != nil {
		log.Fatal(err)
	}

	// Create the list of pages with the full path (relative to the sourcedir directory)
	pageMap := map[string]bool{}
	for _, file := range files {
		pageMap[filepath.Join(pageDir, file.Name())] = true
	}

	return pageMap
}

func buildOptionsDependencies(cfg *yaml.YAML) api.BuildOptions {

	// The JavaScript entrypoints
	entryPoints := cfg.ListString("dependencies")

	options := api.BuildOptions{
		EntryPoints: entryPoints,
		Format:      api.FormatESModule,
		Outdir:      cfg.String("targetdir"),
		Write:       true,
		Bundle:      true,
		Splitting:   false,
		ChunkNames:  "chunks/[name]-[hash]",
		Loader: map[string]api.Loader{
			".png": api.LoaderDataURL,
			".svg": api.LoaderText,
		},
		Incremental: true,

		// EntryNames: "[dir]/[name]-[hash]",
		// Metafile:   true,
	}

	return options
}

func buildDependencies(cfg *yaml.YAML) api.BuildResult {
	fmt.Println("Building dependencies")

	options := buildOptionsDependencies(cfg)
	result := api.Build(options)

	printErrors(result.Errors)
	if len(result.Errors) > 0 {
		os.Exit(1)
	}

	return result
}

func printErrors(resultErrors []api.Message) {
	if len(resultErrors) > 0 {
		for _, msg := range resultErrors {
			fmt.Printf("%v\n", msg.Text)
		}
	}
}

// copyStaticAssets copies without any processing the files from the staticAssets directory
// to the target directory in the root.
// The structure of the source directory is replicated in the target.
// A file 'images/example.png' in the source staticAssets directory will be accessed as '/images/example.png'
// via the web.
func copyStaticAssets(cfg *yaml.YAML) {
	sourceDir := cfg.String("staticAssets.source", defaultstaticAssets_source)
	targetDir := cfg.String("staticAssets.target", defaultstaticAssets_target)

	// Copy the source directory to the target root
	err := copy.Copy(sourceDir, targetDir)
	if err != nil {
		panic(err)
	}

	// HTML files are a special case of static assets. The common case for a PWA is that there is just
	// one html file in the root of the project source directory.
	// In the future, the 'htmlfiles' entry may be used to pre-process the html files in special ways
	pages := cfg.ListString("htmlfiles", []any{defaulthtmlfile})

	sourceDir = cfg.String("sourcedir", defaultsourcedir)
	targetDir = cfg.String("targetdir", defaulttargetdir)

	// Copy all HTML files from source to target
	for _, page := range pages {
		sourceFile := filepath.Join(sourceDir, page)
		targetFile := filepath.Join(targetDir, page)
		fmt.Printf("Copy from %v to %v\n", sourceFile, targetFile)
		// copyFile(sourceFile, targetFile)
		copy.Copy(sourceFile, targetFile)
	}

}

func readConfiguration() *yaml.YAML {
	var cfg *yaml.YAML
	var err error

	cfg, err = yaml.ParseYamlFile("devserver.yaml")
	if err != nil {
		fmt.Printf("Config file not found\n")
		panic(err)
	}
	return cfg
}

// pageEntryPoints returns an array with all pages in the application, which will be entrypoints
// for the building process.
func pageEntryPoints(cfg *yaml.YAML) []string {

	// The directory where the pages are located
	pageDir := filepath.Join(cfg.String("sourcedir", defaultsourcedir), cfg.String("pagedir", defaultpagedir))

	// Get the files in the directory
	files, err := os.ReadDir(pageDir)
	if err != nil {
		log.Fatal(err)
	}

	// Create the list of pages with the full path
	pageList := make([]string, len(files))
	for i, file := range files {
		pageList[i] = filepath.Join(pageDir, file.Name())
	}

	return pageList
}

func printJSON(val any) {
	out, err := json.MarshalIndent(val, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
}

func processTemplates(cfg *yaml.YAML) {

	parseGlob := filepath.Join(cfg.String("templates.dir"), "*.tpl")

	t, err := template.ParseGlob(parseGlob)
	if err != nil {
		panic(err)
	}

	var out bytes.Buffer

	for _, elem := range cfg.List("templates.elems") {
		ele := yaml.New(elem)
		name := ele.String("name")
		data := ele.Map("data")
		fmt.Printf("Name: %v Data: %v\n", name, data)
		err = t.ExecuteTemplate(&out, name, data)
		if err != nil {
			panic(err)
		}
		// fmt.Println(string(out.Bytes()))
	}

}

// The Server struct handles the server state
type Server struct {
	*fiber.App
}

// DevServer is a simple development server to help develop PWAs in a
// tool-less fashion.
// It supports serving static files locally for the user interface, and
// proxying other API requests to another server.
func DevServer(cfg *yaml.YAML) {

	// Define the configuration for Fiber
	fiberCfg := fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			var e *fiber.Error
			if errors.As(err, &e) {
				code = e.Code
			}
			zlog.Err(err).Msg("Error handler")
			c.Set(fiber.HeaderContentType, fiber.MIMETextPlainCharsetUTF8)
			return c.Status(code).SendString(err.Error())
		},
	}

	// Create the fiber web server
	server := Server{
		App: fiber.New(fiberCfg),
	}

	// Middleware to recover from panics
	server.Use(recover.New(recover.Config{EnableStackTrace: true}))

	// Configure logging
	server.Use(logger.New(logger.Config{
		// TimeFormat: "02-Jan-1985",
		TimeZone: "Europe/Brussels",
	}))

	// Proxy all requests (GET, POST, PUT, etc) for the given prefix
	proxyList := cfg.List("devserver.proxy")
	for _, p := range proxyList {
		proxy := yaml.New(p)
		server.All(proxy.String("route"), proxyHandler(proxy.String("target")))
		fmt.Println("Forwarding", proxy.String("route"), "to", proxy.String("target"))
	}

	// Serve locally from disk all requests not matching the routes above
	server.Get("/*", func(c *fiber.Ctx) error {

		// Get the name of the requested file (or path)
		fileName := c.Path()

		// If the request is for the root, perform a standard build if configured
		if fileName == "/" {
			// Set the filename to index.html
			fileName = "/index.html"
			// Build if configured
			if *autobuild || cfg.Bool("devserver.autobuild", defaultdevserver_autobuild) {
				fmt.Println("<<<<<<<<<<<< Building >>>>>>>>>>>>>")
				build(cfg)
			}

		}

		// Get the full path name for the directory serving the files
		filePath := filepath.Join(cfg.String("targetdir"), fileName)

		// Read the file in memory
		buf, err := os.ReadFile(filePath)
		if err != nil {
			return err
		}

		// Disable the cache in the browser, so it is always the last version
		c.Set("Cache-Control", "no-store")

		// Set the MIME-type in the response acceording to the file extension
		c.Type(filepath.Ext(fileName))

		// Send the file to the browser
		fmt.Println("Sending:", filePath)
		return c.Send(buf)

	})

	// Listen on configured port
	log.Fatal(server.Listen(cfg.String("devserver.listenAddress", defaultdevserver_listenAddress)))
}

// proxyHandler is a general proxy forwarder with no logic to modify
// request or reply
func proxyHandler(targetHost string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		targetURL := targetHost + c.OriginalURL()
		if err := proxy.Do(c, targetURL); err != nil {
			return err
		}
		return nil
	}
}
