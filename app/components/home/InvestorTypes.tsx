import { Building, CheckCircle2, Home } from "lucide-react";

const types = [
	{
		icon: <Home className="size-9 text-market-clay" />,
		title: "Owner Occupiers",
		description:
			"Track the suburbs and homes that fit your actual life, not just a generic saved search.",
		features: [
			"Direct access to quieter briefs",
			"Suburb-by-suburb filtering",
			"Timing and readiness signal",
			"Cleaner first conversations",
		],
	},
	{
		icon: <Building className="size-9 text-market-paper" />,
		title: "Property Investors",
		description:
			"Find yield, timing, and local movement earlier so you can act before the obvious crowd arrives.",
		features: [
			"Sharper suburb intelligence",
			"High-intent opportunity discovery",
			"Faster shortlisting",
			"Data-backed expansion moves",
		],
	},
];

export function InvestorTypes() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
						Two fronts of the market
					</p>
					<h2 className="mt-4 font-display text-4xl leading-none text-market-ink sm:text-5xl">
						REOP works when the buyer brief and seller intent are both sharp.
					</h2>
				</div>
				<div className="mt-10 grid gap-6 lg:grid-cols-2">
					{types.map((type, index) => (
						<article
							key={type.title}
							className={
								index === 0
									? "rounded-[32px] border border-market-line/70 bg-white/70 p-8 shadow-[0_24px_60px_-42px_rgba(29,23,17,0.45)] backdrop-blur-sm"
									: "rounded-[32px] border border-market-forest/20 bg-market-forest p-8 text-market-paper shadow-[0_30px_70px_-45px_rgba(38,70,61,0.85)]"
							}
						>
							<div className="flex items-center gap-4">
								<div
									className={
										index === 0
											? "flex size-14 items-center justify-center rounded-full border border-market-line/80 bg-market-sand/65"
											: "flex size-14 items-center justify-center rounded-full border border-market-paper/15 bg-market-paper/8"
									}
								>
									{type.icon}
								</div>
								<div>
									<p
										className={
											index === 0
												? "text-xs font-semibold uppercase tracking-[0.28em] text-market-clay"
												: "text-xs font-semibold uppercase tracking-[0.28em] text-market-paper/60"
										}
									>
										{index === 0 ? "For buyers" : "For investors"}
									</p>
									<h3 className="mt-2 font-display text-4xl leading-none">
										{type.title}
									</h3>
								</div>
							</div>
							<p
								className={
									index === 0
										? "mt-6 text-sm leading-7 text-market-ink/72"
										: "mt-6 text-sm leading-7 text-market-paper/74"
								}
							>
								{type.description}
							</p>
							<ul className="mt-8 space-y-3">
								{type.features.map((feature) => (
									<li key={feature} className="flex gap-3">
										<CheckCircle2
											className={
												index === 0
													? "mt-0.5 size-5 text-market-clay"
													: "mt-0.5 size-5 text-market-brass"
											}
										/>
										<span
											className={
												index === 0 ? "text-market-ink/78" : "text-market-paper/78"
											}
										>
											{feature}
										</span>
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
