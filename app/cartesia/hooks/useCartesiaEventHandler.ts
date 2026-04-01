/**
 * Processes Cartesia agent state updates via Convex real-time subscription.
 *
 * Since Cartesia Line SDK doesn't support custom WebSocket events from
 * loopback tools, we use Convex as a state bridge:
 *   Python tool → Convex mutation → Convex subscription → this hook → Zustand/RQ
 *
 * This mirrors what ElevenLabs client tools do to stores, but triggered by
 * Convex subscription updates instead of local tool execution.
 */

import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useIntentStore } from "~/stores/intentStore";
import { useUIStore } from "~/stores/uiStore";
import type { CartesiaToolUpdate } from "../types";

interface UseCartesiaEventHandlerOptions {
	sessionId: string;
	enabled: boolean;
}

export function useCartesiaEventHandler({
	sessionId,
	enabled,
}: UseCartesiaEventHandlerOptions) {
	const queryClient = useQueryClient();
	const { clearSelectionAndSearch } = useAddressFinderActions();
	const lastVersionRef = useRef(0);

	// Subscribe to Convex for state updates from the Python agent
	const latestUpdate = useQuery(
		api.cartesia.sessionState.getLatestUpdate,
		enabled ? { sessionId } : "skip",
	);

	useEffect(() => {
		lastVersionRef.current = 0;
	}, [sessionId]);

	// Process new updates when the subscription fires
	useEffect(() => {
		if (!latestUpdate || latestUpdate.version <= lastVersionRef.current) {
			return;
		}

		lastVersionRef.current = latestUpdate.version;

		let parsed: CartesiaToolUpdate;
		try {
			parsed = JSON.parse(latestUpdate.data);
			// The updateType from Convex maps to the type field
			if (!parsed.type) {
				(parsed as Record<string, unknown>).type = latestUpdate.updateType;
			}
		} catch {
			console.warn("[CartesiaEventHandler] Failed to parse update data");
			return;
		}

		switch (parsed.type) {
			case "suggestions": {
				queryClient.setQueryData(
					["addressSearch", parsed.query],
					parsed.suggestions,
				);
				useIntentStore.getState().setAgentLastSearchQuery(parsed.query);
				useIntentStore.getState().setActiveSearch({
					query: parsed.query,
					source: "voice",
				});
				useIntentStore.getState().setCurrentIntent(parsed.intent);
				// Clear selection when new search happens
				useIntentStore.getState().setSelectedResult(null);
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
				useUIStore.getState().setSelectionAcknowledged(false);
				break;
			}

			case "selection": {
				useIntentStore.getState().setSelectedResult(parsed.suggestion);
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
				break;
			}

			case "show_options_again": {
				// Re-populate cache with original suggestions and show them
				if (parsed.query && parsed.suggestions) {
					queryClient.setQueryData(
						["addressSearch", parsed.query],
						parsed.suggestions,
					);
					useIntentStore.getState().setAgentLastSearchQuery(parsed.query);
					useIntentStore.getState().setActiveSearch({
						query: parsed.query,
						source: "voice",
					});
				}
				useIntentStore.getState().setSelectedResult(null);
				useUIStore.getState().setShowingOptionsAfterConfirmation(true);
				useUIStore.getState().setSelectionAcknowledged(false);
				break;
			}

			case "selection_acknowledged": {
				const acknowledged =
					"acknowledged" in parsed ? !!parsed.acknowledged : false;
				useUIStore.getState().setSelectionAcknowledged(acknowledged);
				break;
			}

			case "clear": {
				clearSelectionAndSearch();
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
				useUIStore.getState().setSelectionAcknowledged(false);
				break;
			}

			case "request_manual_input": {
				useUIStore.getState().setAgentRequestedManual(true);
				break;
			}
		}
	}, [latestUpdate, queryClient, clearSelectionAndSearch]);
}
