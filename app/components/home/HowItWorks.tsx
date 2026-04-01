const steps = [
	{
		number: 1,
		title: "Write a brief",
		description:
			"Describe the buyer or seller intent, suburb focus, and the constraints that actually matter.",
	},
	{
		number: 2,
		title: "Refine the signal",
		description:
			"Use the address and matching tools to tighten the field instead of browsing aimlessly.",
	},
	{
		number: 3,
		title: "Watch for fit",
		description:
			"Surface the people and properties that line up with the brief before the opportunity turns generic.",
	},
	{
		number: 4,
		title: "Move directly",
		description:
			"Once the fit is real, connect without the extra theatre and keep the conversation on the decision.",
	},
];

export function HowItWorks() {
	return (
		<section id="how-it-works" className="py-16 sm:py-24">
			<div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
						How it works
					</p>
					<h2 className="mt-4 font-display text-4xl leading-none text-market-ink sm:text-5xl">
						A straighter path from brief to real conversation.
					</h2>
					<p className="mt-5 text-base leading-8 text-market-ink/72">
						The product flow should feel measured and deliberate. Each step helps
						you filter the market more effectively instead of dumping you into a
						sea of identical cards.
					</p>
				</div>
				<div className="mt-10 grid gap-5 lg:grid-cols-4">
					{steps.map((step) => (
						<article
							key={step.number}
							className="relative rounded-[28px] border border-market-line/70 bg-white/68 p-6 pt-10 shadow-[0_22px_55px_-42px_rgba(29,23,17,0.45)] backdrop-blur-sm"
						>
							<div className="absolute left-6 top-0 h-10 w-px bg-market-brass/80" />
							<p className="font-display text-4xl leading-none text-market-clay">
								0{step.number}
							</p>
							<h3 className="mt-6 text-2xl font-semibold text-market-ink">
								{step.title}
							</h3>
							<p className="mt-3 text-sm leading-7 text-market-ink/72">
								{step.description}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
