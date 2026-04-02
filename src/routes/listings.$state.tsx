import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import StateListingsPage from "~/features/listings/pages/StateListingsPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state")({
	loader: () => loadOptionalAuthState(),
	component: StateListingsRoute,
});

function StateListingsRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<StateListingsPage />
		</PublicLayout>
	);
}
