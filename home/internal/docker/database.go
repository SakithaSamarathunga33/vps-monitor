package docker

import (
	"context"
	"encoding/csv"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hhftechnology/vps-monitor/internal/models"
)

var safeDBIdentifier = regexp.MustCompile(`^[A-Za-z0-9_.$-]+$`)

func DetectDatabaseEngine(info models.ContainerInfo) (models.DatabaseEngine, bool) {
	haystack := strings.ToLower(strings.Join(append(info.Names, info.Image, info.Command), " "))
	switch {
	case strings.Contains(haystack, "postgres"):
		return models.DatabaseEnginePostgres, true
	case strings.Contains(haystack, "mariadb"), strings.Contains(haystack, "mysql"):
		return models.DatabaseEngineMySQL, true
	default:
		return "", false
	}
}

func (c *MultiHostClient) ListDatabaseInstances(ctx context.Context) ([]models.DatabaseInstance, []HostError, error) {
	containersByHost, hostErrors, err := c.ListContainersAllHosts(ctx)
	if err != nil {
		return nil, hostErrors, err
	}

	var instances []models.DatabaseInstance
	for _, containers := range containersByHost {
		for _, ctr := range containers {
			engine, ok := DetectDatabaseEngine(ctr)
			if !ok {
				continue
			}
			instances = append(instances, models.DatabaseInstance{
				ID:        ctr.ID,
				Host:      ctr.Host,
				Name:      strings.TrimPrefix(firstContainerName(ctr), "/"),
				Image:     ctr.Image,
				State:     ctr.State,
				Status:    ctr.Status,
				Engine:    engine,
				Container: ctr,
			})
		}
	}

	sort.Slice(instances, func(i, j int) bool {
		if instances[i].Host == instances[j].Host {
			return instances[i].Name < instances[j].Name
		}
		return instances[i].Host < instances[j].Host
	})

	return instances, hostErrors, nil
}

func (c *MultiHostClient) ListDatabases(ctx context.Context, host, containerID string, engine models.DatabaseEngine) ([]string, error) {
	switch engine {
	case models.DatabaseEnginePostgres:
		return c.runPostgresList(ctx, host, containerID, "", `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;`)
	case models.DatabaseEngineMySQL:
		return c.runMySQLList(ctx, host, containerID, "", `SHOW DATABASES;`)
	default:
		return nil, fmt.Errorf("unsupported database engine %q", engine)
	}
}

func (c *MultiHostClient) ListDatabaseTables(ctx context.Context, host, containerID string, engine models.DatabaseEngine, database string) ([]models.DatabaseTable, error) {
	if err := validateDBName(database); err != nil {
		return nil, err
	}

	switch engine {
	case models.DatabaseEnginePostgres:
		rows, err := c.runPostgresRows(ctx, host, containerID, database, `SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name;`)
		if err != nil {
			return nil, err
		}
		return parseTables(rows), nil
	case models.DatabaseEngineMySQL:
		rows, err := c.runMySQLRows(ctx, host, containerID, database, `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;`)
		if err != nil {
			return nil, err
		}
		return parseTables(rows), nil
	default:
		return nil, fmt.Errorf("unsupported database engine %q", engine)
	}
}

func (c *MultiHostClient) ListDatabaseColumns(ctx context.Context, host, containerID string, engine models.DatabaseEngine, database, schema, table string) ([]models.DatabaseColumn, error) {
	if err := validateDBName(database); err != nil {
		return nil, err
	}
	if err := validateDBName(table); err != nil {
		return nil, err
	}
	if schema != "" {
		if err := validateDBName(schema); err != nil {
			return nil, err
		}
	}

	switch engine {
	case models.DatabaseEnginePostgres:
		sql := fmt.Sprintf(`SELECT column_name, data_type, is_nullable, COALESCE(column_default, ''), ordinal_position FROM information_schema.columns WHERE table_schema = '%s' AND table_name = '%s' ORDER BY ordinal_position;`, sqlQuote(schemaOrDefault(schema, "public")), sqlQuote(table))
		rows, err := c.runPostgresRows(ctx, host, containerID, database, sql)
		if err != nil {
			return nil, err
		}
		return parseColumns(rows), nil
	case models.DatabaseEngineMySQL:
		sql := fmt.Sprintf(`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COALESCE(COLUMN_DEFAULT, ''), ORDINAL_POSITION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '%s' ORDER BY ORDINAL_POSITION;`, sqlQuote(table))
		rows, err := c.runMySQLRows(ctx, host, containerID, database, sql)
		if err != nil {
			return nil, err
		}
		return parseColumns(rows), nil
	default:
		return nil, fmt.Errorf("unsupported database engine %q", engine)
	}
}

