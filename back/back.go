package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/hesusruiz/faster/back/handlers"
	"github.com/hesusruiz/faster/back/operations"

	"flag"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

var (
	port = flag.String("port", ":8000", "Port to listen on")
	prod = flag.Bool("prod", false, "Enable prefork in Production")
)

type Server struct {
	*fiber.App
	WebAuthn   *handlers.WebAuthnHandler
	Operations *operations.Manager
}

func main() {

	// Initialize the log and its format
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zlog.Logger = zlog.With().Caller().Logger()

	// Parse command-line flags
	flag.Parse()

	// Read configuration file
	cfg := readConfig()

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

	// Backend Operations
	app.Operations = operations.NewManager(cfg.GetString("store.driverName"), cfg.GetString("store.dataSourceName"))

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
	waConfig := cfg.Sub("webauthn")
	app.WebAuthn = handlers.NewWebAuthnHandler(app.App, app.Operations, waConfig)

	// Create an /api endpoint
	v1 := app.Group("/api")

	// Bind handlers
	v1.Get("/credentials", app.WebAuthn.ListCredentials)

	// Setup static files
	app.Static("/", cfg.GetString("server.staticDir"))

	// Listen on port 3000
	log.Fatal(app.Listen(*port)) // go run app.go -port=:3000
}

func readConfig() *viper.Viper {
	// The name of the config file
	var configFileName = "server.yaml"

	// Prepare to read the configuration file
	// We accept config files in the current directory or in HOME/.config/issuer
	cfg := viper.New()
	cfg.SetConfigName(configFileName)
	cfg.SetConfigType("yaml")
	cfg.AddConfigPath(".")
	cfg.AddConfigPath("./configs")
	cfg.AddConfigPath("$HOME/.config/webauthn")

	// Set some defaults
	cfg.SetDefault("server.staticDir", "www/public")
	cfg.SetDefault("server.listenAddress", ":3000")
	cfg.SetDefault("server.templateDir", "templates")

	// Read the configuration values
	err := cfg.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if desired
			zlog.Warn().Str("config", configFileName).Msg("Config file not found")
		} else {
			panic(fmt.Errorf("Fatal error config file: %w \n", err))
		}
	}

	return cfg
}
