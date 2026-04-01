/**
 * Standardized Agent Conversation Hook
 * Unified pattern for initializing ElevenLabs agents with proper tool assignment
 */

import { useConversation } from "@elevenlabs/react";
import {
	type AgentKey,
	ELEVENLABS_AGENTS,
} from "@shared/constants/agentConfig";
import { useCallback, useMemo } from "react";
import { useUniversalClientTools } from "~/elevenlabs/providers/ClientToolsProvider";
import type { Suggestion } from "~/stores/types";

interface AgentConversationConfig {
	agentKey: AgentKey;
	getSessionToken: () => string;
	clearSessionToken: () => void;
	onSelectResult?: (suggestion: Suggestion) => Promise<unknown>;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onMessage?: (message: any) => void;
	onUserMessage?: (message: string) => void;
	onTranscription?: (text: string) => void;
	onError?: (error: any) => void;
	textOnly?: boolean;
	overrides?:
		| {
				agent?: {
					language?: string;
				};
		  }
		| undefined;
}

/**
 * Universal hook for creating agent conversations
 * Automatically assigns correct tools and configuration based on agent type
 */
export function useAgentConversation(config: AgentConversationConfig) {
	const {
		agentKey,
		getSessionToken,
		clearSessionToken,
		onSelectResult,
		onMessage,
		onUserMessage,
		onTranscription,
		textOnly = true,
		overrides,
		...eventHandlers
	} = config;

	// Get agent configuration
	const agentConfig = ELEVENLABS_AGENTS[agentKey];

	// Get agent-specific client tools
	const clientTools = useUniversalClientTools(
		agentKey,
		getSessionToken,
		clearSessionToken,
		onSelectResult,
	);

	// Create conversation with agent-specific configuration
	const conversation = useConversation({
		clientTools,
		textOnly,
		onMessage: (message) => {
			onMessage?.(message);
			if ((message.role ?? message.source) === "user") {
				onUserMessage?.(message.message);
				onTranscription?.(message.message);
			}
		},
		...eventHandlers,
	});

	// Enhanced startSession that includes agent-specific configuration
	const startSession = useCallback(
		async (sessionConfig?: {
			textOnly?: boolean;
			overrides?: typeof overrides;
		}) => {
			return conversation.startSession({
				agentId: agentConfig.id,
				connectionType: "websocket",
				textOnly: sessionConfig?.textOnly ?? textOnly,
				overrides: {
					...overrides,
					...sessionConfig?.overrides,
				} as any,
			});
		},
		[conversation, agentConfig.id, textOnly, overrides],
	);

	// Enhanced conversation object with agent metadata
	const enhancedConversation = useMemo(
		() => ({
			...conversation,
			startSession,
			agentKey,
			agentConfig,
			assignedTools: Object.keys(clientTools),
			toolCount: Object.keys(clientTools).length,
		}),
		[conversation, startSession, agentKey, agentConfig, clientTools],
	);

	return enhancedConversation;
}

/**
 * Simplified hook for quick agent initialization with minimal configuration
 */
export function useSimpleAgent(
	agentKey: AgentKey,
	eventHandlers?: {
		onConnect?: () => void;
		onDisconnect?: () => void;
		onMessage?: (message: any) => void;
		onError?: (error: any) => void;
	},
) {
	// Provide default implementations for required callbacks
	const getSessionToken = useCallback(() => "", []);
	const clearSessionToken = useCallback(() => {}, []);

	return useAgentConversation({
		agentKey,
		getSessionToken,
		clearSessionToken,
		textOnly: true,
		...eventHandlers,
	});
}

/**
 * Helper to get agent info without initializing conversation
 */
export function useAgentInfo(agentKey: AgentKey) {
	const agentConfig = ELEVENLABS_AGENTS[agentKey];

	return useMemo(
		() => ({
			...agentConfig,
			agentKey,
			hasTransferCapability: agentConfig.tools.includes("transferToAgent"),
			hasAddressSearch: agentConfig.tools.includes("searchAddress"),
			hasTransferToAgent: agentConfig.tools.includes("transferToAgent"),
			toolCategories: {
				address: agentConfig.tools.filter((tool) =>
					["searchAddress", "selectSuggestion", "getSuggestions"].includes(
						tool,
					),
				).length,
				state: agentConfig.tools.filter((tool) =>
					[
						"getCurrentState",
						"getConfirmedSelection",
						"clearSelection",
					].includes(tool),
				).length,
				interaction: agentConfig.tools.filter((tool) =>
					["confirmUserSelection", "requestManualInput", "getHistory"].includes(
						tool,
					),
				).length,
				services: agentConfig.tools.filter((tool) =>
					["transferToAgent"].includes(tool),
				).length,
			},
		}),
		[agentConfig, agentKey],
	);
}

/**
 * Hook for agent transfer capabilities
 */
export function useAgentTransfer(currentAgentKey: AgentKey) {
	const currentAgent = ELEVENLABS_AGENTS[currentAgentKey];

	const availableTargets = useMemo(() => {
		return Object.entries(ELEVENLABS_AGENTS)
			.filter(([key]) => key !== currentAgentKey)
			.map(([key, agent]) => ({
				agentKey: key as AgentKey,
				transferIndex: agent.transferIndex,
				name: agent.name,
				description: agent.description,
				specializations: agent.specializations,
			}));
	}, [currentAgentKey]);

	const canTransfer = currentAgent.tools.includes("transferToAgent");

	return {
		canTransfer,
		currentAgent,
		availableTargets,
		transferByIndex: (transferIndex: number) => {
			return availableTargets.find(
				(target) => target.transferIndex === transferIndex,
			);
		},
		transferBySpecialization: (specialization: string) => {
			return availableTargets.find((target) =>
				target.specializations.includes(specialization),
			);
		},
	};
}
