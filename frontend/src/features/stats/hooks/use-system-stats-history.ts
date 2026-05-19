import { useQuery } from "@tanstack/react-query";

import { getSystemStatsHistory } from "../api/get-system-stats-history";

export function useSystemStatsHistory() {
  return useQuery({
    queryKey: ["system-stats-history"],
    queryFn: getSystemStatsHistory,
    refetchInterval: 5000,
  });
}
