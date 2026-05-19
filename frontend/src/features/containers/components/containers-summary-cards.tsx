import { CpuIcon, Globe2Icon, HardDriveIcon, MemoryStickIcon, ServerIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface HostInfo {
  hostname: string;
  os: string;
  kernel: string;
}

interface SystemUsage {
  cpu: number;
  memory: number;
  disk: number;
  memoryUsed: number;
  memoryTotal: number;
  cpuLogical: number;
  load?: {
    load1: number;
    load5: number;
    load15: number;
  };
  network?: {
    rxBytes: number;
    txBytes: number;
  };
}

interface ContainersSummaryCardsProps {
  totalContainers: number;
  totalPM2Apps?: number;
  hostInfo: HostInfo;
  systemUsage: SystemUsage;
  runningCount: number;
  stoppedCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${Math.round(mb)} MB`;
}

export function ContainersSummaryCards({
  totalContainers,
  totalPM2Apps = 0,
  hostInfo,
  systemUsage,
  runningCount,
  stoppedCount,
}: ContainersSummaryCardsProps) {
  const memorySubtitle =
    systemUsage.memoryTotal > 0
      ? `${formatBytes(systemUsage.memoryUsed)} / ${formatBytes(systemUsage.memoryTotal)}`
      : undefined;

  return (
    <section className="helm-metrics-grid">
      <Card className="helm-metric-card">
        <CardContent>
          <p className="helm-metric-label">
            <Globe2Icon className="size-3.5" />
            Host
          </p>
          <p className="helm-metric-value is-host" title={hostInfo.hostname}>
            {hostInfo.hostname}
          </p>
          <div className="helm-chip-row">
            <span>{hostInfo.os}</span>
            <span>kernel {hostInfo.kernel}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="helm-metric-card">
        <CardContent>
          <p className="helm-metric-label">
            <ServerIcon className="size-3.5" />
            Apps
          </p>
          <div className="helm-metric-value">
            <span>
              {totalContainers}
            </span>
            <span className="helm-metric-unit">
              containers
            </span>
          </div>
          <div className="helm-chip-row">
            <span className="is-success">{runningCount} running</span>
            <span>{stoppedCount} stopped</span>
            {totalPM2Apps > 0 ? <span>{totalPM2Apps} PM2</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="helm-metric-card">
        <CardContent>
          <p className="helm-metric-label">
            <CpuIcon className="size-3.5" />
            CPU
          </p>
          <div className="helm-metric-value">
            <span>{systemUsage.cpu}</span>
            <span className="helm-metric-unit">%</span>
          </div>
          <p className="helm-metric-subtitle">
            {systemUsage.cpuLogical || 0} cores · avg {Math.round(systemUsage.cpu)}%
          </p>
          <Progress value={systemUsage.cpu} className="helm-mini-progress" />
        </CardContent>
      </Card>

      <Card className="helm-metric-card">
        <CardContent>
          <p className="helm-metric-label">
            <MemoryStickIcon className="size-3.5" />
            Memory
          </p>
          <div className="helm-metric-value">
            <span>{systemUsage.memory}</span>
            <span className="helm-metric-unit">%</span>
          </div>
          <p className="helm-metric-subtitle">{memorySubtitle}</p>
          <Progress value={systemUsage.memory} className="helm-mini-progress is-amber" />
        </CardContent>
      </Card>

      <Card className="helm-wide-card md:col-span-2">
        <CardContent>
          <p className="helm-metric-label">
            <HardDriveIcon className="size-3.5" />
            Network · Load
          </p>
          <div className="helm-system-strip">
            <div>
              <span className="helm-strip-value">
                ↓ {formatBytes(systemUsage.network?.rxBytes ?? 0)}
              </span>
              <span>received</span>
            </div>
            <div>
              <span className="helm-strip-value">
                ↑ {formatBytes(systemUsage.network?.txBytes ?? 0)}
              </span>
              <span>sent</span>
            </div>
            <div>
              <span className="helm-strip-value">
                {(systemUsage.load?.load1 ?? 0).toFixed(2)}{" "}
                <span>{(systemUsage.load?.load5 ?? 0).toFixed(2)}</span>{" "}
                <span>{(systemUsage.load?.load15 ?? 0).toFixed(2)}</span>
              </span>
              <span>1m 5m 15m load</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
