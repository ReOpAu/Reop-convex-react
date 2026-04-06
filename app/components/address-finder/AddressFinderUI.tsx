import {
	AlertTriangle,
	ArrowRight,
	ChevronDown,
	Clock,
	History,
	Search,
} from "lucide-react";
import { useState } from "react";
import {
	HistoryPanel,
	ManualSearchForm,
	SelectedResultCard,
	SuggestionsDisplay,
	VoiceInputController,
} from "~/components/address-finder";
import { PreviousConfirmedSelectionsPanel } from "~/components/address-finder/PreviousConfirmedSelectionsPanel";
import { PreviousSearchesPanel } from "~/components/address-finder/PreviousSearchesPanel";
import SuburbBoundaryMap from "~/components/address-finder/SuburbBoundaryMap";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { RuralConfirmationState } from "~/hooks/actions/types";
import type { AutoCorrectionData } from "~/hooks/useAddressAutoSelection";
import type { VoiceVisualizerSource } from "~/components/address-finder/voice-visualizer/types";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import type { ManualAutocompleteState } from "./ManualSearchForm";

interface AddressFinderUIProps {
	// Handlers from the brain component
	handleSelectResult: (result: Suggestion) => void;
	handleStartRecording: () => void | Promise<void>;
	handleStopRecording: () => void | Promise<void>;
	handleClear: (source: "user" | "agent") => void;
	handleAcceptRuralAddress: () => void;
	handleRecallPreviousSearch: (entry: SearchHistoryEntry) => void;
	handleRecallConfirmedSelection: (entry: AddressSelectionEntry) => void;
	handleManualTyping: (query: string) => void;
	handleManualAutocompleteStateChange?: (
		state: ManualAutocompleteState,
	) => void;
	handleHideOptions: () => void;

	// State from brain (no direct store imports)
	state: {
		suggestions: Suggestion[];
		isLoading: boolean;
		searchQuery: string;
		selectedResult: Suggestion | null;
		currentIntent: LocationIntent;
		isRecording: boolean;
		isVoiceActive: boolean;
		isAgentSpeaking: boolean;
		agentRequestedManual: boolean;
		voiceVisualizer: VoiceVisualizerSource | null;
		history: HistoryItem[];
		searchHistory: SearchHistoryEntry[];
		addressSelections: AddressSelectionEntry[];
		getSessionToken: () => string;
		clearSessionToken: () => void;
	};

	// Computed state
	shouldShowSuggestions: boolean;
	shouldShowManualForm: boolean;
	shouldShowSelectedResult: boolean;
	shouldShowValidationStatus: boolean;
	showLowConfidence: boolean;
	showingOptionsAfterConfirmation: boolean;
	autoCorrection: AutoCorrectionData | null;

	// Validation state
	isValidating: boolean;
	validationError: string | null;
	pendingRuralConfirmation: RuralConfirmationState["pendingRuralConfirmation"];
	conversationStatus: string;
}

