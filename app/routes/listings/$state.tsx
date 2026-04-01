import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import StateListingsPage from "~/features/listings/pages/StateListingsPage";
import type { Route } from "./+types/$state";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function StateListingsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<StateListingsPage />
		</PublicLayout>
	);
}
