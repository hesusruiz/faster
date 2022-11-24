package main

import (
	"bytes"
	"errors"
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/hesusruiz/faster/back/handlers"
	"github.com/hesusruiz/faster/back/operations"
	"github.com/hesusruiz/faster/internal/gyaml"

	"flag"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
)

var (
	port = flag.String("port", ":8000", "Port to listen on")
	prod = flag.Bool("prod", false, "Enable prefork in Production")
)

type Server struct {
	*fiber.App
	WebAuthn   *handlers.WebAuthnHandler
	Operations *operations.Manager
	t          *template.Template
}

func main() {

	// Initialize the log and its format
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zlog.Logger = zlog.With().Caller().Logger()

	// Parse command-line flags
	flag.Parse()

	// Read configuration file
	// cfg := readConfig()
	cfg := readConfiguration()

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
		Prefork: *prod, // go run app.go -prod
	}

	app := Server{
		App: fiber.New(fiberCfg),
	}

	// Initialise the template system
	templateDir := cfg.DString("server.templateDir")
	app.t = template.Must(template.ParseGlob(filepath.Join(templateDir, "layouts/*")))
	app.t = template.Must(app.t.ParseGlob(filepath.Join(templateDir, "partials/*")))
	app.t = template.Must(app.t.ParseGlob(filepath.Join(templateDir, "pages/*")))

	// Backend Operations
	app.Operations = operations.NewManager(cfg.DString("store.driverName"), cfg.DString("store.dataSourceName"))

	// Middleware
	app.Use(recover.New(recover.Config{EnableStackTrace: true}))

	app.Use(logger.New(logger.Config{
		// TimeFormat: "02-Jan-1985",
		TimeZone: "Europe/Brussels",
	}))

	// // Create a /api/v1 endpoint
	// v1 := app.Group("/api/v1")

	// // Bind handlers
	// v1.Get("/users", handlers.UserList)
	// v1.Post("/users", handlers.UserCreate)

	// WebAuthn
	app.WebAuthn = handlers.NewWebAuthnHandler(app.App, app.Operations, cfg)

	// Create an /api endpoint
	v1 := app.Group("/admin")

	// Bind handlers
	v1.Get("/start", app.HandleAdmin)

	// Setup static files
	app.Static("/", cfg.DString("server.staticDir"))

	// Listen on port 3000
	log.Fatal(app.Listen(cfg.DString("server.listenAddress"))) // go run app.go -port=:3000
}

func (s *Server) HandleAdmin(c *fiber.Ctx) error {

	var out bytes.Buffer
	err := s.t.Execute(&out, "")
	if err != nil {
		return err
	}
	return c.SendString(out.String())
}

func readConfiguration() *gyaml.GYAML {
	var cfg *gyaml.GYAML
	var err error

	cfg, err = gyaml.ParseYamlFile("configs/server.yaml")
	if err != nil {
		fmt.Printf("Config file not found, using defaults\n")
		panic(err)
		// fmt.Println(string(cfgDefaults))
		// cfg, err = gyaml.ParseYamlBytes(cfgDefaults)
	}
	return cfg
}
