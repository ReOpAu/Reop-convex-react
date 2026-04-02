import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import MyListingsPage from "~/features/listings/pages/MyListingsPage";
import { loadRequiredAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/my-listings")({
	loader: async () => {
		const authState = await loadRequiredAuthState();
		if (!authState.userId) {
			throw redirect({ to: "/sign-in" });
		}

		return { isSignedIn: true };
	},
	component: MyListingsRoute,
});

function MyListingsRoute() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<MyListingsPage />
		</PublicLayout>
	);
}
