import { useMutation, useQueryClient } from "@tanstack/react-query";
import { killProcess } from "../api/kill-process";

export function useKillProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: killProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
  });
}
