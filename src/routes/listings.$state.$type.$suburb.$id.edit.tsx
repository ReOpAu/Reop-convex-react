import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import EditListingPage from "~/features/listings/pages/EditListingPage";
import { loadRequiredAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/$state/$type/$suburb/$id/edit")({
	loader: async () => {
		const authState = await loadRequiredAuthState();
		if (!authState.userId) {
			throw redirect({ to: "/sign-in" });
		}

		return { isSignedIn: true };
	},
	component: EditListingRoute,
});

function EditListingRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<EditListingPage />
		</PublicLayout>
	);
}
