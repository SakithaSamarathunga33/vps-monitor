package models

type DatabaseEngine string

const (
	DatabaseEnginePostgres DatabaseEngine = "postgres"
	DatabaseEngineMySQL    DatabaseEngine = "mysql"
)

type DatabaseInstance struct {
	ID        string         `json:"id"`
	Host      string         `json:"host"`
	Name      string         `json:"name"`
	Image     string         `json:"image"`
	State     string         `json:"state"`
	Status    string         `json:"status"`
	Engine    DatabaseEngine `json:"engine"`
	Container ContainerInfo  `json:"container"`
}

type DatabaseTable struct {
	Schema string `json:"schema,omitempty"`
	Name   string `json:"name"`
	Type   string `json:"type,omitempty"`
}

type DatabaseColumn struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Nullable   bool   `json:"nullable"`
	Default    string `json:"default,omitempty"`
	OrdinalPos int    `json:"ordinalPosition"`
}

type DatabaseRowsResponse struct {
	Columns []string            `json:"columns"`
	Rows    []map[string]string `json:"rows"`
	Limit   int                 `json:"limit"`
}
