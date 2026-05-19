import { createFileRoute } from "@tanstack/react-router";

import { DatabasesPage } from "@/features/databases/components/databases-page";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/databases/")({
	beforeLoad: async () => {
		await requireAuthIfEnabled();
	},
	component: DatabasesRoute,
});

function DatabasesRoute() {
	return (
		<main className="container">
			<DatabasesPage />
		</main>
	);
}
