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
    <main className="container">
      <AlertsList />
    </main>
  );
}
