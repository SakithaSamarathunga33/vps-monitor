import { HardDriveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

import { usePruneBuilderCache } from "../hooks/use-prune-builder-cache";

interface DiskSpaceMonitorProps {
  usedBytes: number;
  totalBytes: number;
  percent: number;
  isReadOnly: boolean;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function diskColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-green-500";
}

export function DiskSpaceMonitor({
  usedBytes,
  totalBytes,
  percent,
  isReadOnly,
}: DiskSpaceMonitorProps) {
  const pruneMutation = usePruneBuilderCache();
  const freeBytes = Math.max(totalBytes - usedBytes, 0);

  const handlePrune = () => {
    pruneMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          `Docker builder cache cleared. Reclaimed ${formatBytes(result.space_reclaimed)}.`
        );
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to clear Docker builder cache."
        );
      },
    });
  };

  return (
    <Card className="helm-disk-card">
      <CardHeader className="pb-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <HardDriveIcon className="size-5 text-primary" />
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Disk Space
            </CardTitle>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReadOnly || pruneMutation.isPending}
                className="w-full gap-2 md:w-auto"
              >
                {pruneMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
                Clear Build Cache
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Docker builder cache?</AlertDialogTitle>
                <AlertDialogDescription>
                  This runs the equivalent of docker builder prune and removes
                  unused build cache from every configured Docker host.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pruneMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handlePrune}
                  disabled={pruneMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear Cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-2xl font-bold">{Math.round(percent)}%</p>
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {formatBytes(usedBytes)} used of {formatBytes(totalBytes)}
            </p>
          </div>
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {formatBytes(freeBytes)} free
          </p>
        </div>
        <Progress
          value={Math.min(percent, 100)}
          className="h-2"
          indicatorClassName={diskColor(percent)}
        />
      </CardContent>
    </Card>
  );
}
