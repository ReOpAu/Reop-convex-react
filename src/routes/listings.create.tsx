import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { CreateListingForm } from "~/features/listings/components/forms/CreateListingForm";
import { loadRequiredAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/listings/create")({
	loader: async () => {
		const authState = await loadRequiredAuthState();
		if (!authState.userId) {
			throw redirect({ to: "/sign-in" });
		}

		return { isSignedIn: true };
	},
	component: CreateListingRoute,
});

function CreateListingRoute() {
	const loaderData = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();

	return (
		<PublicLayout loaderData={loaderData}>
			<div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<CreateListingForm
					onSuccess={() => navigate({ to: "/listings/my-listings" })}
					onCancel={() => router.history.back()}
				/>
			</div>
		</PublicLayout>
	);
}