export function AddressFinderUI({
	handleSelectResult,
	handleStartRecording,
	handleStopRecording,
	handleClear,
	handleAcceptRuralAddress,
	handleRecallPreviousSearch,
	handleRecallConfirmedSelection,
	handleManualTyping,
	handleManualAutocompleteStateChange,
	handleHideOptions,
	state,
	shouldShowSuggestions,
	shouldShowManualForm,
	shouldShowSelectedResult,
	shouldShowValidationStatus,
	showLowConfidence,
	showingOptionsAfterConfirmation,
	autoCorrection,
	isValidating,
	validationError,
	pendingRuralConfirmation,
	conversationStatus,
}: AddressFinderUIProps) {
	// Destructure state from props (no direct store imports)
	const {
		suggestions,
		isLoading,
		searchQuery,
		selectedResult,
		currentIntent,
		isRecording,
		isVoiceActive,
		isAgentSpeaking,
		agentRequestedManual,
		voiceVisualizer,
		history,
		searchHistory,
		addressSelections,
		getSessionToken,
		clearSessionToken,
	} = state;

	const [showPreviousSearches, setShowPreviousSearches] = useState(false);
	const [showConfirmedSelections, setShowConfirmedSelections] = useState(false);
	const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

	const handleSearchAgain = () => {
		handleClear("user");
	};

	return (
		<div className="container mx-auto py-10 px-4 max-w-3xl">
			{/* Modal overlays */}
			{showConfirmedSelections && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
						<PreviousConfirmedSelectionsPanel
							addressSelections={addressSelections}
							onRecall={(entry) => {
								handleRecallConfirmedSelection(entry);
								setShowConfirmedSelections(false);
							}}
							onClose={() => setShowConfirmedSelections(false)}
						/>
					</div>
				</div>
			)}
			{showPreviousSearches && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
						<PreviousSearchesPanel
							searchHistory={searchHistory}
							onRecall={(entry) => {
								handleRecallPreviousSearch(entry);
								setShowPreviousSearches(false);
							}}
							onClose={() => setShowPreviousSearches(false)}
						/>
					</div>
				</div>
			)}

			<div className="space-y-8">
				{/* Header */}
				<div className="text-center space-y-1">
					<h1 className="text-2xl font-medium text-foreground">
						Address Finder
					</h1>
					<p className="text-sm text-muted-foreground">
						Voice-enabled address search with AI assistance
					</p>
				</div>

				{/* Status bar */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{currentIntent && currentIntent !== "general" && (
							<span className="text-sm text-muted-foreground">
								Searching for: {currentIntent}
							</span>
						)}
					</div>
					{(searchHistory.length > 0 || addressSelections.length > 0) && (
						<div className="flex items-center gap-1">
							{searchHistory.length > 0 && (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setShowPreviousSearches(true)}
									className="text-muted-foreground h-8 px-2"
								>
									<History className="w-3.5 h-3.5 mr-1" />
									<span className="text-xs">{searchHistory.length}</span>
								</Button>
							)}
							{addressSelections.length > 0 && (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setShowConfirmedSelections(true)}
									className="text-muted-foreground h-8 px-2"
								>
									<Clock className="w-3.5 h-3.5 mr-1" />
									<span className="text-xs">{addressSelections.length}</span>
								</Button>
							)}
						</div>
					)}
				</div>

				{/* Rural address confirmation */}
				{pendingRuralConfirmation && (
					<Card className="border-l-4 border-l-amber-400 bg-white shadow-sm">
						<CardContent className="p-5 space-y-3">
							<p className="text-sm font-medium text-gray-900">
								Rural Address Exception
							</p>
							<p className="text-sm text-muted-foreground">
								This address could not be confirmed at the property level but
								appears to be a rural address. Accept it if you are sure this is
								correct.
							</p>
							<div className="text-sm text-muted-foreground space-y-0.5">
								<p>
									{pendingRuralConfirmation.validation.formattedAddress ||
										pendingRuralConfirmation.result.description}
								</p>
								<p className="text-xs">
									Granularity:{" "}
									{pendingRuralConfirmation.validation.validationGranularity}
								</p>
							</div>
							<div className="flex gap-2 pt-1">
								<Button size="sm" onClick={handleAcceptRuralAddress}>
									Accept
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleClear("user")}
								>
									Cancel
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Main input area */}
				<div className="space-y-6">
					<VoiceInputController
						conversationStatus={conversationStatus}
						isRecording={isRecording}
						isVoiceActive={isVoiceActive}
						isAgentSpeaking={isAgentSpeaking}
						agentRequestedManual={agentRequestedManual}
						voiceVisualizer={voiceVisualizer}
						startRecording={handleStartRecording}
						stopRecording={handleStopRecording}
					/>

					<Separator className="bg-gray-100" />

					{shouldShowManualForm ? (
						<div className="space-y-3">
							{agentRequestedManual && (
								<p className="text-xs text-muted-foreground text-center">
									{isRecording
										? "Type while the conversation continues"
										: "Manual input requested by AI"}
								</p>
							)}

							<ManualSearchForm
								onSelect={handleSelectResult}
								disabled={isValidating}
								onTyping={handleManualTyping}
								onAutocompleteStateChange={
									handleManualAutocompleteStateChange
								}
								getSessionToken={getSessionToken}
								clearSessionToken={clearSessionToken}
							/>
						</div>
					) : (
						<p className="text-sm text-muted-foreground text-center py-4">
							Voice conversation is active. The AI will manage suggestions.
						</p>
					)}

					{shouldShowValidationStatus && (
						<div className="py-3">
							{isValidating && (
								<div className="flex items-center justify-center gap-2">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
									<p className="text-sm text-muted-foreground">
										Validating address...
									</p>
								</div>
							)}
							{validationError && (
								<p className="text-sm text-red-600 text-center">
									{validationError}
								</p>
							)}
						</div>
					)}

					{shouldShowSelectedResult && (
						<div className="space-y-4">
							<SelectedResultCard
								result={selectedResult}
								onClear={() => handleClear("user")}
								lat={selectedResult?.lat}
								lng={selectedResult?.lng}
							/>
							{/* Suburb boundary map */}
							{selectedResult &&
								Array.isArray(selectedResult.types) &&
								(selectedResult.types.includes("locality") ||
									selectedResult.types.includes("suburb")) &&
								selectedResult.placeId && (
									<SuburbBoundaryMap
										suburbName={selectedResult.description}
										placeId={selectedResult.placeId}
										mapId="a26a63faa4c27b9388a5618d"
									/>
								)}
						</div>
					)}
				</div>

				{/* Suggestions display */}
				{shouldShowSuggestions && !showLowConfidence && (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Search className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm font-medium text-gray-900">
									{showingOptionsAfterConfirmation
										? "Address Options"
										: "Suggestions"}
								</span>
								<span className="text-xs text-muted-foreground">
									{suggestions.length} results
								</span>
							</div>
							{showingOptionsAfterConfirmation && (
								<Button
									size="sm"
									variant="ghost"
									onClick={handleHideOptions}
									className="text-muted-foreground h-7 text-xs"
								>
									Hide
								</Button>
							)}
						</div>
						{showingOptionsAfterConfirmation && (
							<p className="text-xs text-muted-foreground">
								Select a different option from your previous search
							</p>
						)}
						<SuggestionsDisplay
							suggestions={suggestions}
							onSelect={handleSelectResult}
							isLoading={isLoading}
							isError={false}
							error={null}
						/>
					</div>
				)}

				{/* Low confidence / auto-correction section */}
				{shouldShowSuggestions && showLowConfidence && (
					<Card
						className={`bg-white shadow-sm border-l-4 ${
							autoCorrection?.suburbChanged
								? "border-l-blue-400"
								: "border-l-amber-400"
						}`}
					>
						<CardContent className="p-5 space-y-4">
							{/* Title */}
							<div className="flex items-center gap-2">
								{autoCorrection?.suburbChanged ? (
									<>
										<ArrowRight className="w-4 h-4 text-blue-500" />
										<span className="text-sm font-medium text-gray-900">
											Address Corrected
										</span>
									</>
								) : (
									<>
										<AlertTriangle className="w-4 h-4 text-amber-500" />
										<span className="text-sm font-medium text-gray-900">
											Uncertain Match
										</span>
										<span className="text-xs text-muted-foreground">
											{Math.round((suggestions[0]?.confidence ?? 0) * 100)}%
											confidence
										</span>
									</>
								)}
							</div>

							{/* Compact comparison */}
							<div className="space-y-2 text-sm">
								<div className="flex items-baseline gap-2">
									<span className="text-muted-foreground flex-shrink-0">
										You searched:
									</span>
									<span className="text-gray-900">"{searchQuery}"</span>
									{autoCorrection?.suburbChanged && (
										<span className="text-xs text-muted-foreground">
											({autoCorrection.originalSuburb})
										</span>
									)}
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-muted-foreground flex-shrink-0">
										Best match:
									</span>
									<button
										type="button"
										onClick={() => handleSelectResult(suggestions[0])}
										className="text-gray-900 font-medium hover:underline underline-offset-2 text-left"
									>
										{suggestions[0]?.description}
									</button>
									{autoCorrection?.suburbChanged && (
										<span className="text-xs text-green-600">
											({autoCorrection.correctedSuburb})
										</span>
									)}
								</div>
							</div>

							{autoCorrection?.suburbChanged && (
								<p className="text-xs text-muted-foreground">
									The suburb was corrected from {autoCorrection.originalSuburb}{" "}
									to {autoCorrection.correctedSuburb}.
								</p>
							)}

							{/* Toggleable analysis details */}
							{!autoCorrection?.suburbChanged && (
								<div>
									<button
										type="button"
										onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
										className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
									>
										<ChevronDown
											className={`w-3 h-3 transition-transform duration-200 ${showAnalysisDetails ? "rotate-180" : ""}`}
										/>
										{showAnalysisDetails ? "Hide details" : "Why uncertain?"}
									</button>
									{showAnalysisDetails && (
										<div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
											{currentIntent &&
												currentIntent !== suggestions[0]?.resultType && (
													<p>
														You searched for a {currentIntent}, but the result
														appears to be a {suggestions[0]?.resultType}.
													</p>
												)}
											{searchQuery &&
												suggestions[0]?.description &&
												!suggestions[0].description
													.toLowerCase()
													.includes(
														searchQuery.toLowerCase().substring(0, 3),
													) && (
													<p>
														Your search terms do not closely match this result.
													</p>
												)}
											{isRecording && (
												<p>
													Voice transcription may have misunderstood your input.
												</p>
											)}
											{suggestions[0]?.types?.some((type) =>
												[
													"restaurant",
													"store",
													"hospital",
													"school",
													"point_of_interest",
												].includes(type),
											) &&
												currentIntent !== "general" && (
													<p>
														This appears to be a business rather than a
														geographic location.
													</p>
												)}
										</div>
									)}
								</div>
							)}

							{/* Action buttons */}
							<div className="flex gap-2 pt-1">
								{autoCorrection?.suburbChanged ? (
									<>
										<Button
											size="sm"
											onClick={() => handleSelectResult(suggestions[0])}
										>
											Accept Correction
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={handleSearchAgain}
										>
											Search Again
										</Button>
									</>
								) : (
									<>
										<Button
											size="sm"
											onClick={() => handleSelectResult(suggestions[0])}
										>
											Use This
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={handleSearchAgain}
										>
											Try Again
										</Button>
									</>
								)}
							</div>

							{/* Single-line tip */}
							{isRecording && (
								<p className="text-xs text-muted-foreground">
									Try speaking more clearly or use the manual input.
								</p>
							)}
						</CardContent>
					</Card>
				)}

				{/* History panel */}
				<HistoryPanel history={history} />
			</div>
		</div>
	);
}
