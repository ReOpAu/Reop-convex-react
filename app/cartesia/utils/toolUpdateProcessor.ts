import type { QueryClient } from "@tanstack/react-query";
import { useIntentStore } from "~/stores/intentStore";
import { useUIStore } from "~/stores/uiStore";
import type { CartesiaToolUpdate } from "../types";

type SelectionHandler = (
	suggestion: Extract<CartesiaToolUpdate, { type: "selection" }>["suggestion"],
) => Promise<unknown> | unknown;

export async function processCartesiaToolUpdate({
	update,
	queryClient,
	clearSelectionAndSearch,
	flushAudio,
	handleSelectResult,
}: {
	update: CartesiaToolUpdate;
	queryClient: QueryClient;
	clearSelectionAndSearch: () => void;
	flushAudio?: () => void;
	handleSelectResult?: SelectionHandler;
}): Promise<void> {
	switch (update.type) {
		case "suggestions": {
			queryClient.setQueryData(
				["addressSearch", update.query],
				update.suggestions,
			);
			useIntentStore.getState().setAgentLastSearchQuery(update.query);
			useIntentStore.getState().setActiveSearch({
				query: update.query,
				source: "voice",
			});
			useIntentStore.getState().setCurrentIntent(update.intent);
			useIntentStore.getState().setSelectedResult(null);
			useUIStore.getState().setShowingOptionsAfterConfirmation(false);
			useUIStore.getState().setSelectionAcknowledged(false);
			return;
		}

		case "selection": {
			if (update.query) {
				useIntentStore.getState().setAgentLastSearchQuery(update.query);
			}

			if (handleSelectResult) {
				await handleSelectResult(update.suggestion);
			} else {
				useIntentStore.getState().setSelectedResult(update.suggestion);
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
			}
			return;
		}

		case "show_options_again": {
			queryClient.setQueryData(
				["addressSearch", update.query],
				update.suggestions,
			);
			useIntentStore.getState().setAgentLastSearchQuery(update.query);
			useIntentStore.getState().setActiveSearch({
				query: update.query,
				source: "voice",
			});
			useIntentStore.getState().setCurrentIntent(update.intent);
			useIntentStore.getState().setSelectedResult(null);
			useUIStore.getState().setShowingOptionsAfterConfirmation(true);
			useUIStore.getState().setSelectionAcknowledged(false);
			return;
		}

		case "selection_acknowledged": {
			useUIStore.getState().setSelectionAcknowledged(!!update.acknowledged);
			return;
		}

		case "clear": {
			flushAudio?.();
			clearSelectionAndSearch();
			useUIStore.getState().setShowingOptionsAfterConfirmation(false);
			useUIStore.getState().setSelectionAcknowledged(false);
			return;
		}

		case "request_manual_input": {
			useUIStore.getState().setAgentRequestedManual(true);
			return;
		}
	}
}
