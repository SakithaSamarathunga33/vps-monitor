import { createFileRoute } from "@tanstack/react-router";

import { NetworksTable } from "@/features/networks/components/networks-table";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/networks/")({
	beforeLoad: async () => {
		await requireAuthIfEnabled();
	},
	component: NetworksPage,
});

function NetworksPage() {
	return (
		<main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
			<NetworksTable />
		</main>
	);
}
