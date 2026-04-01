import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import EditListingPage from "~/features/listings/pages/EditListingPage";
import type { Route } from "./+types/edit";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	if (!userId) {
		throw redirect("/sign-in");
	}
	return {
		isSignedIn: true,
	};
}

export default function EditListingRoute({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<EditListingPage />
		</PublicLayout>
	);
}
