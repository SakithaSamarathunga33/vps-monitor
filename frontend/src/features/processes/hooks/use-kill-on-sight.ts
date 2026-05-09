import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addKillOnSight,
  getKillOnSight,
  removeKillOnSight,
} from "../api/kill-on-sight";

export function useKillOnSight() {
  return useQuery({
    queryKey: ["kill-on-sight"],
    queryFn: getKillOnSight,
  });
}

export function useAddKillOnSight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addKillOnSight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kill-on-sight"] });
    },
  });
}

export function useRemoveKillOnSight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeKillOnSight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kill-on-sight"] });
    },
  });
}
