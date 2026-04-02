import { clerkClient, auth } from "@clerk/tanstack-react-start/server";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "@tanstack/react-router";
import { isAdminAccess } from "../../shared/auth/admin";

function getConvexUrl() {
	const convexUrl = process.env.VITE_CONVEX_URL;
	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not configured");
	}

	return convexUrl;
}

export async function requireSignedInRoute(_args?: unknown) {
	const authState = await auth();
	if (!authState.userId) {
		throw redirect({ to: "/sign-in" });
	}

	return authState;
}

export async function createAuthedConvexServerClient(
	args?: unknown,
) {
	const authState = await requireSignedInRoute(args);
	const token = await authState.getToken({ template: "convex" });

	if (!token) {
		throw redirect({ to: "/sign-in" });
	}

	const client = new ConvexHttpClient(getConvexUrl());
	client.setAuth(token);

	return { auth: authState, client };
}

export async function requireAdminRoute(args?: unknown) {
	const authState = await requireSignedInRoute(args);
	const clerk = clerkClient({
		secretKey: process.env.CLERK_SECRET_KEY,
	});
	const user = await clerk.users.getUser(authState.userId);
	const email =
		user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
	const isAdmin = isAdminAccess({
		email,
		subject: user.id,
		role: user.publicMetadata?.role,
		publicMetadata: user.publicMetadata,
		privateMetadata: user.privateMetadata,
		sessionClaims: authState.sessionClaims,
	});

	if (!isAdmin) {
		throw new Response("Not found", { status: 404 });
	}

	return { auth: authState, user };
}
