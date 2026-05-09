import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  running:    "bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400 dark:border-green-500/30",
  paused:     "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  exited:     "bg-red-500/10 text-red-500 border border-red-500/20 dark:border-red-500/30",
  dead:       "bg-red-500/10 text-red-500 border border-red-500/20 dark:border-red-500/30",
  restarting: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = statusStyles[normalized] ?? "bg-muted text-muted-foreground border border-border";
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
