export const EMPTY_FREQUENCY_DATA = new Uint8Array(new ArrayBuffer(0));

export interface VoiceVisualizerSource {
	provider: "cartesia" | "elevenlabs";
	supportsInputAnalyser: boolean;
	supportsOutputAnalyser: boolean;
	getInputByteFrequencyData: () => Uint8Array;
	getOutputByteFrequencyData: () => Uint8Array;
	getInputLevel?: () => number;
	getOutputLevel?: () => number;
}

export type VoiceConsoleStage =
	| "idle"
	| "connecting"
	| "ready"
	| "user-speaking"
	| "thinking"
	| "agent-speaking"
	| "manual-live"
	| "error";
