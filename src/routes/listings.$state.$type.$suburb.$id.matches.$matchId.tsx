import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import MatchDetailPage from "~/features/listings/pages/MatchDetailPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute(
	"/listings/$state/$type/$suburb/$id/matches/$matchId",
)({
	loader: () => loadOptionalAuthState(),
	component: MatchDetailRoute,
});

function MatchDetailRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<MatchDetailPage />
		</PublicLayout>
	);
}
