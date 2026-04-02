import { isRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

type RouteGuardResult =
	| { status: "ok" }
	| { status: "redirect"; to: string }
	| { status: "not-found" };

function getRedirectTarget(error: unknown) {
	if (!isRedirect(error)) {
		return null;
	}

	const { href, to } = error.options;
	if (typeof href === "string") {
		return href;
	}

	if (typeof to === "string") {
		return to;
	}

	return "/";
}

export const loadOptionalAuthState = createServerFn({ method: "GET" }).handler(
	async () => {
		const { auth } = await import("@clerk/tanstack-react-start/server");
		const { userId } = await auth();

		return {
			isSignedIn: Boolean(userId),
		};
	},
);

export const loadRequiredAuthState = createServerFn({ method: "GET" }).handler(
	async () => {
		const { auth } = await import("@clerk/tanstack-react-start/server");
		const { userId } = await auth();

		return {
			userId: userId ?? null,
		};
	},
);

export const loadAdminGuard = createServerFn({ method: "GET" }).handler(
	async (): Promise<RouteGuardResult> => {
		const { requireAdminRoute } = await import("../../app/utils/auth.server");

		try {
			await requireAdminRoute(undefined as never);
			return { status: "ok" };
		} catch (error) {
			const redirectTarget = getRedirectTarget(error);
			if (redirectTarget) {
				return { status: "redirect", to: redirectTarget };
			}

			if (error instanceof Response && error.status === 404) {
				return { status: "not-found" };
			}

			throw error;
		}
	},
);

export const loadDashboardShell = createServerFn({ method: "GET" }).handler(
	async () => {
		const { loader } = await import("../../app/routes/dashboard/layout");

		try {
			const data = await loader(undefined as never);

			return {
				status: "ok" as const,
				data: {
					user: {
						firstName: data.user.firstName,
						lastName: data.user.lastName,
						imageUrl: data.user.imageUrl,
						emailAddresses: data.user.emailAddresses.map((email) => ({
							emailAddress: email.emailAddress,
						})),
					},
				},
			};
		} catch (error) {
			const redirectTarget = getRedirectTarget(error);
			if (redirectTarget) {
				return { status: "redirect" as const, to: redirectTarget };
			}

			if (error instanceof Response && error.status === 404) {
				return { status: "not-found" as const };
			}

			throw error;
		}
	},
);

export const loadBlogPosts = createServerFn({ method: "GET" }).handler(
	async () => {
		const { getPosts } = await import("../../app/lib/posts");

		return {
			posts: await getPosts(),
		};
	},
);

export const loadBlogPost = createServerFn({ method: "GET" })
	.inputValidator((input: { slug: string }) => input)
	.handler(async ({ data }) => {
		const { getPost } = await import("../../app/lib/posts");

		return {
			post: await getPost(data.slug),
		};
	});
