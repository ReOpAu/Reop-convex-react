import { getAuth } from "@clerk/react-router/server";
import { Benefits } from "~/components/about/Benefits";
import { FAQ } from "~/components/about/FAQ";
import { AboutHero } from "~/components/about/Hero";
import { HowItWorksDetailed } from "~/components/about/HowItWorksDetailed";
import { PublicLayout } from "~/components/layout/PublicLayout";
import type { Route } from "./+types/about";

export const meta: Route.MetaFunction = () => [
	{ title: "About - REOP Main" },
	{
		name: "description",
		content:
			"Learn about REOP Main - an AI-powered Australian real estate marketplace.",
	},
];

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function AboutPage({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<AboutHero />
			<HowItWorksDetailed />
			<Benefits />
			<FAQ />
		</PublicLayout>
	);
}
