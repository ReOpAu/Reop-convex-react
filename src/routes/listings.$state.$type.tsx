import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import TypeListingsPage from "~/features/listings/pages/TypeListingsPage";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state/$type")({
	loader: () => loadOptionalAuthState(),
	component: TypeListingsRoute,
});

function TypeListingsRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<TypeListingsPage />
		</PublicLayout>
	);
}
