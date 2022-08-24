package operations

import (
	"context"

	"github.com/hesusruiz/faster/ent"

	zlog "github.com/rs/zerolog/log"
)

type Manager struct {
	db *ent.Client
}

func NewManager(name string, dsn string) *Manager {

	// Connect to the database engine
	client, err := ent.Open(name, dsn)
	if err != nil {
		zlog.Panic().Msgf("failed opening connection to sqlite: %v", err)
	}

	// Run the auto migration tool.
	if err := client.Schema.Create(context.Background()); err != nil {
		zlog.Panic().Msgf("failed creating schema resources: %v", err)
	}

	manager := &Manager{
		db: client,
	}
	return manager

}

func (m *Manager) User() *User {
	return &User{db: m.db}
}
