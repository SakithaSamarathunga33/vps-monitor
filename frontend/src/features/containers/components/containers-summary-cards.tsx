import { MetricCard } from "@/components/metric-card";
import { Card, CardContent } from "@/components/ui/card";

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
}

interface ContainersSummaryCardsProps {
  totalContainers: number;
  totalPM2Apps?: number;
  hostInfo: HostInfo;
  systemUsage: SystemUsage;
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
}: ContainersSummaryCardsProps) {
  const memorySubtitle =
    systemUsage.memoryTotal > 0
      ? `${formatBytes(systemUsage.memoryUsed)} / ${formatBytes(systemUsage.memoryTotal)}`
      : undefined;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="min-h-[132px] border-t-2 border-t-primary py-4">
        <CardContent className="flex h-full flex-col px-6 py-0">
          <p className="truncate text-xs font-semibold uppercase text-muted-foreground">
            Host
          </p>
          <p
            className="mt-1 min-w-0 truncate text-[clamp(1.1rem,1.8vw,1.45rem)] font-bold leading-tight"
            title={hostInfo.hostname}
          >
            {hostInfo.hostname}
          </p>
          <p
            className="mt-auto min-w-0 truncate pt-2 text-xs text-muted-foreground"
            title={`${hostInfo.os} - ${hostInfo.kernel}`}
          >
            {hostInfo.os} - {hostInfo.kernel}
          </p>
        </CardContent>
      </Card>

      <Card className="min-h-[132px] border-t-2 border-t-primary py-4">
        <CardContent className="flex h-full flex-col px-6 py-0">
          <p className="truncate text-xs font-semibold uppercase text-muted-foreground">
            Apps
          </p>
          <div className="mt-1 flex min-w-0 items-baseline gap-2">
            <span className="text-[clamp(1.35rem,2.2vw,1.75rem)] font-bold leading-tight">
              {totalContainers}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              containers
            </span>
          </div>
          <p className="mt-auto min-w-0 truncate pt-2 text-xs text-muted-foreground">
            {totalPM2Apps > 0 ? `${totalPM2Apps} PM2 apps` : "Docker apps total"}
          </p>
        </CardContent>
      </Card>

      <MetricCard
        label="CPU"
        value={`${systemUsage.cpu}%`}
        percent={systemUsage.cpu}
        color="indigo"
      />

      <MetricCard
        label="Memory"
        value={`${systemUsage.memory}%`}
        percent={systemUsage.memory}
        color="amber"
        subtitle={memorySubtitle}
      />
    </section>
  );
}
