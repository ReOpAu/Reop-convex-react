import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import ListingDetailPage from "~/features/listings/pages/ListingDetailPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state/$type/$suburb/$id")({
	loader: () => loadOptionalAuthState(),
	component: ListingDetailRoute,
});

function ListingDetailRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<ListingDetailPage />
		</PublicLayout>
	);
}
