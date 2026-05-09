package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/hhftechnology/vps-monitor/internal/system"
	"github.com/shirou/gopsutil/v4/process"
)

// KillProcess handles POST /api/v1/system/processes/{pid}/kill
func (ar *APIRouter) KillProcess(w http.ResponseWriter, r *http.Request) {
	pidStr := chi.URLParam(r, "pid")
	pid64, err := strconv.ParseInt(pidStr, 10, 32)
	if err != nil {
		http.Error(w, "invalid pid", http.StatusBadRequest)
		return
	}
	pid := int32(pid64)

	ctx := r.Context()
	p, err := process.NewProcessWithContext(ctx, pid)
	if err != nil {
		http.Error(w, "process not found", http.StatusNotFound)
		return
	}

	if err := p.KillWithContext(ctx); err != nil {
		http.Error(w, killProcessErrorMessage(err), killProcessStatus(err))
		return
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{"killed": true, "pid": pid})
}

func killProcessStatus(err error) int {
	if system.IsKillPermissionError(err) {
		return http.StatusForbidden
	}
	return http.StatusInternalServerError
}

func killProcessErrorMessage(err error) string {
	return system.KillErrorMessage(err)
}

// GetKillOnSight handles GET /api/v1/system/processes/kill-on-sight
func (ar *APIRouter) GetKillOnSight(w http.ResponseWriter, r *http.Request) {
	if ar.killOnSight == nil {
		WriteJsonResponse(w, http.StatusOK, map[string]any{"names": []string{}})
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"names": ar.killOnSight.List()})
}

// AddKillOnSight handles POST /api/v1/system/processes/kill-on-sight
func (ar *APIRouter) AddKillOnSight(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}
	if ar.killOnSight == nil {
		http.Error(w, "kill-on-sight store unavailable", http.StatusServiceUnavailable)
		return
	}
	if err := ar.killOnSight.Add(body.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"added": body.Name})
}

// RemoveKillOnSight handles DELETE /api/v1/system/processes/kill-on-sight/{name}
func (ar *APIRouter) RemoveKillOnSight(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if ar.killOnSight == nil {
		http.Error(w, "kill-on-sight store unavailable", http.StatusServiceUnavailable)
		return
	}
	if err := ar.killOnSight.Remove(name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"removed": name})
}
