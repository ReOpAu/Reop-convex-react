import { getAuth } from "@clerk/react-router/server";
import { Conversation } from "~/components/conversation";
import { BuyerGuide } from "~/components/home/BuyerGuide";
import { CallToAction } from "~/components/home/CallToAction";
import { Features } from "~/components/home/Features";
import { Hero } from "~/components/home/Hero";
import { HowItWorks } from "~/components/home/HowItWorks";
import { InvestorTypes } from "~/components/home/InvestorTypes";
import { SellerGuide } from "~/components/home/SellerGuide";
import { PublicLayout } from "~/components/layout/PublicLayout";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
	{ title: "REOP Main - Australian Real Estate Marketplace" },
	{
		name: "description",
		content:
			"Find and list properties across Australia. AI-powered address search, buyer-seller matching, and real-time listings.",
	},
	{
		property: "og:title",
		content: "REOP Main - Australian Real Estate Marketplace",
	},
	{
		property: "og:description",
		content:
			"Find and list properties across Australia. AI-powered address search, buyer-seller matching, and real-time listings.",
	},
	{ property: "og:type", content: "website" },
];

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<Hero />
			<Features />
			<InvestorTypes />
			<div className="my-12">
				<Conversation />
			</div>
			<BuyerGuide />
			<SellerGuide />
			<HowItWorks />
			<CallToAction />
		</PublicLayout>
	);
}
