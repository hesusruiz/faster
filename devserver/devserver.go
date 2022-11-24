package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/hesusruiz/faster/internal/gyaml"

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
	// "github.com/spf13/viper"
)

var cfgDefaults = []byte(`
sourcedir: src
targetdir: www
cleantarget: true
htmlfiles:
  - index.html
entryPoints:
  - app.js
pagedir: /pages
staticAssets:
  source: src/public
  target: www

templates:
  dir: templates
  elems:
    - name: index
      data:
        Homepage: InitPage
        MenuItems:
          - { page: "IntroPage", text: "Home", params: "" }
          - { page: "ScanQrPage", text: "Scan QR", params: "" }
          - { page: "SelectLanguage", text: "Language", params: "" }
          - { page: "SelectCamera", text: "Camera", params: "" }

dependencies:
  - src/dep_uhtml.js
  - src/dep_easyqrcode.js
  - src/dep_zxing.js

`)

var (
	port      = flag.String("port", ":3000", "Port to listen on")
	autobuild = flag.Bool("auto", false, "Perform build on every request to the root path")
)

// main starts the build process, with the option of starting a development
// server for tool-less workflows
func main() {

	// Initialize the log and its format
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zlog.Logger = zlog.With().Caller().Logger()

	var result api.BuildResult

	// Parse the cli flags
	flag.Parse()
	argsCmd := flag.Args()

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
		performExperiments()
		os.Exit(0)
	}

	// Extract dependencies and prebuild them
	if args["deps"] {
		_, result = buildDeps()
	}

	// Perform a standard build
	if args["build"] {
		_, result = build()
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
		cfg := readConfiguration()
		DevServer(cfg)
		<-make(chan bool)
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
func DevServer(cfg *gyaml.GYAML) {

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
	app := Server{
		App: fiber.New(fiberCfg),
	}

	// Middleware to recover from panics
	app.Use(recover.New(recover.Config{EnableStackTrace: true}))

	// Configure logging
	app.Use(logger.New(logger.Config{
		// TimeFormat: "02-Jan-1985",
		TimeZone: "Europe/Brussels",
	}))

	// Proxy all requests (GET, POST, PUT, etc) for the given prefix
	proxyList := cfg.DList("devserver.proxy")
	for _, p := range proxyList {
		proxy := gyaml.New(p)
		app.All(proxy.DString("route"), proxyHandler(proxy.DString("target")))
		fmt.Println("Forwarding", proxy.DString("route"), "to", proxy.DString("target"))
	}

	// Serve locally from disk all requests not matching the routes above
	app.Get("/*", func(c *fiber.Ctx) error {

		// The requested path
		fileName := c.Path()
		fmt.Println("fileName", fileName)

		// If the request is for the root, perform a standard build if configured
		if fileName == "/" {
			fileName = "/index.html"
			fmt.Println("<<<<<<<<<<<< Building >>>>>>>>>>>>>")
			// Before serving the file, maybe perform a build to
			// update client files
			if *autobuild || cfg.DBool("devserver.autobuild") {
				build()
			}
		}

		// Get the relative path on disk of the file to serve
		filePath := filepath.Join(cfg.DString("targetdir"), fileName)

		fmt.Println("Sending:", filePath)
		return c.SendFile(filePath)

	})

	// // Setup static files
	// app.Static("/", cfg.DString("targetdir"))

	// Listen on configured port
	log.Fatal(app.Listen(cfg.DString("devserver.listenAddress"))) // go run app.go -port=:3000
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

// Clean the target directory from all build artifacts
func deleteTargetDir(cfg *gyaml.GYAML) {
	targetDir := cfg.DString("targetdir")
	if len(targetDir) > 0 {
		os.RemoveAll(targetDir)
	}
}

// Generate the build options struct for ESBUILD
func buildOptions(cfg *gyaml.GYAML) api.BuildOptions {

	// The base input directory of the project
	sourceDir := cfg.DString("sourcedir")

	// The JavaScript entrypoints
	entryPoints := cfg.DListString("entryPoints")
	for i := range entryPoints {
		entryPoints[i] = filepath.Join(sourceDir, entryPoints[i])
	}

	// The pages are also entrypoints to process, because they are lazy-loaded
	pagePoints := pageEntryPoints(cfg)

	// Consolidate in a single list
	entryPoints = append(entryPoints, pagePoints...)

	options := api.BuildOptions{
		EntryPoints: entryPoints,
		Format:      api.FormatESModule,
		Outdir:      cfg.DString("targetdir"),
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

		// EntryNames: "entry/[dir]/[name]-[hash]",
	}

	return options
}

// build performs a standard build
func build() (*gyaml.GYAML, api.BuildResult) {
	cfg := readConfiguration()
	// processTemplates(cfg)

	preprocess(cfg)
	result := buildAndBundle(cfg)
	copyStaticAssets(cfg)
	postprocess(cfg)

	return cfg, result

}

func buildDeps() (*gyaml.GYAML, api.BuildResult) {
	cfg := readConfiguration()
	// processTemplates(cfg)

	preprocess(cfg)
	result := buildDependencies(cfg)

	return cfg, result

}

func performExperiments() api.BuildResult {
	return api.BuildResult{}
}

// preprocess is executed before build, for example to clean the target directory
func preprocess(cfg *gyaml.GYAML) {
	fmt.Println("Preprocessing")
	if cfg.DBool("cleantarget") {
		deleteTargetDir(cfg)
	}
}

// postprocess is executed after the build for example to modify the resulting files
func postprocess(cfg *gyaml.GYAML) {
	fmt.Println("Postprocessing")

	// We will modify the generated app.js file to insert the pageMap
	targetDir := cfg.DString("targetdir")
	appJS := filepath.Join(targetDir, "app.js")

	//Read all the contents of the  original file
	bytesRead, err := ioutil.ReadFile(appJS)
	if err != nil {
		log.Fatal(err)
	}

	pageMap := generatePageMap(cfg)
	outJSON, _ := json.MarshalIndent(pageMap, "", "  ")
	bytesOut := bytes.Replace(bytesRead, []byte("PUT_PAGEMAP_HERE"), outJSON, 1)

	// importMap := generatePreloadImports(cfg)
	// outJSON, _ = json.MarshalIndent(importMap, "", "  ")
	// bytesOut = bytes.Replace(bytesOut, []byte("PUT_IMPORTS_HERE"), outJSON, 1)

	// Overwrite file with modified contents
	err = ioutil.WriteFile(appJS, bytesOut, 0755)
	if err != nil {
		log.Fatal(err)
	}

}

// buildAndBundle uses ESBUILD to build and bundle js/css files
func buildAndBundle(cfg *gyaml.GYAML) api.BuildResult {
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

func buildOptionsDependencies(cfg *gyaml.GYAML) api.BuildOptions {

	// The JavaScript entrypoints
	entryPoints := cfg.DListString("dependencies")

	options := api.BuildOptions{
		EntryPoints: entryPoints,
		Format:      api.FormatESModule,
		Outdir:      cfg.DString("targetdir"),
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

func buildDependencies(cfg *gyaml.GYAML) api.BuildResult {
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
func copyStaticAssets(cfg *gyaml.GYAML) {
	sourceDir := cfg.DString("staticAssets.source")
	targetDir := cfg.DString("staticAssets.target")

	// Copy the source directory to the target root
	err := copy.Copy(sourceDir, targetDir)
	if err != nil {
		panic(err)
	}

	// HTML files are a special case of static assets. The common case for a PWA is that there is just
	// one html file in the root of the project source directory.
	// In the future, the 'htmlfiles' entry may be used to pre-process the html files in special ways
	pages := cfg.DListString("htmlfiles")

	sourceDir = cfg.DString("sourcedir")
	targetDir = cfg.DString("targetdir")

	for _, page := range pages {
		sourceFile := filepath.Join(sourceDir, page)
		targetFile := filepath.Join(targetDir, page)
		fmt.Printf("Copy from %v to %v\n", sourceFile, targetFile)
		// copyFile(sourceFile, targetFile)
		copy.Copy(sourceFile, targetFile)
	}

}

func copyFile(origin string, destination string) {

	fmt.Printf("Copying %v to %v\n", origin, destination)
	//Read all the contents of the  original file
	bytesRead, err := ioutil.ReadFile(origin)
	if err != nil {
		log.Fatal(err)
	}

	//Copy all the contents to the desitination file
	err = ioutil.WriteFile(destination, bytesRead, 0755)
	if err != nil {
		log.Fatal(err)
	}
}

func readConfiguration() *gyaml.GYAML {
	var cfg *gyaml.GYAML
	var err error

	cfg, err = gyaml.ParseYamlFile("configs/devserver.yaml")
	if err != nil {
		fmt.Printf("Config file not found, using defaults\n")
		panic(err)
		// fmt.Println(string(cfgDefaults))
		// cfg, err = gyaml.ParseYamlBytes(cfgDefaults)
	}
	return cfg
}

// func printDir() {
// 	files, err := os.ReadDir("src/pages")
// 	if err != nil {
// 		log.Fatal(err)
// 	}

// 	for _, file := range files {
// 		fmt.Println(file.Name())
// 	}
// }

func pageEntryPoints(cfg *gyaml.GYAML) []string {

	// The directory where the pages are located
	pageDir := filepath.Join(cfg.DString("sourcedir"), cfg.DString("pagedir"))

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

func generatePreloadImports(cfg *gyaml.GYAML) []string {

	// The directory where the pages are located
	targetPageDir := filepath.Join(cfg.DString("targetdir"), cfg.DString("pagedir"))

	files, err := os.ReadDir(targetPageDir)
	if err != nil {
		log.Fatal(err)
	}

	targetFullDir := cfg.DString("pagedir")

	pageMap := make([]string, len(files))
	for i, file := range files {
		fullFilePath := filepath.Join(targetFullDir, file.Name())
		fullFilePath = filepath.Clean(fullFilePath)
		value := fmt.Sprintf("import('%v')", fullFilePath)
		pageMap[i] = value
	}

	return pageMap
}

func generatePageMap(cfg *gyaml.GYAML) map[string]string {

	// The directory where the pages are located
	targetPageDir := filepath.Join(cfg.DString("targetdir"), cfg.DString("pagedir"))

	files, err := os.ReadDir(targetPageDir)
	if err != nil {
		log.Fatal(err)
	}

	targetFullDir := cfg.DString("pagedir")

	pageMap := make(map[string]string, len(files))
	for _, file := range files {
		name := strings.TrimSuffix(filepath.Base(file.Name()), filepath.Ext(filepath.Base(file.Name())))
		value := filepath.Join(targetFullDir, file.Name())
		value = filepath.Clean(value)
		pageMap[name] = value
	}

	return pageMap
}

func printJSON(val any) {
	out, err := json.MarshalIndent(val, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
}

func processTemplates(cfg *gyaml.GYAML) {

	parseGlob := filepath.Join(cfg.DString("templates.dir"), "*.tpl")

	t, err := template.ParseGlob(parseGlob)
	if err != nil {
		panic(err)
	}

	var out bytes.Buffer

	for _, elem := range cfg.DList("templates.elems") {
		ele := gyaml.New(elem)
		name := ele.DString("name")
		data := ele.DMap("data")
		fmt.Printf("Name: %v Data: %v\n", name, data)
		err = t.ExecuteTemplate(&out, name, data)
		if err != nil {
			panic(err)
		}
		// fmt.Println(string(out.Bytes()))
	}

}
