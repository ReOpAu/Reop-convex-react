import { getAuth } from "@clerk/react-router/server";
import { redirect } from "react-router";
import { AddressFinderUI } from "~/components/address-finder/AddressFinderUI";
import { CartesiaAddressFinderBrain } from "~/components/address-finder/CartesiaAddressFinderBrain";
import { PublicLayout } from "~/components/layout/PublicLayout";
import type { Route } from "./+types/address-finder-cartesia";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	if (!userId) {
		throw redirect("/sign-in");
	}

	return { isSignedIn: true };
}

export default function AddressFinderCartesia({
	loaderData,
}: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<CartesiaAddressFinderBrain>
				{(handlers) => (
					<AddressFinderUI
						handleSelectResult={handlers.handleSelectResult}
						handleStartRecording={handlers.handleStartRecording}
						handleStopRecording={handlers.handleStopRecording}
						handleClear={handlers.handleClear}
						handleAcceptRuralAddress={handlers.handleAcceptRuralAddress}
						handleRecallPreviousSearch={handlers.handleRecallPreviousSearch}
						handleRecallConfirmedSelection={
							handlers.handleRecallConfirmedSelection
						}
						handleManualTyping={handlers.handleManualTyping}
						handleHideOptions={handlers.handleHideOptions}
						state={handlers.state}
						shouldShowSuggestions={handlers.shouldShowSuggestions}
						shouldShowManualForm={handlers.shouldShowManualForm}
						shouldShowSelectedResult={handlers.shouldShowSelectedResult}
						shouldShowValidationStatus={handlers.shouldShowValidationStatus}
						showLowConfidence={handlers.showLowConfidence}
						showingOptionsAfterConfirmation={
							handlers.showingOptionsAfterConfirmation
						}
						autoCorrection={handlers.autoCorrection}
						isValidating={handlers.isValidating}
						validationError={handlers.validationError}
						pendingRuralConfirmation={handlers.pendingRuralConfirmation}
					/>
				)}
			</CartesiaAddressFinderBrain>
		</PublicLayout>
	);
}
