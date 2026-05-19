import { createFileRoute } from "@tanstack/react-router";

import { ImagesTable } from "@/features/images/components/images-table";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/images/")({
	beforeLoad: async () => {
		await requireAuthIfEnabled();
	},
	component: ImagesPage,
});

function ImagesPage() {
	return (
		<main className="w-full max-w-[1600px] mx-auto px-6 pt-5 pb-20">
			<ImagesTable />
		</main>
	);
}
