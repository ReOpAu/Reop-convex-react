import { createFileRoute } from "@tanstack/react-router";
import { Benefits } from "~/components/about/Benefits";
import { FAQ } from "~/components/about/FAQ";
import { AboutHero } from "~/components/about/Hero";
import { HowItWorksDetailed } from "~/components/about/HowItWorksDetailed";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/about")({
	head: () => ({
		meta: [
			{ title: "About - REOP Main" },
			{
				name: "description",
				content:
					"Learn about REOP Main - an AI-powered Australian real estate marketplace.",
			},
		],
	}),
	loader: () => loadOptionalAuthState(),
	component: AboutPage,
});

function AboutPage() {
	const loaderData = Route.useLoaderData();

	return (
		<PublicLayout loaderData={loaderData}>
			<AboutHero />
			<HowItWorksDetailed />
			<Benefits />
			<FAQ />
		</PublicLayout>
	);
}
