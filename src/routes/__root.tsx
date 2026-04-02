/// <reference types="vite/client" />
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import appCssHref from "../../app/app.css?url";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const queryClient = new QueryClient();

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
		],
		links: [
			{ rel: "stylesheet", href: appCssHref },
			{ rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
			{ rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
			{ rel: "dns-prefetch", href: "https://api.convex.dev" },
			{ rel: "dns-prefetch", href: "https://clerk.dev" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
			},
			{ rel: "preload", href: "/rsk.png", as: "image", type: "image/png" },
			{
				rel: "preload",
				href: "/favicon.png",
				as: "image",
				type: "image/png",
			},
			{ rel: "icon", href: "/favicon.png", type: "image/png" },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
	errorComponent: RootErrorBoundary,
});

function RootComponent() {
	return (
		<ClerkProvider>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<QueryClientProvider client={queryClient}>
					<RootDocument>
						<Outlet />
					</RootDocument>
				</QueryClientProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Analytics />
				{children}
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}

function NotFound() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
			<h1 className="text-6xl font-bold text-foreground">404</h1>
			<p className="mt-4 text-lg text-muted-foreground">
				The requested page could not be found.
			</p>
			<a
				href="/"
				className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</a>
		</main>
	);
}

function RootErrorBoundary({ error }: { error: Error }) {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
			<h1 className="text-6xl font-bold text-foreground">Error</h1>
			<p className="mt-4 text-lg text-muted-foreground">
				{error.message || "An unexpected error occurred."}
			</p>
			<a
				href="/"
				className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</a>
		</main>
	);
}
