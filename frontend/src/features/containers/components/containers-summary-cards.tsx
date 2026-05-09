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
}

interface ContainersSummaryCardsProps {
  totalContainers: number;
  totalPM2Apps?: number;
  hostInfo: HostInfo;
  systemUsage: SystemUsage;
}

export function ContainersSummaryCards({
  totalContainers,
  totalPM2Apps = 0,
  hostInfo,
  systemUsage,
}: ContainersSummaryCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-t-2 border-t-primary py-4">
        <CardContent className="px-6 py-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Host
          </p>
          <p className="mt-1 text-2xl font-bold truncate" title={hostInfo.hostname}>
            {hostInfo.hostname}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {hostInfo.os} · {hostInfo.kernel}
          </p>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-primary py-4">
        <CardContent className="px-6 py-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Apps
          </p>
          <p className="mt-1 text-2xl font-bold">{totalContainers}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalPM2Apps > 0 ? `${totalPM2Apps} PM2` : "total"}
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
      />
    </section>
  );
}
