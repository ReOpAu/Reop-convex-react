import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function PublicLayout({
	children,
	loaderData,
}: { children: ReactNode; loaderData?: { isSignedIn: boolean } }) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-market-paper text-market-ink">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0"
			>
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(196,149,98,0.18),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(38,70,61,0.12),transparent_26%),linear-gradient(180deg,#fbf7f1_0%,#f2e8d8_52%,#f8f4ed_100%)]" />
				<div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(52,42,32,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(52,42,32,0.06)_1px,transparent_1px)] [background-size:120px_120px]" />
			</div>
			<div className="relative z-10">
				<Header loaderData={loaderData} />
				<main className="pb-12 sm:pb-20">{children}</main>
				<Footer />
			</div>
		</div>
	);
}
