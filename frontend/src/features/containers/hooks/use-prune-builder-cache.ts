import { useMutation, useQueryClient } from "@tanstack/react-query";

import { pruneBuilderCache } from "../api/prune-builder-cache";

export function usePruneBuilderCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pruneBuilderCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-stats"] });
    },
  });
}
