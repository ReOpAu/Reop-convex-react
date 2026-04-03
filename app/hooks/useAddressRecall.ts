import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAgentSync } from "~/elevenlabs/hooks/useAgentSync";
import { searchAddressApi } from "~/services/address-api.client";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useIntentStore } from "~/stores/intentStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { LocationIntent, Mode, Suggestion } from "~/stores/types";

export function useAddressRecall() {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();
	const { setApiResults } = useApiStore();
	const {
		setActiveSearch,
		setCurrentIntent,
		setAgentLastSearchQuery,
		setSelectedResult,
	} = useIntentStore();

	const [isRecallMode, setIsRecallMode] = useState(false);
	const [preserveIntent, setPreserveIntent] = useState<LocationIntent | null>(
		null,
	);

	const handleRecallPreviousSearch = useCallback(
		async (entry: SearchHistoryEntry) => {
			setActiveSearch({ query: entry.query, source: entry.context.mode });
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.query);
			setSelectedResult(null);
			setIsRecallMode(true);

			// Trigger a new search API call for the recalled query
			const newResults = await searchAddressApi({
				query: entry.query,
				intent: entry.context.intent as
					| "general"
					| "suburb"
					| "street"
					| "address"
					| undefined,
				isAutocomplete: false,
				sessionToken: undefined,
			});

			setApiResults({
				suggestions: newResults.success ? newResults.suggestions : [],
				isLoading: false,
				error: newResults.success ? null : newResults.error,
				source: entry.context.mode,
			});

			queryClient.setQueryData(
				["addressSearch", entry.query],
				newResults.success ? newResults.suggestions : [],
			);

			syncToAgent();
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
		],
	);

	const handleRecallConfirmedSelection = useCallback(
		(entry: AddressSelectionEntry) => {
			setActiveSearch({
				query: entry.originalQuery,
				source: entry.context.mode as Mode,
			});
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.originalQuery);
			setPreserveIntent(entry.context.intent as LocationIntent);
			setApiResults({
				suggestions: [entry.selectedAddress],
				isLoading: false,
				error: null,
				source: entry.context.mode as Mode,
			});
			setSelectedResult(entry.selectedAddress);
			// IMPORTANT: Don't overwrite the original suggestions cache
			// Keep the original search results for "show options again" functionality
			// Only set the cache if it doesn't already exist with multiple suggestions
			const existingSuggestions = queryClient.getQueryData<Suggestion[]>([
				"addressSearch",
				entry.originalQuery,
			]);
			if (!existingSuggestions || existingSuggestions.length <= 1) {
				// Only set if cache is empty or has single result
				queryClient.setQueryData(
					["addressSearch", entry.originalQuery],
					[entry.selectedAddress],
				);
			}
			setIsRecallMode(true);
			syncToAgent();
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
		],
	);

	const resetRecallMode = useCallback(() => {
		setIsRecallMode(false);
		setPreserveIntent(null);
	}, []);

	return {
		isRecallMode,
		preserveIntent,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		resetRecallMode,
		setPreserveIntent,
	};
}
