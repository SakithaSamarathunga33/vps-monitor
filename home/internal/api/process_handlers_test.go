package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hhftechnology/vps-monitor/internal/config"
	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/hhftechnology/vps-monitor/internal/services"
)

func TestGetProcessesHandlerReturnsOK(t *testing.T) {
	router := &APIRouter{
		registry: services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes", nil)
	rec := httptest.NewRecorder()

	router.GetProcesses(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp models.ProcessesResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Processes == nil {
		t.Fatal("expected non-nil processes slice in response")
	}

	if len(resp.Processes) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(resp.Processes))
	}
}
