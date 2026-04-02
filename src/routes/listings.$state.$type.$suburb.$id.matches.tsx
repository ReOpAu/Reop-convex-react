import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import MatchesPage from "~/features/listings/pages/MatchesPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state/$type/$suburb/$id/matches")({
	loader: () => loadOptionalAuthState(),
	component: MatchesRoute,
});

function MatchesRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<MatchesPage />
		</PublicLayout>
	);
}
