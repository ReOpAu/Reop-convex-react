import { useIntentStore } from "~/stores/intentStore";
import { useUIStore } from "~/stores/uiStore";
import type { ActionContext } from "./types";

/**
 * Factory function that creates clear action handlers.
 * Takes a context object and returns the clear actions.
 */
export function createClearActions(ctx: ActionContext) {
	/**
	 * Unified clear flow that clears selection, search, and notifies the agent.
	 */
	const handleClear = (context: "user" | "agent" = "user"): void => {
		ctx.log(`🗑️ === UNIFIED CLEAR FLOW START (context: ${context}) ===`);
		const { searchQuery } = useIntentStore.getState();

		if (searchQuery) {
			ctx.queryClient.removeQueries({
				queryKey: ["addressSearch", searchQuery],
				exact: true,
			});
			ctx.log("🔧 Cleared React Query cache for:", searchQuery);
		}

		ctx.clearSelectionAndSearch();
		useUIStore.getState().setSelectionAcknowledged(false);
		ctx.addHistory({ type: context, text: "State cleared." });
		ctx.log("✅ ALL STATE CLEARED");

		// Explicitly notify the agent if a conversation is active
		if (
			ctx.isRecording &&
			ctx.conversationRef.current?.status === "connected"
		) {
			const clearMessage =
				"I have cleared my previous selection and am ready to continue.";
			ctx.log("🗨️ SENDING CLEAR MESSAGE TO AGENT:", clearMessage);
			try {
				ctx.conversationRef.current?.sendUserMessage?.(clearMessage);
				ctx.log("✅ Clear message sent to agent successfully");
				ctx.addHistory({
					type: "system",
					text: "Notified agent about state clear",
				});
			} catch (error) {
				ctx.log("❌ Failed to send clear message to agent:", error);
				ctx.addHistory({
					type: "system",
					text: `Failed to notify agent of clear: ${error}`,
				});
			}
		}

		ctx.performReliableSync("clear").catch((error) => {
			ctx.log("❌ Sync failed after clear:", error);
		});
		ctx.log("🔄 SYNC WITH AGENT INITIATED");

		ctx.log("🗑️ === UNIFIED CLEAR FLOW END ===");
	};

	return {
		handleClear,
	};
}
