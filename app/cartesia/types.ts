import type { LocationIntent, Suggestion } from "~/stores/types";

// --- WebSocket Protocol Types (Cartesia Calls API) ---

export type CartesiaConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

/** Client → Server events use "event" field */
export interface CartesiaStartEvent {
	event: "start";
	config: {
		input_format: "pcm_44100";
	};
	metadata?: Record<string, unknown>;
}

export interface CartesiaMediaInputEvent {
	event: "media_input";
	stream_id?: string;
	media: {
		payload: string; // base64-encoded PCM audio
	};
}

export interface CartesiaClientCustomEvent {
	event: "custom";
	stream_id?: string;
	metadata: Record<string, unknown>;
}

export type CartesiaClientEvent =
	| CartesiaStartEvent
	| CartesiaMediaInputEvent
	| CartesiaClientCustomEvent;

/** Server → Client events use "event" field */
export interface CartesiaAckEvent {
	event: "ack";
	stream_id?: string;
}

export interface CartesiaMediaOutputEvent {
	event: "media_output";
	media: {
		payload: string; // base64-encoded PCM audio
	};
}

export interface CartesiaClearEvent {
	event: "clear";
}

export type CartesiaServerEvent =
	| CartesiaAckEvent
	| CartesiaMediaOutputEvent
	| CartesiaClearEvent;

// --- Tool Update Payloads (from Convex subscription state bridge) ---

export interface SuggestionsUpdate {
	type: "suggestions";
	query: string;
	intent: LocationIntent;
	suggestions: Suggestion[];
}

export interface SelectionUpdate {
	type: "selection";
	suggestion: Suggestion;
	query?: string;
}

export interface ShowOptionsAgainUpdate {
	type: "show_options_again";
	query: string;
	intent: LocationIntent;
	suggestions: Suggestion[];
}

export interface SelectionAcknowledgedUpdate {
	type: "selection_acknowledged";
	acknowledged: boolean;
}

export interface ClearUpdate {
	type: "clear";
}

export interface RequestManualInputUpdate {
	type: "request_manual_input";
	reason: string;
}

export type CartesiaToolUpdate =
	| SuggestionsUpdate
	| SelectionUpdate
	| ShowOptionsAgainUpdate
	| SelectionAcknowledgedUpdate
	| ClearUpdate
	| RequestManualInputUpdate;
