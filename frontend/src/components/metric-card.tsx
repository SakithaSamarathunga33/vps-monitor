import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type MetricColor = "indigo" | "amber" | "green" | "cyan";
export type DeltaTone = "up" | "down" | "flat";

interface MetricCardProps {
	label: string;
	value: string;
	percent: number;
	color: MetricColor;
	subtitle?: string;
	className?: string;
	sparkData?: number[];
	delta?: string;
	deltaTone?: DeltaTone;
}

const colorMap: Record<
	MetricColor,
	{ border: string; bar: string; spark: string }
> = {
	indigo: {
		border: "border-t-indigo-500",
		bar: "bg-indigo-500",
		spark: "#6366f1",
	},
	amber: {
		border: "border-t-amber-500",
		bar: "bg-amber-500",
		spark: "#f59e0b",
	},
	green: {
		border: "border-t-green-500",
		bar: "bg-green-500",
		spark: "#22c55e",
	},
	cyan: { border: "border-t-cyan-500", bar: "bg-cyan-500", spark: "#06b6d4" },
};

const deltaColors: Record<DeltaTone, string> = {
	up: "text-green-500",
	down: "text-red-500",
	flat: "text-muted-foreground",
};

function InlineSparkline({ data, color }: { data: number[]; color: string }) {
	if (data.length < 2) return null;
	const W = 84,
		H = 28;
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;
	const step = W / (data.length - 1);
	const pts = data.map(
		(v, i) =>
			`${(i * step).toFixed(2)},${(H - 2 - ((v - min) / range) * (H - 4)).toFixed(2)}`,
	);
	const d = `M ${pts.join(" L ")}`;
	const dFill = `${d} L ${W},${H} L 0,${H} Z`;
	return (
		<svg
			aria-hidden="true"
			width={W}
			height={H}
			viewBox={`0 0 ${W} ${H}`}
			style={{ display: "block", flexShrink: 0 }}
		>
			<path d={dFill} fill={color} fillOpacity={0.15} />
			<path
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={1.4}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function MetricCard({
	label,
	value,
	percent,
	color,
	subtitle,
	className,
	sparkData,
	delta,
	deltaTone = "up",
}: MetricCardProps) {
	const { border, bar, spark } = colorMap[color];
	const hasSpark = sparkData && sparkData.length >= 2;

	return (
		<Card className={cn("min-h-[132px] border-t-2 py-4", border, className)}>
			<CardContent className="flex h-full flex-col px-6 py-0">
				<p className="truncate text-xs font-semibold uppercase text-muted-foreground">
					{label}
				</p>
				<div className="mt-1 flex items-baseline gap-2">
					<p
						className="min-w-0 truncate text-[clamp(1.35rem,2.2vw,1.75rem)] font-bold leading-tight"
						title={value}
					>
						{value}
					</p>
					{delta && (
						<span
							className={cn(
								"ml-auto shrink-0 text-xs font-semibold tabular-nums",
								deltaColors[deltaTone],
							)}
						>
							{delta}
						</span>
					)}
				</div>
				{subtitle && (
					<p
						className="mt-1 min-w-0 truncate text-xs text-muted-foreground"
						title={subtitle}
					>
						{subtitle}
					</p>
				)}
				{hasSpark ? (
					<div className="mt-auto flex items-end justify-end pt-2">
						<InlineSparkline data={sparkData} color={spark} />
					</div>
				) : (
					<Progress
						value={Math.min(percent, 100)}
						className="mt-auto h-1.5"
						indicatorClassName={bar}
					/>
				)}
			</CardContent>
		</Card>
	);
}
