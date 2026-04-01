import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import TypeListingsPage from "~/features/listings/pages/TypeListingsPage";
import type { Route } from "./+types/$state.$type";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function TypeListingsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<TypeListingsPage />
		</PublicLayout>
	);
}
