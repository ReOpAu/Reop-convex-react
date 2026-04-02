import {
	auth,
	clerkClient,
	clerkMiddleware,
} from "@clerk/tanstack-react-start/server";

export { clerkMiddleware, clerkClient };

export async function getAuth() {
	return auth();
}

export async function rootAuthLoader() {
	return auth();
}