func (c *MultiHostClient) PreviewDatabaseRows(ctx context.Context, host, containerID string, engine models.DatabaseEngine, database, schema, table string, limit int) (models.DatabaseRowsResponse, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	columns, err := c.ListDatabaseColumns(ctx, host, containerID, engine, database, schema, table)
	if err != nil {
		return models.DatabaseRowsResponse{}, err
	}

	columnNames := make([]string, 0, len(columns))
	for _, column := range columns {
		columnNames = append(columnNames, column.Name)
	}

	var rows [][]string
	switch engine {
	case models.DatabaseEnginePostgres:
		sql := fmt.Sprintf(`SELECT * FROM %s LIMIT %d;`, postgresTableRef(schemaOrDefault(schema, "public"), table), limit)
		rows, err = c.runPostgresRows(ctx, host, containerID, database, sql)
	case models.DatabaseEngineMySQL:
		sql := fmt.Sprintf("SELECT * FROM `%s` LIMIT %d;", strings.ReplaceAll(table, "`", "``"), limit)
		rows, err = c.runMySQLRows(ctx, host, containerID, database, sql)
	default:
		err = fmt.Errorf("unsupported database engine %q", engine)
	}
	if err != nil {
		return models.DatabaseRowsResponse{}, err
	}

	return models.DatabaseRowsResponse{
		Columns: columnNames,
		Rows:    rowsToMaps(columnNames, rows),
		Limit:   limit,
	}, nil
}

func (c *MultiHostClient) runPostgresList(ctx context.Context, host, containerID, database, sql string) ([]string, error) {
	rows, err := c.runPostgresRows(ctx, host, containerID, database, sql)
	if err != nil {
		return nil, err
	}
	return firstColumn(rows), nil
}

func (c *MultiHostClient) runPostgresRows(ctx context.Context, host, containerID, database, sql string) ([][]string, error) {
	args := "psql -X -A -t -F \"$(printf '\\t')\""
	if database != "" {
		args += " -d " + shellQuote(database)
	}
	args += " -U \"${POSTGRES_USER:-${POSTGRESQL_USER:-${SERVICE_USER_POSTGRES:-postgres}}}\" -c " + shellQuote(sql)

	output, err := c.runDBShell(ctx, host, containerID, []string{
		"PGPASSWORD=${POSTGRES_PASSWORD:-${POSTGRESQL_PASSWORD:-${SERVICE_PASSWORD_POSTGRES:-}}}",
	}, args)
	if err != nil {
		return nil, err
	}
	return parseTSV(output), nil
}

func (c *MultiHostClient) runMySQLList(ctx context.Context, host, containerID, database, sql string) ([]string, error) {
	rows, err := c.runMySQLRows(ctx, host, containerID, database, sql)
	if err != nil {
		return nil, err
	}
	values := firstColumn(rows)
	filtered := values[:0]
	for _, value := range values {
		switch value {
		case "information_schema", "performance_schema", "mysql", "sys":
		default:
			filtered = append(filtered, value)
		}
	}
	return filtered, nil
}

