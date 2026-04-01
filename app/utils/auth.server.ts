import { createClerkClient } from "@clerk/react-router/api.server";
import { getAuth } from "@clerk/react-router/server";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import { isAdminAccess } from "../../shared/auth/admin";

function getConvexUrl() {
	const convexUrl = process.env.VITE_CONVEX_URL;
	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not configured");
	}

	return convexUrl;
}

export async function requireSignedInRoute(args: Parameters<typeof getAuth>[0]) {
	const auth = await getAuth(args);
	if (!auth.userId) {
		throw redirect("/sign-in");
	}

	return auth;
}

export async function createAuthedConvexServerClient(
	args: Parameters<typeof getAuth>[0],
) {
	const auth = await requireSignedInRoute(args);
	const token = await auth.getToken({ template: "convex" });

	if (!token) {
		throw redirect("/sign-in");
	}

	const client = new ConvexHttpClient(getConvexUrl());
	client.setAuth(token);

	return { auth, client };
}

export async function requireAdminRoute(args: Parameters<typeof getAuth>[0]) {
	const auth = await requireSignedInRoute(args);
	const clerk = createClerkClient({
		secretKey: process.env.CLERK_SECRET_KEY,
	});
	const user = await clerk.users.getUser(auth.userId);
	const email =
		user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
	const isAdmin = isAdminAccess({
		email,
		subject: user.id,
		role: user.publicMetadata?.role,
		publicMetadata: user.publicMetadata,
		privateMetadata: user.privateMetadata,
		sessionClaims: auth.sessionClaims,
	});

	if (!isAdmin) {
		throw new Response("Not found", { status: 404 });
	}

	return { auth, user };
}
