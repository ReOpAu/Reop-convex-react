import { UserButton } from "@clerk/react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const navItems = [
	{ to: "/", label: "Home" },
	{ to: "/about", label: "About" },
	{ to: "/blog", label: "Journal" },
	{ to: "/listings", label: "Listings" },
	{ to: "/address-finder", label: "Address Finder" },
	{ to: "/address-finder-cartesia", label: "Voice Finder" },
];

export function Header({
	loaderData,
}: {
	loaderData?: { isSignedIn: boolean };
}) {
	return (
		<header className="sticky top-0 z-50 border-b border-market-line/70 bg-market-paper/85 backdrop-blur-xl">
			<nav className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
				<Link to="/" className="flex items-center gap-3 text-market-ink">
					<div className="flex size-11 items-center justify-center rounded-full border border-market-forest/15 bg-market-forest text-market-paper shadow-[0_12px_30px_-20px_rgba(38,70,61,0.8)]">
						<span className="font-display text-2xl leading-none">R</span>
					</div>
					<div className="min-w-0">
						<p className="font-display text-[2rem] leading-none">REOP</p>
						<p className="text-[0.62rem] uppercase tracking-[0.3em] text-market-forest/70">
							Australian property exchange
						</p>
					</div>
				</Link>

				<div className="hidden items-center gap-6 lg:flex">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="text-sm font-medium text-market-ink/72 transition-colors hover:text-market-forest"
						>
							{item.label}
						</Link>
					))}
				</div>

				<div className="flex items-center gap-2 sm:gap-3">
					{loaderData?.isSignedIn ? (
						<UserButton />
					) : (
						<>
							<Button
								asChild
								variant="outline"
								size="sm"
								className="rounded-full border-market-line/80 bg-white/70 px-4 text-market-ink shadow-none hover:bg-white"
							>
								<Link to="/sign-in" prefetch="viewport">
									Sign In
								</Link>
							</Button>
							<Button
								asChild
								size="sm"
								className="rounded-full border border-market-forest bg-market-forest px-4 text-market-paper shadow-[0_18px_35px_-22px_rgba(38,70,61,0.85)] hover:bg-market-forest/92"
							>
								<Link to="/sign-up" prefetch="viewport">
									Create Brief
								</Link>
							</Button>
						</>
					)}
				</div>
			</nav>
		</header>
	);
}
