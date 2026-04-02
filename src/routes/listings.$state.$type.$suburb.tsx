import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import SuburbListingsPage from "~/features/listings/pages/SuburbListingsPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state/$type/$suburb")({
	loader: () => loadOptionalAuthState(),
	component: SuburbListingsRoute,
});

function SuburbListingsRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<SuburbListingsPage />
		</PublicLayout>
	);
}
