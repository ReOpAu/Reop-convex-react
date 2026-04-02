import {
	Link as TanStackLink,
	Outlet,
	redirect as tanStackRedirect,
	useLoaderData as useTanStackLoaderData,
	useLocation,
	useNavigate as useTanStackNavigate,
	useParams as useTanStackParams,
	useRouter,
} from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useCallback } from "react";

type CompatLinkProps = ComponentProps<typeof TanStackLink> & {
	prefetch?: "intent" | "viewport" | "render" | false;
};

export function Link({ prefetch, preload, ...props }: CompatLinkProps) {
	return <TanStackLink preload={preload ?? prefetch} {...props} />;
}

export { Outlet, useLocation };

export function redirect(
	to:
		| string
		| {
				to?: string;
				href?: string;
				[key: string]: unknown;
		  },
) {
	if (typeof to === "string") {
		return tanStackRedirect({ to });
	}

	return tanStackRedirect(to);
}

export function useParams() {
	return useTanStackParams({ strict: false });
}

export function useLoaderData() {
	return (useTanStackLoaderData as any)({ strict: false });
}

export function useNavigate() {
	const navigate = useTanStackNavigate();
	const router = useRouter();

	return useCallback(
		(to: number | string | { to?: string; [key: string]: unknown }) => {
			if (typeof to === "number") {
				if (to === -1) {
					router.history.back();
					return;
				}

				if (to === 1) {
					router.history.forward();
					return;
				}

				throw new Error("Only navigate(-1) and navigate(1) are supported.");
			}

			if (typeof to === "string") {
				return navigate({ to });
			}

			return navigate(to);
		},
		[navigate, router],
	);
}
