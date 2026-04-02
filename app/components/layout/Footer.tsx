import { Link } from "@tanstack/react-router";

export function Footer() {
	return (
		<footer className="border-t border-market-line/70">
			<div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr] lg:px-8">
				<div className="max-w-md">
					<Link to="/" className="inline-flex items-center gap-3 text-market-ink">
						<div className="flex size-11 items-center justify-center rounded-full border border-market-forest/15 bg-market-forest text-market-paper">
							<span className="font-display text-2xl leading-none">R</span>
						</div>
						<div>
							<p className="font-display text-3xl leading-none">REOP</p>
							<p className="text-[0.62rem] uppercase tracking-[0.32em] text-market-forest/70">
								Quiet property matching
							</p>
						</div>
					</Link>
					<p className="mt-5 text-sm leading-7 text-market-ink/72">
						Built for buyers, owners, and investors who want a calmer way to
						place a brief, test demand, and move on real opportunities across
						Australia.
					</p>
				</div>

				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-market-forest/65">
						Explore
					</p>
					<div className="mt-5 flex flex-col gap-3">
						<Link to="/listings" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							Listings
						</Link>
						<Link to="/address-finder" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							Address Finder
						</Link>
						<Link to="/address-finder-cartesia" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							Voice Finder
						</Link>
						<Link to="/pricing" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							Pricing
						</Link>
					</div>
				</div>

				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-market-forest/65">
						Company
					</p>
					<div className="mt-5 flex flex-col gap-3">
						<Link to="/about" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							About
						</Link>
						<Link to="/blog" className="text-sm text-market-ink/72 transition-colors hover:text-market-forest">
							Journal
						</Link>
						<a
							href="https://x.com/rasmickyy"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-market-ink/72 transition-colors hover:text-market-forest"
						>
							X / Twitter
						</a>
					</div>
				</div>
			</div>
			<div className="border-t border-market-line/60 px-4 py-5 text-center text-xs uppercase tracking-[0.22em] text-market-ink/55 sm:px-6 lg:px-8">
				© {new Date().getFullYear()} REOP. Property moves without portal theatre.
			</div>
		</footer>
	);
}
