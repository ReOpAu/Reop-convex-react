import { BarChart, Bell, Search, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const benefits = [
	{
		icon: <Search className="size-7 text-market-clay" />,
		title: "Sharper property shortlists",
		description:
			"Skip the endless swipe through irrelevant stock and narrow the field around fit, timing, and location.",
	},
	{
		icon: <BarChart className="size-7 text-market-clay" />,
		title: "Local market context",
		description:
			"Use suburb signal and demand context to understand what is moving now, not what looked good three months ago.",
	},
	{
		icon: <TrendingUp className="size-7 text-market-clay" />,
		title: "Better investment filtering",
		description:
			"Separate portfolio-worthy options from the pretty distractions before you waste attention on them.",
	},
	{
		icon: <Bell className="size-7 text-market-clay" />,
		title: "Earlier opportunity alerts",
		description:
			"Stay close to the movement you care about without living inside a generic property portal every day.",
	},
];

export function BuyerGuide() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto grid max-w-[1360px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
				<div className="lg:sticky lg:top-28 lg:self-start">
					<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
						For buyers
					</p>
					<h2 className="mt-4 font-display text-4xl leading-none text-market-ink sm:text-5xl">
						Go suburb by suburb with more signal and less clutter.
					</h2>
					<p className="mt-5 max-w-md text-base leading-8 text-market-ink/72">
						Most property interfaces make you browse forever. REOP is designed
						to help you filter harder, notice patterns sooner, and act when a
						match is worth the call.
					</p>
					<Button
						asChild
						size="lg"
						className="mt-8 h-12 rounded-full border border-market-forest bg-market-forest px-7 text-market-paper shadow-[0_24px_40px_-24px_rgba(38,70,61,0.8)] hover:bg-market-forest/92"
					>
						<Link to="/sign-up">Start Your Search</Link>
					</Button>
				</div>
				<div className="grid gap-4">
					{benefits.map((benefit) => (
						<article
							key={benefit.title}
							className="grid gap-5 rounded-[28px] border border-market-line/70 bg-white/70 p-6 shadow-[0_22px_55px_-42px_rgba(29,23,17,0.45)] backdrop-blur-sm sm:grid-cols-[72px_1fr]"
						>
							<div className="flex size-14 items-center justify-center rounded-full border border-market-line/80 bg-market-sand/60">
								{benefit.icon}
							</div>
							<div>
								<h3 className="text-2xl font-semibold text-market-ink">
									{benefit.title}
								</h3>
								<p className="mt-3 text-sm leading-7 text-market-ink/72">
									{benefit.description}
								</p>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
