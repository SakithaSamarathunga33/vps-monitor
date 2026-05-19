import { createFileRoute } from "@tanstack/react-router";

import { StatsPage } from "@/features/stats/components/stats-page";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/stats/")({
  beforeLoad: async () => {
    await requireAuthIfEnabled();
  },
  component: Stats,
});

function Stats() {
  return (
    <main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
      <StatsPage />
    </main>
  );
}
