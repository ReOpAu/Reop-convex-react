import { getAuth } from "@clerk/react-router/server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import ListingsOverviewPage from "~/features/listings/pages/ListingsOverviewPage";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
	{ title: "Property Listings - REOP Main" },
	{
		name: "description",
		content:
			"Browse property listings across Australia. Filter by state, type, and suburb.",
	},
];

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function ListingsRoute({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<ListingsOverviewPage />
		</PublicLayout>
	);
}
