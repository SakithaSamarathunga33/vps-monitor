import { useEffect, useRef } from "react";
import { CpuIcon, ShieldAlertIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ProcessInfo } from "../api/get-processes";
import {
  useAddKillOnSight,
  useKillOnSight,
  useRemoveKillOnSight,
} from "../hooks/use-kill-on-sight";
import { useKillProcess } from "../hooks/use-kill-process";
import { useProcesses } from "../hooks/use-processes";

function metricColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-amber-500";
  return "bg-green-500";
}

function ReasonBadge({ reason }: { reason: string }) {
  const colors: Record<string, string> = {
    "High CPU":
      "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    "Known malware name":
      "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    "Temp dir execution":
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    "Invalid process name":
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    "System process impersonation":
      "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  };
  const cls =
    colors[reason] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {reason}
    </span>
  );
}

function SuspiciousRow({ proc }: { proc: ProcessInfo }) {
  const killMutation = useKillProcess();
  const addMutation = useAddKillOnSight();
  const removeMutation = useRemoveKillOnSight();
  const { data: kosList } = useKillOnSight();

  const isKillOnSight = kosList?.names.includes(proc.name) ?? false;

  const handleKill = () => {
    killMutation.mutate(proc.pid, {
      onSuccess: () =>
        toast.success(`Killed process "${proc.name}" (PID ${proc.pid})`),
      onError: (err) =>
        toast.error(
          `Failed to kill: ${err instanceof Error ? err.message : "Unknown error"}`
        ),
    });
  };

  const handleToggleKillOnSight = () => {
    if (isKillOnSight) {
      removeMutation.mutate(proc.name, {
        onSuccess: () => toast.info(`Auto-kill disabled for "${proc.name}"`),
      });
    } else {
      addMutation.mutate(proc.name, {
        onSuccess: () =>
          toast.warning(
            `Auto-kill enabled for "${proc.name}" — will be killed on next detection`
          ),
      });
    }
  };

  return (
    <TableRow className="border-l-2 border-l-red-500">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-3.5 shrink-0 text-red-500" />
          {proc.name || (
            <span className="italic text-muted-foreground">(no name)</span>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {proc.pid}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress
            value={Math.min(proc.cpu_percent, 100)}
            className="h-1.5 w-16"
            indicatorClassName={metricColor(proc.cpu_percent)}
          />
          <span className="w-10 font-mono text-xs">
            {proc.cpu_percent.toFixed(1)}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <ReasonBadge reason={proc.suspicious_reason ?? "Unknown"} />
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch
              checked={isKillOnSight}
              onCheckedChange={handleToggleKillOnSight}
              disabled={addMutation.isPending || removeMutation.isPending}
              aria-label={`Kill on sight: ${proc.name}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            {isKillOnSight ? "Disable auto-kill" : "Auto-kill on next detection"}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={killMutation.isPending}
            >
              {killMutation.isPending ? "Killing…" : "Kill"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kill "{proc.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This sends SIGKILL to PID {proc.pid}. The process will be
                terminated immediately and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleKill}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Kill Process
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function ProcessesPage() {
  const { data, isLoading, isError } = useProcesses();

  const autoKilledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.auto_killed?.length) return;
    for (const name of data.auto_killed) {
      if (!autoKilledRef.current.has(name)) {
        toast.warning(`Auto-killed: "${name}"`);
        autoKilledRef.current.add(name);
      }
    }
    const timer = setTimeout(() => {
      autoKilledRef.current.clear();
    }, 10000);
    return () => clearTimeout(timer);
  }, [data?.auto_killed]);

  const suspiciousProcesses = data?.processes.filter((p) => p.suspicious) ?? [];
  const allProcesses = data?.processes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CpuIcon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Top Processes</h1>
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
      </div>

      {/* Suspicious Processes Section */}
      <Card className="border-red-500/40 bg-red-500/5 dark:bg-red-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="size-5 text-red-500" />
            <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">
              Suspicious Processes
            </CardTitle>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {suspiciousProcesses.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {suspiciousProcesses.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No suspicious processes detected.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    PID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CPU %
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kill on Sight
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousProcesses.map((proc) => (
                  <SuspiciousRow key={proc.pid} proc={proc} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top 20 Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 20 by CPU · updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load process data
            </p>
          )}
          {data && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    #
                  </TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    PID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CPU %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProcesses.map((proc, i) => (
                  <TableRow key={proc.pid}>
                    <TableCell className="text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {proc.pid}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {proc.suspicious && (
                          <ShieldAlertIcon className="size-3.5 shrink-0 text-red-500" />
                        )}
                        {proc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(proc.cpu_percent, 100)}
                          className="h-1.5 w-24"
                          indicatorClassName={metricColor(proc.cpu_percent)}
                        />
                        <span className="w-12 font-mono text-xs">
                          {proc.cpu_percent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
