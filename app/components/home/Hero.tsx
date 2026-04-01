import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const proofPoints = [
	{
		value: "< 60 sec",
		label: "to place a clean buyer or seller brief",
	},
	{
		value: "Suburb-first",
		label: "search with location signal before the noise",
	},
	{
		value: "Direct intros",
		label: "once the fit looks real for both sides",
	},
];

const marketNotes = [
	"Quietly test demand before committing to a public campaign.",
	"Use suburb context and address tools to narrow the field fast.",
	"Keep the first conversation focused on fit, not theatre.",
];

export function Hero() {
	return (
		<section className="relative overflow-hidden pt-10 sm:pt-16">
			<div className="mx-auto grid max-w-[1360px] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:items-end lg:px-8">
				<div className="pb-6 sm:pb-10">
					<p className="text-xs font-semibold uppercase tracking-[0.32em] text-market-forest/65">
						Property exchange, not property theatre
					</p>
					<h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-market-ink sm:text-7xl lg:text-[5.5rem]">
						A calmer way to bring buyers and sellers together.
					</h1>
					<p className="mt-6 max-w-2xl text-lg leading-8 text-market-ink/72 sm:text-xl">
						REOP helps owners, buyers, and investors place cleaner briefs,
						search suburb by suburb, and move on real opportunities before they
						disappear into portal churn.
					</p>
					<div className="mt-9 flex flex-wrap items-center gap-4">
						<Button
							asChild
							size="lg"
							className="h-12 rounded-full border border-market-forest bg-market-forest px-7 text-market-paper shadow-[0_24px_40px_-24px_rgba(38,70,61,0.8)] hover:bg-market-forest/92"
						>
							<Link to="/sign-up">Place Your Brief</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 rounded-full border-market-line/80 bg-white/70 px-7 text-market-ink shadow-none hover:bg-white"
						>
							<Link to="/address-finder">Explore Address Finder</Link>
						</Button>
						<a
							href="#how-it-works"
							className="text-sm font-semibold uppercase tracking-[0.26em] text-market-forest transition-colors hover:text-market-clay"
						>
							See the flow
						</a>
					</div>
					<div className="mt-12 grid gap-4 sm:grid-cols-3">
						{proofPoints.map((point) => (
							<div
								key={point.value}
								className="rounded-[26px] border border-market-line/70 bg-white/60 p-5 shadow-[0_22px_60px_-42px_rgba(29,23,17,0.45)] backdrop-blur-sm"
							>
								<p className="font-display text-3xl leading-none text-market-ink">
									{point.value}
								</p>
								<p className="mt-3 text-sm leading-6 text-market-ink/72">
									{point.label}
								</p>
							</div>
						))}
					</div>
				</div>

				<aside className="relative overflow-hidden rounded-[34px] border border-market-line/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(244,236,223,0.92))] p-8 shadow-[0_35px_80px_-45px_rgba(29,23,17,0.55)]">
					<div
						aria-hidden="true"
						className="absolute inset-x-8 top-0 h-px bg-market-line/80"
					/>
					<div className="absolute -right-12 top-8 size-36 rounded-full bg-market-brass/20 blur-3xl" />
					<div className="absolute -left-10 bottom-4 size-28 rounded-full bg-market-forest/10 blur-3xl" />
					<div className="relative">
						<p className="text-xs font-semibold uppercase tracking-[0.34em] text-market-forest/65">
							Live market note
						</p>
						<h2 className="mt-4 font-display text-4xl leading-none text-market-ink">
							Built for people who want signal early.
						</h2>
						<p className="mt-4 text-sm leading-7 text-market-ink/72">
							Use REOP to surface a likely fit before you spend weeks shaping a
							public campaign or chasing stale leads.
						</p>
						<div className="mt-8 space-y-4">
							{marketNotes.map((note, index) => (
								<div
									key={note}
									className="flex gap-4 border-t border-market-line/60 pt-4"
								>
									<span className="font-display text-2xl text-market-clay">
										0{index + 1}
									</span>
									<p className="text-sm leading-7 text-market-ink/72">
										{note}
									</p>
								</div>
							))}
						</div>
					</div>
				</aside>
			</div>
		</section>
	);
}
