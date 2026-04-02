import { BarChart, Clock, Target, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

const benefits = [
	{
		icon: <Target className="size-7 text-market-brass" />,
		title: "Smarter pricing posture",
		description:
			"Shape the first brief around positioning and demand instead of rushing straight to a noisy public number.",
	},
	{
		icon: <Users className="size-7 text-market-brass" />,
		title: "Better buyer fit",
		description:
			"Reach people whose brief already lines up with the asset, so the first conversation starts further down the track.",
	},
	{
		icon: <BarChart className="size-7 text-market-brass" />,
		title: "Live market reading",
		description:
			"Watch response quality and adjust the brief before you sink time into the wrong presentation strategy.",
	},
	{
		icon: <Clock className="size-7 text-market-brass" />,
		title: "Timing without panic",
		description:
			"Move when the market is ready for your brief, not because a template landing page told you to hurry.",
	},
];

export function SellerGuide() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
				<div className="overflow-hidden rounded-[34px] border border-market-forest/18 bg-market-forest text-market-paper shadow-[0_40px_80px_-50px_rgba(38,70,61,0.9)]">
					<div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[0.85fr_1.15fr]">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-paper/60">
								For sellers
							</p>
							<h2 className="mt-4 font-display text-4xl leading-none sm:text-5xl">
								Sell with a clearer brief and a steadier hand.
							</h2>
							<p className="mt-5 max-w-md text-sm leading-8 text-market-paper/74">
								REOP helps you understand how the market is likely to respond
								before you commit to the full performance of a public listing
								campaign.
							</p>
							<Button
								asChild
								size="lg"
								className="mt-8 h-12 rounded-full border border-market-brass/50 bg-market-brass px-7 text-market-ink shadow-none hover:bg-market-brass/90"
							>
								<Link to="/sign-up">List Your Property</Link>
							</Button>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							{benefits.map((benefit) => (
								<article
									key={benefit.title}
									className="rounded-[26px] border border-market-paper/12 bg-market-paper/8 p-5"
								>
									<div className="flex size-14 items-center justify-center rounded-full border border-market-paper/12 bg-market-paper/8">
										{benefit.icon}
									</div>
									<h3 className="mt-5 text-xl font-semibold text-market-paper">
										{benefit.title}
									</h3>
									<p className="mt-3 text-sm leading-7 text-market-paper/70">
										{benefit.description}
									</p>
								</article>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
