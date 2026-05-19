import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type MetricColor = "indigo" | "amber" | "green";

interface MetricCardProps {
  label: string;
  value: string;
  percent: number;
  color: MetricColor;
  subtitle?: string;
  className?: string;
}

const colorMap: Record<MetricColor, { border: string; bar: string }> = {
  indigo: { border: "border-t-indigo-500", bar: "bg-indigo-500" },
  amber:  { border: "border-t-amber-500",  bar: "bg-amber-500" },
  green:  { border: "border-t-green-500",  bar: "bg-green-500" },
};

export function MetricCard({ label, value, percent, color, subtitle, className }: MetricCardProps) {
  const { border, bar } = colorMap[color];
  return (
    <Card className={cn("min-h-[132px] border-t-2 py-4", border, className)}>
      <CardContent className="flex h-full flex-col px-6 py-0">
        <p className="truncate text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        <p
          className="mt-1 min-w-0 truncate text-[clamp(1.35rem,2.2vw,1.75rem)] font-bold leading-tight"
          title={value}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 min-w-0 truncate text-xs text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        )}
        <Progress
          value={Math.min(percent, 100)}
          className="mt-auto h-1.5"
          indicatorClassName={bar}
        />
      </CardContent>
    </Card>
  );
}
