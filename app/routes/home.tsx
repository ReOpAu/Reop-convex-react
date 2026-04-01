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
	{ title: "REOP | Quieter Property Matching Across Australia" },
	{
		name: "description",
		content:
			"Place buyer and seller briefs, search suburb-by-suburb, and match with more signal across the Australian property market.",
	},
	{
		property: "og:title",
		content: "REOP | Quieter Property Matching Across Australia",
	},
	{
		property: "og:description",
		content:
			"Place buyer and seller briefs, search suburb-by-suburb, and match with more signal across the Australian property market.",
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
			<section className="py-16 sm:py-24">
				<div className="mx-auto grid max-w-[1360px] gap-8 px-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
					<div className="rounded-[30px] border border-market-line/70 bg-white/55 p-7 shadow-[0_25px_70px_-45px_rgba(29,23,17,0.45)] backdrop-blur-sm">
						<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
							Matching Desk
						</p>
						<h2 className="mt-4 font-display text-4xl leading-none text-market-ink sm:text-5xl">
							Test a live brief before you commit to a move.
						</h2>
						<p className="mt-4 text-sm leading-7 text-market-ink/72">
							Ask about suburbs, buying scenarios, seller timing, or what kind
							of listing brief will attract a stronger match. The desk works in
							text or voice.
						</p>
					</div>
					<Conversation />
				</div>
			</section>
			<BuyerGuide />
			<SellerGuide />
			<HowItWorks />
			<CallToAction />
		</PublicLayout>
	);
}
