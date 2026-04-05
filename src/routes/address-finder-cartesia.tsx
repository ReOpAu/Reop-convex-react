import { createFileRoute } from "@tanstack/react-router";
import { AddressFinderUI } from "~/components/address-finder/AddressFinderUI";
import { CartesiaAddressFinderBrain } from "~/components/address-finder/CartesiaAddressFinderBrain";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { loadOptionalAuthState } from "../lib/legacy-route-data";

export const Route = createFileRoute("/address-finder-cartesia")({
	head: () => ({
		meta: [{ title: "Cartesia" }],
	}),
	loader: () => loadOptionalAuthState(),
	component: AddressFinderCartesia,
});

function AddressFinderCartesia() {
	const loaderData = Route.useLoaderData();

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
						handleManualAutocompleteStateChange={
							handlers.handleManualAutocompleteStateChange
						}
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
						conversationStatus={handlers.conversationStatus}
					/>
				)}
			</CartesiaAddressFinderBrain>
		</PublicLayout>
	);
}
