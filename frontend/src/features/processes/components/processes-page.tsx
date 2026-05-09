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
    "Kill-on-sight failed":
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

function ProcessTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "Docker task":
      "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    "System task":
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    "System-like task":
      "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    "User/unknown task":
      "bg-muted text-muted-foreground border-border",
  };
  const cls = colors[type] ?? "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {type}
    </span>
  );
}

const protectedServiceNames = new Set([
  "apache2",
  "caddy",
  "haproxy",
  "httpd",
  "nginx",
  "mysql",
  "mysqld",
  "postgres",
  "redis-server",
]);

function isProtectedServiceName(name: string): boolean {
  return protectedServiceNames.has(name.toLowerCase());
}

function SuspiciousRow({ proc }: { proc: ProcessInfo }) {
  const killMutation = useKillProcess();
  const parentKillMutation = useKillProcess();
  const addMutation = useAddKillOnSight();
  const removeMutation = useRemoveKillOnSight();
  const { data: kosList } = useKillOnSight();

  const protectedService = isProtectedServiceName(proc.name);
  const killOnSightName = proc.suggested_kill_on_sight_name || proc.name;
  const canUseKillOnSight = Boolean(proc.suggested_kill_on_sight_name);
  const activeKillOnSightName = kosList?.names.includes(killOnSightName)
    ? killOnSightName
    : proc.name;
  const isKillOnSight =
    kosList?.names.includes(killOnSightName) ||
    kosList?.names.includes(proc.name) ||
    false;

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

  const handleKillParent = () => {
    if (!proc.ppid) return;
    parentKillMutation.mutate(proc.ppid, {
      onSuccess: () =>
        toast.success(
          `Killed parent "${proc.parent_name || "unknown"}" (PID ${proc.ppid})`
        ),
      onError: (err) =>
        toast.error(
          `Failed to kill parent: ${err instanceof Error ? err.message : "Unknown error"}`
        ),
    });
  };

  const handleToggleKillOnSight = () => {
    if (!canUseKillOnSight) {
      toast.error(
        `"${proc.name}" is a protected service name. Inspect the source before killing it.`
      );
      return;
    }
    if (isKillOnSight) {
      removeMutation.mutate(activeKillOnSightName, {
        onSuccess: () =>
          toast.info(`Auto-kill disabled for "${activeKillOnSightName}"`),
      });
    } else {
      addMutation.mutate(killOnSightName, {
        onSuccess: () =>
          toast.warning(
            `Auto-kill enabled for "${killOnSightName}" - matching processes will be killed`
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
        {proc.kill_error && (
          <p className="mt-1 max-w-72 text-xs text-muted-foreground">
            {proc.kill_error}
          </p>
        )}
      </TableCell>
      <TableCell>
        <ProcessTypeBadge type={proc.process_type || "User/unknown task"} />
      </TableCell>
      <TableCell className="max-w-80">
        <div className="space-y-1 text-xs">
          {proc.systemd_unit && (
            <div>
              <span className="text-muted-foreground">Unit:</span>{" "}
              <span className="font-medium text-red-600 dark:text-red-400">
                {proc.systemd_unit}
              </span>
            </div>
          )}
          {proc.parent_name && (
            <div>
              <span className="text-muted-foreground">Parent:</span>{" "}
              <span className="font-medium">{proc.parent_name}</span>
              {proc.ppid ? (
                <span className="font-mono text-muted-foreground">
                  {" "}
                  ({proc.ppid})
                </span>
              ) : null}
            </div>
          )}
          {proc.exe_path && (
            <div className="break-all font-mono text-muted-foreground">
              {proc.exe_path}
            </div>
          )}
          {!proc.exe_path && proc.cmdline && (
            <div className="break-all font-mono text-muted-foreground">
              {proc.cmdline}
            </div>
          )}
          {!proc.systemd_unit &&
          !proc.parent_name &&
          !proc.exe_path &&
          !proc.cmdline ? (
            <span className="text-muted-foreground">Unknown</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch
              checked={isKillOnSight}
              onCheckedChange={handleToggleKillOnSight}
              disabled={
                !canUseKillOnSight ||
                addMutation.isPending ||
                removeMutation.isPending
              }
              aria-label={`Kill on sight: ${proc.name}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            {!canUseKillOnSight
              ? "Protected service name"
              : isKillOnSight
                ? "Disable auto-kill"
                : `Auto-kill ${killOnSightName}`}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          {proc.ppid && proc.ppid > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={parentKillMutation.isPending}
                >
                  {parentKillMutation.isPending ? "Killing..." : "Kill parent"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Kill parent "{proc.parent_name || "unknown"}"?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This sends SIGKILL to parent PID {proc.ppid}. If it is the
                    respawner, this should stop new renamed child processes from
                    appearing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleKillParent}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Kill Parent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={killMutation.isPending}
              >
                {killMutation.isPending ? "Killing..." : "Kill child"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kill "{proc.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This sends SIGKILL to PID {proc.pid}. The process will be
                    terminated immediately and cannot be recovered.
                    {protectedService
                      ? " This name is used by a common web/database service; killing it may take sites offline."
                      : ""}
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
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProcessesPage() {
  const { data, isLoading, isError } = useProcesses();

  const autoKilledRef = useRef<Set<string>>(new Set());
  const autoKillFailedRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (!data?.auto_kill_failed?.length) return;
    for (const failure of data.auto_kill_failed) {
      const key = `${failure.pid}:${failure.error}`;
      if (!autoKillFailedRef.current.has(key)) {
        toast.error(
          `Auto-kill failed for "${failure.name}" (PID ${failure.pid}): ${failure.error}`
        );
        autoKillFailedRef.current.add(key);
      }
    }
    const timer = setTimeout(() => {
      autoKillFailedRef.current.clear();
    }, 10000);
    return () => clearTimeout(timer);
  }, [data?.auto_kill_failed]);

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
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source
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
            Top 20 by CPU - updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
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
                        {proc.suspicious && (
                          <ProcessTypeBadge
                            type={proc.process_type || "User/unknown task"}
                          />
                        )}
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
