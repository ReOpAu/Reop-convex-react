import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import ListingsOverviewPage from "~/features/listings/pages/ListingsOverviewPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/")({
	head: () => ({
		meta: [
			{ title: "Property Listings - REOP Main" },
			{
				name: "description",
				content:
					"Browse property listings across Australia. Filter by state, type, and suburb.",
			},
		],
	}),
	loader: () => loadOptionalAuthState(),
	component: ListingsRoute,
});

function ListingsRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<ListingsOverviewPage />
		</PublicLayout>
	);
}
