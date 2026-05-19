package api

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hhftechnology/vps-monitor/internal/models"
)

func (ar *APIRouter) GetDatabaseInstances(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	instances, hostErrors, err := dockerClient.ListDatabaseInstances(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	hostErrorMessages := make([]map[string]string, 0, len(hostErrors))
	for _, he := range hostErrors {
		hostErrorMessages = append(hostErrorMessages, map[string]string{
			"host":    he.HostName,
			"message": he.Err.Error(),
		})
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{
		"instances":  instances,
		"hostErrors": hostErrorMessages,
	})
}

func (ar *APIRouter) GetDatabaseNames(w http.ResponseWriter, r *http.Request) {
	host, containerID, engine, ok := parseDatabaseTarget(w, r)
	if !ok {
		return
	}

	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	databases, err := dockerClient.ListDatabases(r.Context(), host, containerID, engine)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{
		"databases": databases,
	})
}

func (ar *APIRouter) GetDatabaseTables(w http.ResponseWriter, r *http.Request) {
	host, containerID, engine, ok := parseDatabaseTarget(w, r)
	if !ok {
		return
	}

	database := r.URL.Query().Get("database")
	if database == "" {
		http.Error(w, "database parameter is required", http.StatusBadRequest)
		return
	}

	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	tables, err := dockerClient.ListDatabaseTables(r.Context(), host, containerID, engine, database)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{
		"tables": tables,
	})
}

func (ar *APIRouter) GetDatabaseColumns(w http.ResponseWriter, r *http.Request) {
	host, containerID, engine, ok := parseDatabaseTarget(w, r)
	if !ok {
		return
	}

	database := r.URL.Query().Get("database")
	table := r.URL.Query().Get("table")
	schema := r.URL.Query().Get("schema")
	if database == "" || table == "" {
		http.Error(w, "database and table parameters are required", http.StatusBadRequest)
		return
	}

	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	columns, err := dockerClient.ListDatabaseColumns(r.Context(), host, containerID, engine, database, schema, table)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{
		"columns": columns,
	})
}

func (ar *APIRouter) GetDatabaseRows(w http.ResponseWriter, r *http.Request) {
	host, containerID, engine, ok := parseDatabaseTarget(w, r)
	if !ok {
		return
	}

	database := r.URL.Query().Get("database")
	table := r.URL.Query().Get("table")
	schema := r.URL.Query().Get("schema")
	if database == "" || table == "" {
		http.Error(w, "database and table parameters are required", http.StatusBadRequest)
		return
	}

	limit := 100
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil {
			limit = parsed
		}
	}

	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	rows, err := dockerClient.PreviewDatabaseRows(r.Context(), host, containerID, engine, database, schema, table, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, rows)
}

func parseDatabaseTarget(w http.ResponseWriter, r *http.Request) (string, string, models.DatabaseEngine, bool) {
	host := r.URL.Query().Get("host")
	containerID := chi.URLParam(r, "id")
	engine := models.DatabaseEngine(r.URL.Query().Get("engine"))

	if host == "" {
		http.Error(w, "host parameter is required", http.StatusBadRequest)
		return "", "", "", false
	}
	if containerID == "" {
		http.Error(w, "container id is required", http.StatusBadRequest)
		return "", "", "", false
	}
	switch engine {
	case models.DatabaseEnginePostgres, models.DatabaseEngineMySQL:
	default:
		http.Error(w, "supported engine parameter is required", http.StatusBadRequest)
		return "", "", "", false
	}

	return host, containerID, engine, true
}
