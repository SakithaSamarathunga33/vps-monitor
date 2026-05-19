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
    <main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
      <ProcessesPage />
    </main>
  );
}