func (c *MultiHostClient) runMySQLRows(ctx context.Context, host, containerID, database, sql string) ([][]string, error) {
	args := "mysql --batch --raw --skip-column-names"
	if database != "" {
		args += " " + shellQuote(database)
	}
	args += " -u\"${MYSQL_USER:-${MARIADB_USER:-${SERVICE_USER_MYSQL:-${SERVICE_USER_MARIADB:-root}}}}\""
	args += " -p\"${MYSQL_PASSWORD:-${MARIADB_PASSWORD:-${MYSQL_ROOT_PASSWORD:-${MARIADB_ROOT_PASSWORD:-${SERVICE_PASSWORD_MYSQL:-${SERVICE_PASSWORD_MARIADB:-}}}}}}\""
	args += " -e " + shellQuote(sql)

	output, err := c.runDBShell(ctx, host, containerID, nil, args)
	if err != nil {
		return nil, err
	}
	return parseTSV(output), nil
}

func (c *MultiHostClient) runDBShell(ctx context.Context, host, containerID string, exports []string, command string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	var script strings.Builder
	script.WriteString("set -e\n")
	for _, exportValue := range exports {
		script.WriteString("export ")
		script.WriteString(exportValue)
		script.WriteByte('\n')
	}
	script.WriteString(command)

	return c.RunExecCommand(ctx, host, containerID, []string{"/bin/sh", "-lc", script.String()}, nil)
}

func parseTables(rows [][]string) []models.DatabaseTable {
	tables := make([]models.DatabaseTable, 0, len(rows))
	for _, row := range rows {
		if len(row) < 2 {
			continue
		}
		tableType := ""
		if len(row) > 2 {
			tableType = row[2]
		}
		tables = append(tables, models.DatabaseTable{
			Schema: row[0],
			Name:   row[1],
			Type:   tableType,
		})
	}
	return tables
}

func parseColumns(rows [][]string) []models.DatabaseColumn {
	columns := make([]models.DatabaseColumn, 0, len(rows))
	for _, row := range rows {
		if len(row) < 5 {
			continue
		}
		pos, _ := strconv.Atoi(row[4])
		columns = append(columns, models.DatabaseColumn{
			Name:       row[0],
			Type:       row[1],
			Nullable:   strings.EqualFold(row[2], "YES"),
			Default:    row[3],
			OrdinalPos: pos,
		})
	}
	return columns
}

func parseTSV(output string) [][]string {
	output = strings.TrimRight(output, "\r\n")
	if output == "" {
		return nil
	}

	reader := csv.NewReader(strings.NewReader(output))
	reader.Comma = '\t'
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	rows, err := reader.ReadAll()
	if err == nil {
		return rows
	}

	lines := strings.Split(output, "\n")
	fallback := make([][]string, 0, len(lines))
	for _, line := range lines {
		fallback = append(fallback, strings.Split(strings.TrimRight(line, "\r"), "\t"))
	}
	return fallback
}

func firstColumn(rows [][]string) []string {
	values := make([]string, 0, len(rows))
	for _, row := range rows {
		if len(row) > 0 && row[0] != "" {
			values = append(values, row[0])
		}
	}
	return values
}

func rowsToMaps(columns []string, rows [][]string) []map[string]string {
	result := make([]map[string]string, 0, len(rows))
	for _, row := range rows {
		entry := make(map[string]string, len(columns))
		for i, column := range columns {
			if i < len(row) {
				entry[column] = row[i]
			} else {
				entry[column] = ""
			}
		}
		result = append(result, entry)
	}
	return result
}

func firstContainerName(ctr models.ContainerInfo) string {
	if len(ctr.Names) > 0 {
		return ctr.Names[0]
	}
	return ctr.ID[:min(len(ctr.ID), 12)]
}

func validateDBName(value string) error {
	if value == "" || !safeDBIdentifier.MatchString(value) {
		return fmt.Errorf("invalid database identifier %q", value)
	}
	return nil
}

func schemaOrDefault(schema, fallback string) string {
	if schema == "" {
		return fallback
	}
	return schema
}

func sqlQuote(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}

func postgresTableRef(schema, table string) string {
	return `"` + strings.ReplaceAll(schema, `"`, `""`) + `"."` + strings.ReplaceAll(table, `"`, `""`) + `"`
}
