import { useQuery } from "@tanstack/react-query";

import { getProcesses } from "../api/get-processes";

export function useProcesses() {
  return useQuery({
    queryKey: ["processes"],
    queryFn: getProcesses,
    refetchInterval: 2000,
  });
}
