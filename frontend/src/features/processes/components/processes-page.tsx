import { CpuIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useProcesses } from "../hooks/use-processes";

function cpuIndicatorColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-yellow-500";
  return "bg-green-500";
}

export function ProcessesPage() {
  const { data, isLoading, isError } = useProcesses();

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top 20 by CPU · updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}

          {isError && (
            <p className="py-4 text-center text-sm text-destructive">
              Failed to load process data
            </p>
          )}

          {data && (
            <div className="space-y-2">
              <div className="grid grid-cols-[2rem_5rem_1fr_10rem] gap-3 border-b px-1 pb-1 text-xs font-medium text-muted-foreground">
                <span>#</span>
                <span>PID</span>
                <span>Name</span>
                <span>CPU %</span>
              </div>

              {data.processes.map((proc, i) => (
                <div
                  key={proc.pid}
                  className="grid grid-cols-[2rem_5rem_1fr_10rem] items-center gap-3 px-1 text-sm"
                >
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {proc.pid}
                  </span>
                  <span className="truncate font-medium">{proc.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(proc.cpu_percent, 100)}
                      className="h-1.5 flex-1"
                      indicatorClassName={cpuIndicatorColor(proc.cpu_percent)}
                    />
                    <span className="w-12 text-right font-mono text-xs">
                      {proc.cpu_percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
