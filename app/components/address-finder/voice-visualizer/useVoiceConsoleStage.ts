import { useEffect, useMemo, useRef, useState } from "react";
import type { VoiceConsoleStage } from "./types";

const AGENT_WAIT_WINDOW_MS = 1800;

interface UseVoiceConsoleStageOptions {
	conversationStatus: string;
	isRecording: boolean;
	isVoiceActive: boolean;
	isAgentSpeaking: boolean;
	agentRequestedManual: boolean;
}

export function useVoiceConsoleStage({
	conversationStatus,
	isRecording,
	isVoiceActive,
	isAgentSpeaking,
	agentRequestedManual,
}: UseVoiceConsoleStageOptions) {
	const [isAwaitingAgent, setIsAwaitingAgent] = useState(false);
	const wasVoiceActiveRef = useRef(isVoiceActive);
	const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (waitTimerRef.current) {
			clearTimeout(waitTimerRef.current);
			waitTimerRef.current = null;
		}

		const wasVoiceActive = wasVoiceActiveRef.current;
		wasVoiceActiveRef.current = isVoiceActive;

		if (
			!isRecording ||
			conversationStatus !== "connected" ||
			isAgentSpeaking ||
			agentRequestedManual
		) {
			setIsAwaitingAgent(false);
			return;
		}

		if (wasVoiceActive && !isVoiceActive) {
			setIsAwaitingAgent(true);
			waitTimerRef.current = setTimeout(() => {
				setIsAwaitingAgent(false);
				waitTimerRef.current = null;
			}, AGENT_WAIT_WINDOW_MS);
		}

		return () => {
			if (waitTimerRef.current) {
				clearTimeout(waitTimerRef.current);
				waitTimerRef.current = null;
			}
		};
	}, [
		agentRequestedManual,
		conversationStatus,
		isAgentSpeaking,
		isRecording,
		isVoiceActive,
	]);

	const stage = useMemo<VoiceConsoleStage>(() => {
		if (conversationStatus === "error") {
			return "error";
		}

		if (conversationStatus === "connecting") {
			return "connecting";
		}

		if (isAgentSpeaking) {
			return "agent-speaking";
		}

		if (isVoiceActive) {
			return "user-speaking";
		}

		if (agentRequestedManual && isRecording) {
			return "manual-live";
		}

		if (isAwaitingAgent && isRecording) {
			return "thinking";
		}

		if (isRecording && conversationStatus === "connected") {
			return "ready";
		}

		return "idle";
	}, [
		agentRequestedManual,
		conversationStatus,
		isAgentSpeaking,
		isAwaitingAgent,
		isRecording,
		isVoiceActive,
	]);

	return {
		stage,
		isAwaitingAgent,
	};
}
