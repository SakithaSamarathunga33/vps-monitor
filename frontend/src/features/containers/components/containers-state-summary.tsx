import type { StateCounts } from "./container-utils";

interface ContainersStateSummaryProps {
  stateCounts: StateCounts;
  total: number;
}

export function ContainersStateSummary({
  stateCounts,
  total,
}: ContainersStateSummaryProps) {
  return (
    <div className="helm-state-tabs">
      <div className="helm-state-tab">
        <span>All</span>
        <strong>{total}</strong>
      </div>
      {stateCounts.running > 0 && (
        <div className="helm-state-tab is-active">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span>Running</span>
          <strong>{stateCounts.running}</strong>
        </div>
      )}
      {stateCounts.exited > 0 && (
        <div className="helm-state-tab">
          <div className="size-2 rounded-full bg-muted" />
          <span>Exited</span>
          <strong>{stateCounts.exited}</strong>
        </div>
      )}
      {stateCounts.paused > 0 && (
        <div className="helm-state-tab">
          <div className="size-2 rounded-full bg-amber-500" />
          <span>Paused</span>
          <strong>{stateCounts.paused}</strong>
        </div>
      )}
      {stateCounts.restarting > 0 && (
        <div className="helm-state-tab">
          <div className="size-2 rounded-full bg-blue-500" />
          <span>Restarting</span>
          <strong>{stateCounts.restarting}</strong>
        </div>
      )}
      {stateCounts.dead > 0 && (
        <div className="helm-state-tab">
          <div className="size-2 rounded-full bg-rose-500" />
          <span>Dead</span>
          <strong>{stateCounts.dead}</strong>
        </div>
      )}
    </div>
  );
}
