import { getAuth } from "@clerk/react-router/server";
import { redirect, useNavigate } from "react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { CreateListingForm } from "~/features/listings/components/forms/CreateListingForm";
import type { Route } from "./+types/create";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	if (!userId) {
		throw redirect("/sign-in");
	}
	return {
		isSignedIn: true,
	};
}

export default function CreateListingRoute({
	loaderData,
}: Route.ComponentProps) {
	const navigate = useNavigate();

	const handleSuccess = (listingId: string) => {
		navigate("/listings/my-listings");
	};

	const handleCancel = () => {
		navigate(-1);
	};

	return (
		<PublicLayout loaderData={loaderData}>
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<CreateListingForm onSuccess={handleSuccess} onCancel={handleCancel} />
			</div>
		</PublicLayout>
	);
}
