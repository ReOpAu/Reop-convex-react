import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import ListingDetailPage from "~/features/listings/pages/ListingDetailPage";
import type { Route } from "./+types/$state.$type.$suburb.$id";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function ListingDetailRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<ListingDetailPage />
		</PublicLayout>
	);
}
