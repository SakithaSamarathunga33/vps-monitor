package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hhftechnology/vps-monitor/internal/config"
	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/hhftechnology/vps-monitor/internal/services"
	"github.com/hhftechnology/vps-monitor/internal/system"
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

func TestGetKillOnSightReturnsEmptyWhenNilStore(t *testing.T) {
	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes/kill-on-sight", nil)
	rec := httptest.NewRecorder()

	router.GetKillOnSight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAddKillOnSightReturnsBadRequestOnEmptyName(t *testing.T) {
	dir := t.TempDir()
	store, _ := system.NewKillOnSightStore(dir)

	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: store,
	}

	body := bytes.NewBufferString(`{"name":""}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/system/processes/kill-on-sight", body)
	rec := httptest.NewRecorder()

	router.AddKillOnSight(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty name, got %d", rec.Code)
	}
}

func TestAddAndGetKillOnSight(t *testing.T) {
	dir := t.TempDir()
	store, _ := system.NewKillOnSightStore(dir)

	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: store,
	}

	body := bytes.NewBufferString(`{"name":"xmrig"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/system/processes/kill-on-sight", body)
	rec := httptest.NewRecorder()
	router.AddKillOnSight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes/kill-on-sight", nil)
	rec2 := httptest.NewRecorder()
	router.GetKillOnSight(rec2, req2)

	var result struct {
		Names []string `json:"names"`
	}
	if err := json.NewDecoder(rec2.Body).Decode(&result); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if len(result.Names) != 1 || result.Names[0] != "xmrig" {
		t.Fatalf("expected [xmrig], got %v", result.Names)
	}
}
