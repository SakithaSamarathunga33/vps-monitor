package api

import (
	"context"
	"net/http"
	"time"
)

func (ar *APIRouter) PruneDockerBuilderCache(w http.ResponseWriter, r *http.Request) {
	dockerClient, releaseDocker := ar.registry.AcquireDocker()
	defer releaseDocker()
	if dockerClient == nil {
		http.Error(w, "docker client unavailable", http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	result, err := dockerClient.PruneBuilderCacheAllHosts(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, result)
}
