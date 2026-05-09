import { createFileRoute } from "@tanstack/react-router";

import { ProcessesPage } from "@/features/processes/components/processes-page";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/processes/")({
  beforeLoad: async () => {
    await requireAuthIfEnabled();
  },
  component: Processes,
});

function Processes() {
  return (
    <main className="container mx-auto px-4 py-8">
      <ProcessesPage />
    </main>
  );
}
