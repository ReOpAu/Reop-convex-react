import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	isRouteErrorResponse,
} from "react-router";

import { ClerkProvider, useAuth } from "@clerk/react-router";
import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { Route } from "./+types/root";
import "./app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const queryClient = new QueryClient();

export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

export async function loader(args: Route.LoaderArgs) {
	return rootAuthLoader(args);
}
export const links: Route.LinksFunction = () => [
	// DNS prefetch for external services
	{ rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
	{ rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
	{ rel: "dns-prefetch", href: "https://api.convex.dev" },
	{ rel: "dns-prefetch", href: "https://clerk.dev" },

	// Preconnect to font services
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},

	// Font with display=swap for performance
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
	},

	// Preload critical assets
	{
		rel: "preload",
		href: "/rsk.png",
		as: "image",
		type: "image/png",
	},
	{
		rel: "preload",
		href: "/favicon.png",
		as: "image",
		type: "image/png",
	},

	// Icon
	{
		rel: "icon",
		type: "image/png",
		href: "/favicon.png",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				<Analytics />
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App({ loaderData }: Route.ComponentProps) {
	return (
		<ClerkProvider
			loaderData={loaderData}
			signUpFallbackRedirectUrl="/"
			signInFallbackRedirectUrl="/"
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<QueryClientProvider client={queryClient}>
					<Outlet />
				</QueryClientProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
			<h1 className="text-6xl font-bold text-foreground">{message}</h1>
			<p className="mt-4 text-lg text-muted-foreground">{details}</p>
			<a
				href="/"
				className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</a>
			{stack && (
				<pre className="mt-8 w-full max-w-2xl overflow-x-auto rounded-md bg-muted p-4 text-left text-xs">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
