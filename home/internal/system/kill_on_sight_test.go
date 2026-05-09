package system

import (
	"os"
	"path/filepath"
	"testing"
)

func TestKillOnSightStoreAddContainsRemove(t *testing.T) {
	dir := t.TempDir()
	store, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}

	if store.Contains("xmrig") {
		t.Fatal("expected empty store to not contain xmrig")
	}

	if err := store.Add("xmrig"); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
	if !store.Contains("xmrig") {
		t.Fatal("expected store to contain xmrig after Add")
	}

	if err := store.Remove("xmrig"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
	if store.Contains("xmrig") {
		t.Fatal("expected store to not contain xmrig after Remove")
	}
}

func TestKillOnSightStorePersistsAcrossReload(t *testing.T) {
	dir := t.TempDir()

	store1, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}
	if err := store1.Add("minerd"); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	store2, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}
	if !store2.Contains("minerd") {
		t.Fatal("expected reloaded store to contain minerd")
	}
}

func TestKillOnSightStoreList(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewKillOnSightStore(dir)
	_ = store.Add("a")
	_ = store.Add("b")
	names := store.List()
	if len(names) != 2 {
		t.Fatalf("expected 2 names, got %d", len(names))
	}
}

func TestKillOnSightStoreFileIsWritten(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewKillOnSightStore(dir)
	_ = store.Add("kinsing")

	data, err := os.ReadFile(filepath.Join(dir, "kill-on-sight.json"))
	if err != nil {
		t.Fatalf("expected file to exist: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty file")
	}
}

func TestKillOnSightStoreContainsWildcardPrefixRule(t *testing.T) {
	dir := t.TempDir()
	store, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}

	if err := store.Add("byobu-screen*"); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	if !store.Contains("byobu-screenzne") {
		t.Fatal("expected wildcard rule to match randomized byobu-screen process")
	}
	if store.Contains("byobu") {
		t.Fatal("expected wildcard rule not to match shorter unrelated name")
	}
}

func TestKillOnSightStoreRejectsProtectedExactServiceName(t *testing.T) {
	dir := t.TempDir()
	store, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}

	if err := store.Add("nginx"); err == nil {
		t.Fatal("expected protected nginx name to be rejected")
	}
	if store.Contains("nginx") {
		t.Fatal("expected protected nginx name not to match kill-on-sight")
	}
}
