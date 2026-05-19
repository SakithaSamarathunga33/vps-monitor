import { createFileRoute } from "@tanstack/react-router";

import { ScanHistoryPage } from "@/features/scanner/components/scan-history-page";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/scan-history/")({
  beforeLoad: async () => {
    await requireAuthIfEnabled();
  },
  component: ScanHistoryRoute,
});

function ScanHistoryRoute() {
  return (
    <main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
      <ScanHistoryPage />
    </main>
  );
}
