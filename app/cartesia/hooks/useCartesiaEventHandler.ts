/**
 * Processes Cartesia agent state updates via the Convex real-time subscription.
 *
 * Since Cartesia Line tools run server-side, the browser mirrors ElevenLabs'
 * client-tool state transitions by replaying bridged updates into the same
 * cache/store selection pipeline.
 */

import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import type { Suggestion } from "~/stores/types";
import type { CartesiaToolUpdate } from "../types";
import { processCartesiaToolUpdate } from "../utils/toolUpdateProcessor";

interface UseCartesiaEventHandlerOptions {
	sessionId: string;
	enabled: boolean;
	anonymousOwnerToken?: string | null;
	flushAudio?: () => void;
	handleSelectResult?: (suggestion: Suggestion) => Promise<unknown> | unknown;
}

export function useCartesiaEventHandler({
	sessionId,
	enabled,
	anonymousOwnerToken,
	flushAudio,
	handleSelectResult,
}: UseCartesiaEventHandlerOptions) {
	const queryClient = useQueryClient();
	const { clearSelectionAndSearch } = useAddressFinderActions();
	const lastVersionRef = useRef(0);
	const processingRef = useRef<Promise<void>>(Promise.resolve());

	const latestUpdate = useQuery(
		api.cartesia.sessionState.getLatestUpdate,
		enabled
			? {
					sessionId,
					anonymousOwnerToken: anonymousOwnerToken ?? undefined,
				}
			: "skip",
	);

	useEffect(() => {
		lastVersionRef.current = 0;
		processingRef.current = Promise.resolve();
	}, [sessionId]);

	useEffect(() => {
		if (!latestUpdate || latestUpdate.version <= lastVersionRef.current) {
			return;
		}

		lastVersionRef.current = latestUpdate.version;

		let parsed: CartesiaToolUpdate;
		try {
			parsed = JSON.parse(latestUpdate.data);
			if (!parsed.type) {
				(parsed as Record<string, unknown>).type = latestUpdate.updateType;
			}
		} catch {
			console.warn("[CartesiaEventHandler] Failed to parse update data");
			return;
		}

		processingRef.current = processingRef.current
			.catch(() => {})
			.then(() =>
				processCartesiaToolUpdate({
					update: parsed,
					queryClient,
					clearSelectionAndSearch,
					flushAudio,
					handleSelectResult,
				}),
			)
			.catch((error) => {
				console.error("[CartesiaEventHandler] Failed to process update", error);
			});
	}, [
		anonymousOwnerToken,
		clearSelectionAndSearch,
		flushAudio,
		handleSelectResult,
		latestUpdate,
		queryClient,
	]);
}
