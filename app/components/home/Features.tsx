import {
	Handshake,
	LockKeyhole,
	MapPinned,
	ScanSearch,
} from "lucide-react";

const features = [
	{
		icon: <ScanSearch className="size-5 text-market-clay" />,
		name: "Search by brief, not by brochure",
		description:
			"Set criteria around suburb, timing, and intent so you spend less time grazing generic portals.",
	},
	{
		icon: <LockKeyhole className="size-5 text-market-clay" />,
		name: "Keep the first move quieter",
		description:
			"Test demand and circulate a cleaner brief before you commit to a loud, expensive public campaign.",
	},
	{
		icon: <Handshake className="size-5 text-market-clay" />,
		name: "Move to direct introductions faster",
		description:
			"When the fit looks real, REOP shortens the path between interest and the first meaningful conversation.",
	},
	{
		icon: <MapPinned className="size-5 text-market-clay" />,
		name: "Use real suburb context",
		description:
			"Address tools and location signal help you narrow down where the opportunity actually fits.",
	},
];

export function Features() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto grid max-w-[1360px] gap-10 border-y border-market-line/70 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
				<div className="max-w-xl">
					<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
						Why it feels different
					</p>
					<h2 className="mt-4 font-display text-4xl leading-none text-market-ink sm:text-5xl">
						Built like a matching desk, not another portal carousel.
					</h2>
					<p className="mt-5 text-base leading-8 text-market-ink/72">
						The public experience should feel more like reading a sharp property
						brief than wandering a template-heavy SaaS homepage. These are the
						behaviours that shape that difference.
					</p>
				</div>
				<div className="grid gap-6 sm:grid-cols-2">
					{features.map((feature, index) => (
						<article
							key={feature.name}
							className="border-t border-market-line/70 pt-5"
						>
							<div className="flex items-center justify-between">
								{feature.icon}
								<span className="font-display text-2xl text-market-forest/25">
									0{index + 1}
								</span>
							</div>
							<h3 className="mt-4 text-xl font-semibold text-market-ink">
								{feature.name}
							</h3>
							<p className="mt-3 text-sm leading-7 text-market-ink/72">
								{feature.description}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
