// Code generated by ent, DO NOT EDIT.

package user

import (
	"time"
)

const (
	// Label holds the string label denoting the user type in the database.
	Label = "user"
	// FieldID holds the string denoting the id field in the database.
	FieldID = "id"
	// FieldCreateTime holds the string denoting the create_time field in the database.
	FieldCreateTime = "create_time"
	// FieldUpdateTime holds the string denoting the update_time field in the database.
	FieldUpdateTime = "update_time"
	// FieldName holds the string denoting the name field in the database.
	FieldName = "name"
	// FieldDisplayname holds the string denoting the displayname field in the database.
	FieldDisplayname = "displayname"
	// EdgeCredentials holds the string denoting the credentials edge name in mutations.
	EdgeCredentials = "credentials"
	// Table holds the table name of the user in the database.
	Table = "users"
	// CredentialsTable is the table that holds the credentials relation/edge.
	CredentialsTable = "webauthn_credentials"
	// CredentialsInverseTable is the table name for the WebauthnCredential entity.
	// It exists in this package in order to avoid circular dependency with the "webauthncredential" package.
	CredentialsInverseTable = "webauthn_credentials"
	// CredentialsColumn is the table column denoting the credentials relation/edge.
	CredentialsColumn = "user_credentials"
)

// Columns holds all SQL columns for user fields.
var Columns = []string{
	FieldID,
	FieldCreateTime,
	FieldUpdateTime,
	FieldName,
	FieldDisplayname,
}

// ValidColumn reports if the column name is valid (part of the table columns).
func ValidColumn(column string) bool {
	for i := range Columns {
		if column == Columns[i] {
			return true
		}
	}
	return false
}

var (
	// DefaultCreateTime holds the default value on creation for the "create_time" field.
	DefaultCreateTime func() time.Time
	// DefaultUpdateTime holds the default value on creation for the "update_time" field.
	DefaultUpdateTime func() time.Time
	// UpdateDefaultUpdateTime holds the default value on update for the "update_time" field.
	UpdateDefaultUpdateTime func() time.Time
)
