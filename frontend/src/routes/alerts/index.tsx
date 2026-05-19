import { createFileRoute } from "@tanstack/react-router";

import { AlertsList } from "@/features/alerts/components/alerts-list";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/alerts/")({
  beforeLoad: async () => {
    await requireAuthIfEnabled();
  },
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
      <AlertsList />
    </main>
  );
}
