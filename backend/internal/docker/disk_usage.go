package docker

import (
	"context"

	"github.com/docker/docker/api/types"
)

type DiskUsageSummary struct {
	ImagesBytes     int64 `json:"imagesBytes"`
	ContainersBytes int64 `json:"containersBytes"`
	VolumesBytes    int64 `json:"volumesBytes"`
	BuildCacheBytes int64 `json:"buildCacheBytes"`
}

// GetDiskUsage returns Docker disk usage for the first available host.
func (c *MultiHostClient) GetDiskUsage(ctx context.Context) (*DiskUsageSummary, error) {
	for _, apiClient := range c.clients {
		du, err := apiClient.DiskUsage(ctx, types.DiskUsageOptions{})
		if err != nil {
			return nil, err
		}

		var imgBytes, ctrBytes, volBytes, cacheBytes int64

		for _, img := range du.Images {
			imgBytes += img.Size
		}
		for _, ctr := range du.Containers {
			ctrBytes += ctr.SizeRw + ctr.SizeRootFs
		}
		for _, vol := range du.Volumes {
			if vol.UsageData != nil {
				volBytes += vol.UsageData.Size
			}
		}
		for _, bc := range du.BuildCache {
			if !bc.Shared {
				cacheBytes += bc.Size
			}
		}

		return &DiskUsageSummary{
			ImagesBytes:     imgBytes,
			ContainersBytes: ctrBytes,
			VolumesBytes:    volBytes,
			BuildCacheBytes: cacheBytes,
		}, nil
	}
	return &DiskUsageSummary{}, nil
}
