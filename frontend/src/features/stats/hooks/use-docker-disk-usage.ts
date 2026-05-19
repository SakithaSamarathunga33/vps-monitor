import { useQuery } from "@tanstack/react-query";

import { getDockerDiskUsage } from "../api/get-docker-disk-usage";

export function useDockerDiskUsage() {
  return useQuery({
    queryKey: ["docker-disk-usage"],
    queryFn: getDockerDiskUsage,
    refetchInterval: 30000,
  });
}
