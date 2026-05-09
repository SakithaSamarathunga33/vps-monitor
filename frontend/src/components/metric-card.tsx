import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type MetricColor = "indigo" | "amber" | "green";

interface MetricCardProps {
  label: string;
  value: string;
  percent: number;
  color: MetricColor;
  className?: string;
}

const colorMap: Record<MetricColor, { border: string; bar: string }> = {
  indigo: { border: "border-t-indigo-500", bar: "bg-indigo-500" },
  amber:  { border: "border-t-amber-500",  bar: "bg-amber-500" },
  green:  { border: "border-t-green-500",  bar: "bg-green-500" },
};

export function MetricCard({ label, value, percent, color, className }: MetricCardProps) {
  const { border, bar } = colorMap[color];
  return (
    <Card className={cn("border-t-2 py-4", border, className)}>
      <CardContent className="px-6 py-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <Progress
          value={Math.min(percent, 100)}
          className="mt-2 h-1.5"
          indicatorClassName={bar}
        />
      </CardContent>
    </Card>
  );
}
