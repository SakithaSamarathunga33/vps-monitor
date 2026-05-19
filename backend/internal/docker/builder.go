package docker

import (
	"context"
	"sync"

	"github.com/docker/docker/api/types/build"
)

type BuilderPruneHostResult struct {
	Host           string   `json:"host"`
	CachesDeleted  []string `json:"caches_deleted"`
	SpaceReclaimed uint64   `json:"space_reclaimed"`
	Error          string   `json:"error,omitempty"`
}

type BuilderPruneResult struct {
	Results        []BuilderPruneHostResult `json:"results"`
	SpaceReclaimed uint64                   `json:"space_reclaimed"`
}

func (c *MultiHostClient) PruneBuilderCacheAllHosts(ctx context.Context) (*BuilderPruneResult, error) {
	numHosts := len(c.clients)
	if numHosts == 0 {
		return &BuilderPruneResult{Results: []BuilderPruneHostResult{}}, nil
	}

	resultCh := make(chan BuilderPruneHostResult, numHosts)
	var wg sync.WaitGroup

	for hostName, apiClient := range c.clients {
		wg.Add(1)
		go func(name string) {
			defer wg.Done()
			report, err := apiClient.BuildCachePrune(ctx, build.CachePruneOptions{})
			if err != nil {
				resultCh <- BuilderPruneHostResult{Host: name, Error: err.Error()}
				return
			}

			resultCh <- BuilderPruneHostResult{
				Host:           name,
				CachesDeleted:  report.CachesDeleted,
				SpaceReclaimed: report.SpaceReclaimed,
			}
		}(hostName)
	}

	go func() {
		wg.Wait()
		close(resultCh)
	}()

	result := &BuilderPruneResult{
		Results: make([]BuilderPruneHostResult, 0, numHosts),
	}
	for hostResult := range resultCh {
		result.Results = append(result.Results, hostResult)
		result.SpaceReclaimed += hostResult.SpaceReclaimed
	}

	return result, nil
}
