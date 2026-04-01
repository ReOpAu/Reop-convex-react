import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import MatchDetailPage from "~/features/listings/pages/MatchDetailPage";
import type { Route } from "./+types/$matchId";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function MatchDetailRoute({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<MatchDetailPage />
		</PublicLayout>
	);
}
