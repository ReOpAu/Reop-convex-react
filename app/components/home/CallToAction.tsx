import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const calloutPoints = [
	"List a buyer or seller brief in under a minute.",
	"Use suburb intelligence before the campaign gets loud.",
	"Move to a direct conversation when the fit is real.",
];

export function CallToAction() {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
				<div className="relative overflow-hidden rounded-[36px] border border-market-ink/12 bg-market-ink text-market-paper shadow-[0_40px_80px_-50px_rgba(29,23,17,0.95)]">
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,149,98,0.32),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(38,70,61,0.45),transparent_32%)]"
					/>
					<div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-paper/55">
								Next move
							</p>
							<h2 className="mt-4 max-w-2xl font-display text-4xl leading-none sm:text-5xl">
								Stop presenting like a portal. Start moving like a brief.
							</h2>
							<p className="mt-5 max-w-xl text-base leading-8 text-market-paper/72">
								If the project is going to feel sharper, the final CTA needs to
								reinforce restraint, confidence, and signal. No neon gradient.
								No template pitch. Just a clear invitation to act.
							</p>
							<div className="mt-8 flex flex-wrap items-center gap-4">
								<Button
									asChild
									size="lg"
									className="h-12 rounded-full border border-market-brass/50 bg-market-brass px-7 text-market-ink shadow-none hover:bg-market-brass/90"
								>
									<Link to="/sign-up">Create Your Brief</Link>
								</Button>
								<Link
									to="/about"
									className="text-sm font-semibold uppercase tracking-[0.28em] text-market-paper transition-colors hover:text-market-brass"
								>
									Read the premise
								</Link>
							</div>
						</div>
						<div className="grid gap-3">
							{calloutPoints.map((point) => (
								<div
									key={point}
									className="rounded-[22px] border border-market-paper/12 bg-market-paper/7 px-5 py-4 text-sm leading-7 text-market-paper/76"
								>
									{point}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
