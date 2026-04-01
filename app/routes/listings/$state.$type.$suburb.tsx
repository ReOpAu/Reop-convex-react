import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import SuburbListingsPage from "~/features/listings/pages/SuburbListingsPage";
import type { Route } from "./+types/$state.$type.$suburb";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function SuburbListingsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<SuburbListingsPage />
		</PublicLayout>
	);
}
