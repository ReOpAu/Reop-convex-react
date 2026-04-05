import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import parityCases from "./fixtures/cartesia-intent-parity.json";
import { AudioPlayer } from "../app/cartesia/utils/audioPlayer";
import {
	type CartesiaWebSocketLike,
	CartesiaConversationController,
} from "../app/cartesia/utils/conversationController";
import {
	CARTESIA_MIC_CAPTURE_PROCESSOR_NAME,
	createCartesiaMicCaptureWorkletSource,
	loadCartesiaMicCaptureWorklet,
} from "../app/cartesia/utils/micCaptureWorklet";
import { processCartesiaToolUpdate } from "../app/cartesia/utils/toolUpdateProcessor";
import { useAddressSelectionStore } from "../app/stores/addressSelectionStore";
import { useApiStore } from "../app/stores/apiStore";
import { useHistoryStore } from "../app/stores/historyStore";
import { useIntentStore } from "../app/stores/intentStore";
import { useSearchHistoryStore } from "../app/stores/searchHistoryStore";
import { useUIStore } from "../app/stores/uiStore";
import { classifyLocationIntent } from "../shared/utils/intentClassification";

if (typeof globalThis.atob !== "function") {
	globalThis.atob = (value: string) =>
		Buffer.from(value, "base64").toString("binary");
}

if (typeof globalThis.btoa !== "function") {
	globalThis.btoa = (value: string) =>
		Buffer.from(value, "binary").toString("base64");
}

function resetStores() {
	useIntentStore.getState().resetIntentState();
	useUIStore.getState().resetUiState();
	useApiStore.getState().resetApiState();
	useHistoryStore.getState().resetHistoryState();
	useSearchHistoryStore.getState().clearSearchHistory();
	useAddressSelectionStore.getState().clearAddressSelections();
}

function clearSelectionAndSearch() {
	useIntentStore.getState().resetIntentState();
	useApiStore.getState().resetApiState();
}

class FakeTimers {
	private nextId = 1;
	private tasks = new Map<number, () => void>();

	setTimeout = (callback: () => void, _delay?: number) => {
		const id = this.nextId++;
		this.tasks.set(id, callback);
		return id as unknown as ReturnType<typeof setTimeout>;
	};

	clearTimeout = (id: ReturnType<typeof setTimeout>) => {
		this.tasks.delete(id as unknown as number);
	};

	setInterval = (callback: () => void, _delay?: number) => {
		const id = this.nextId++;
		this.tasks.set(id, callback);
		return id as unknown as ReturnType<typeof setInterval>;
	};

	clearInterval = (id: ReturnType<typeof setInterval>) => {
		this.tasks.delete(id as unknown as number);
	};

	get pendingCount() {
		return this.tasks.size;
	}

	runAll() {
		const pending = [...this.tasks.entries()];
		this.tasks.clear();
		for (const [, callback] of pending) {
			callback();
		}
	}
}

function getTimerOverrides(timers: FakeTimers) {
	return {
		setTimeoutFn: timers.setTimeout as unknown as typeof setTimeout,
		clearTimeoutFn: timers.clearTimeout as unknown as typeof clearTimeout,
		setIntervalFn: timers.setInterval as unknown as typeof setInterval,
		clearIntervalFn: timers.clearInterval as unknown as typeof clearInterval,
	};
}

class MockWebSocket implements CartesiaWebSocketLike {
	readyState = 0;
	onopen: ((event: Event) => void) | null = null;
	onmessage: ((event: MessageEvent<string>) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	sent: string[] = [];

	constructor(public readonly url: string) {}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		if (this.readyState === 3) {
			return;
		}
		this.readyState = 3;
		this.onclose?.({} as CloseEvent);
	}

	open(): void {
		this.readyState = 1;
		this.onopen?.({} as Event);
	}

	message(payload: unknown): void {
		this.onmessage?.({
			data: JSON.stringify(payload),
		} as MessageEvent<string>);
	}

	error(): void {
		this.onerror?.({} as Event);
	}
}

class FakeAudioBuffer {
	private readonly channels: Float32Array[];

	constructor(
		public readonly numberOfChannels: number,
		public readonly length: number,
		public readonly sampleRate: number,
	) {
		this.channels = [new Float32Array(length)];
	}

	get duration() {
		return this.length / this.sampleRate;
	}

	getChannelData(channel: number) {
		return this.channels[channel]!;
	}
}

class FakeAudioBufferSourceNode {
	buffer: FakeAudioBuffer | null = null;
	onended: (() => void) | null = null;
	startCalls = 0;
	stopCalls = 0;

	connect(): void {}

	disconnect(): void {}

	start(): void {
		this.startCalls += 1;
	}

	stop(): void {
		this.stopCalls += 1;
	}
}

class FakeAudioContext {
	static lastSource: FakeAudioBufferSourceNode | null = null;
	state: AudioContextState = "running";
	currentTime = 0;
	destination = {} as AudioDestinationNode;

	createBuffer(
		numberOfChannels: number,
		length: number,
		sampleRate: number,
	): AudioBuffer {
		return new FakeAudioBuffer(
			numberOfChannels,
			length,
			sampleRate,
		) as unknown as AudioBuffer;
	}

	createBufferSource(): AudioBufferSourceNode {
		const source = new FakeAudioBufferSourceNode();
		FakeAudioContext.lastSource = source;
		return source as unknown as AudioBufferSourceNode;
	}

	async resume(): Promise<void> {}

	async close(): Promise<void> {}
}

test("shared intent classifier matches the Cartesia parity fixture", () => {
	for (const { query, intent } of parityCases) {
		assert.equal(classifyLocationIntent(query), intent, query);
	}
});

test("Cartesia mic capture worklet loads through an object URL and revokes it", async () => {
	const createdBlobs: Blob[] = [];
	let addedUrl: string | null = null;
	let revokedUrl: string | null = null;

	await loadCartesiaMicCaptureWorklet(
		{
			addModule: async (moduleUrl: string) => {
				addedUrl = moduleUrl;
			},
		},
		{
			createObjectURL: (blob: Blob) => {
				createdBlobs.push(blob);
				return "blob:cartesia-mic-worklet";
			},
			revokeObjectURL: (moduleUrl: string) => {
				revokedUrl = moduleUrl;
			},
		},
	);

	assert.equal(addedUrl, "blob:cartesia-mic-worklet");
	assert.equal(revokedUrl, "blob:cartesia-mic-worklet");
	assert.equal(createdBlobs.length, 1);
	assert.match(
		createCartesiaMicCaptureWorkletSource(),
		new RegExp(CARTESIA_MIC_CAPTURE_PROCESSOR_NAME),
	);
});

test("Cartesia selection updates use the provided validated selection pipeline", async () => {
	resetStores();
	const queryClient = new QueryClient();
	let pipelineCalls = 0;

	await processCartesiaToolUpdate({
		update: {
			type: "selection",
			query: "18 Smith Street",
			suggestion: {
				description: "18 Smith Street",
				placeId: "place_18_smith",
			},
		},
		queryClient,
		clearSelectionAndSearch,
		handleSelectResult: async (suggestion) => {
			pipelineCalls += 1;
			useIntentStore.getState().setSelectedResult({
				...suggestion,
				description: "18 Smith Street, Fitzroy VIC 3065",
			});
		},
	});

	assert.equal(pipelineCalls, 1);
	assert.equal(
		useIntentStore.getState().agentLastSearchQuery,
		"18 Smith Street",
	);
	assert.equal(
		useIntentStore.getState().selectedResult?.description,
		"18 Smith Street, Fitzroy VIC 3065",
	);
});

test("Cartesia clear updates flush playback and reset state", async () => {
	resetStores();
	const queryClient = new QueryClient();
	let flushCount = 0;

	useIntentStore.getState().setActiveSearch({
		query: "Collins Street",
		source: "voice",
	});
	useIntentStore.getState().setSelectedResult({
		description: "18 Collins Street",
		placeId: "place_18_collins",
	});
	useUIStore.getState().setShowingOptionsAfterConfirmation(true);
	useUIStore.getState().setSelectionAcknowledged(true);

	await processCartesiaToolUpdate({
		update: { type: "clear" },
		queryClient,
		clearSelectionAndSearch,
		flushAudio: () => {
			flushCount += 1;
		},
	});

	assert.equal(flushCount, 1);
	assert.equal(useIntentStore.getState().searchQuery, "");
	assert.equal(useIntentStore.getState().selectedResult, null);
	assert.equal(useUIStore.getState().showingOptionsAfterConfirmation, false);
	assert.equal(useUIStore.getState().selectionAcknowledged, false);
});

test("Cartesia controller waits for ack before media capture becomes usable", async () => {
	resetStores();
	const timers = new FakeTimers();
	const sockets: MockWebSocket[] = [];
	const statuses: string[] = [];

	const controller = new CartesiaConversationController({
		agentId: "agent_test",
		cartesiaVersion: "2025-04-16",
		getAuthToken: async () => "token_123",
		onStatusChange: (status) => {
			statuses.push(status);
		},
		onStreamIdChange: () => {},
		createWebSocket: (url) => {
			const socket = new MockWebSocket(url);
			sockets.push(socket);
			return socket;
		},
		...getTimerOverrides(timers),
	});

	const startPromise = controller.startSession("session_123");
	let settled = false;
	void startPromise.then(
		() => {
			settled = true;
		},
		() => {
			settled = true;
		},
	);

	await Promise.resolve();
	assert.equal(settled, false);
	assert.equal(controller.sendMediaInput("pcm_before_ack"), false);

	const socket = sockets[0]!;
	assert.match(socket.url, /access_token=token_123/);
	socket.open();
	assert.equal(settled, false);
	assert.equal(socket.sent.length, 1);
	assert.match(socket.sent[0]!, /"event":"start"/);
	assert.equal(controller.sendMediaInput("pcm_before_stream"), false);

	socket.message({ event: "ack", stream_id: "stream_abc" });
	await startPromise;

	assert.equal(controller.getStatus(), "connected");
	assert.equal(controller.getStreamId(), "stream_abc");
	assert.equal(controller.sendMediaInput("pcm_after_ack"), true);
	assert.match(socket.sent[1]!, /"stream_id":"stream_abc"/);
	assert.deepEqual(statuses, ["connecting", "connected"]);
});

test("Cartesia controller binds default timers to globalThis", async () => {
	const originalSetTimeout = globalThis.setTimeout;
	const originalClearTimeout = globalThis.clearTimeout;
	const originalSetInterval = globalThis.setInterval;
	const originalClearInterval = globalThis.clearInterval;
	const sockets: MockWebSocket[] = [];
	let setTimeoutCalled = 0;
	let setIntervalCalled = 0;

	const timerHost = {
		setTimeout(
			this: typeof globalThis,
			callback: () => void,
			_delay?: number,
		) {
			assert.equal(this, globalThis);
			setTimeoutCalled += 1;
			return originalSetTimeout(callback, 0);
		},
		clearTimeout(this: typeof globalThis, id: ReturnType<typeof setTimeout>) {
			assert.equal(this, globalThis);
			return originalClearTimeout(id);
		},
		setInterval(
			this: typeof globalThis,
			callback: () => void,
			_delay?: number,
		) {
			assert.equal(this, globalThis);
			setIntervalCalled += 1;
			return originalSetInterval(callback, 0);
		},
		clearInterval(this: typeof globalThis, id: ReturnType<typeof setInterval>) {
			assert.equal(this, globalThis);
			return originalClearInterval(id);
		},
	};

	(globalThis as typeof globalThis & { setTimeout: typeof setTimeout }).setTimeout =
		timerHost.setTimeout as typeof setTimeout;
	(globalThis as typeof globalThis & { clearTimeout: typeof clearTimeout }).clearTimeout =
		timerHost.clearTimeout as typeof clearTimeout;
	(globalThis as typeof globalThis & { setInterval: typeof setInterval }).setInterval =
		timerHost.setInterval as typeof setInterval;
	(globalThis as typeof globalThis & { clearInterval: typeof clearInterval }).clearInterval =
		timerHost.clearInterval as typeof clearInterval;

	try {
		const controller = new CartesiaConversationController({
			agentId: "agent_test",
			cartesiaVersion: "2025-04-16",
			getAuthToken: async () => "token_123",
			onStatusChange: () => {},
			onStreamIdChange: () => {},
			createWebSocket: (url) => {
				const socket = new MockWebSocket(url);
				sockets.push(socket);
				return socket;
			},
		});

		const startPromise = controller.startSession("session_123");
		await Promise.resolve();
		const socket = sockets[0]!;
		socket.open();
		socket.message({ event: "ack", stream_id: "stream_abc" });
		await startPromise;
		assert.equal(setTimeoutCalled, 1);
		assert.equal(setIntervalCalled, 1);
		controller.endSession();
	} finally {
		(globalThis as typeof globalThis & { setTimeout: typeof setTimeout }).setTimeout =
			originalSetTimeout;
		(globalThis as typeof globalThis & { clearTimeout: typeof clearTimeout }).clearTimeout =
			originalClearTimeout;
		(globalThis as typeof globalThis & { setInterval: typeof setInterval }).setInterval =
			originalSetInterval;
		(globalThis as typeof globalThis & { clearInterval: typeof clearInterval }).clearInterval =
			originalClearInterval;
	}
});

test("Cartesia controller preserves token fetch errors", async () => {
	const controller = new CartesiaConversationController({
		agentId: "agent_test",
		cartesiaVersion: "2025-04-16",
		getAuthToken: async () => {
			throw new Error("Cartesia bridge secret not configured");
		},
		onStatusChange: () => {},
		onStreamIdChange: () => {},
	});

	await assert.rejects(
		controller.startSession("session_123"),
		/Cartesia bridge secret not configured/,
	);
	assert.equal(controller.getStatus(), "error");
});

test("Cartesia controller fails closed when ack does not include a stream id", async () => {
	const timers = new FakeTimers();
	const sockets: MockWebSocket[] = [];

	const controller = new CartesiaConversationController({
		agentId: "agent_test",
		cartesiaVersion: "2025-04-16",
		getAuthToken: async () => "token_123",
		onStatusChange: () => {},
		onStreamIdChange: () => {},
		createWebSocket: (url) => {
			const socket = new MockWebSocket(url);
			sockets.push(socket);
			return socket;
		},
		...getTimerOverrides(timers),
	});

	const startPromise = controller.startSession("session_123");
	await Promise.resolve();
	const socket = sockets[0]!;
	socket.open();
	socket.message({ event: "ack" });

	await assert.rejects(startPromise, /stream_id/i);
	assert.equal(controller.getStatus(), "error");
	assert.equal(controller.sendMediaInput("pcm_after_failure"), false);
});

test("Cartesia controller cancels pending reconnects on intentional stop", async () => {
	const timers = new FakeTimers();
	const sockets: MockWebSocket[] = [];

	const controller = new CartesiaConversationController({
		agentId: "agent_test",
		cartesiaVersion: "2025-04-16",
		getAuthToken: async () => "token_123",
		onStatusChange: () => {},
		onStreamIdChange: () => {},
		createWebSocket: (url) => {
			const socket = new MockWebSocket(url);
			sockets.push(socket);
			return socket;
		},
		...getTimerOverrides(timers),
	});

	const startPromise = controller.startSession("session_123");
	await Promise.resolve();
	const socket = sockets[0]!;
	socket.open();
	socket.message({ event: "ack", stream_id: "stream_abc" });
	await startPromise;

	socket.readyState = 1;
	socket.onclose?.({} as CloseEvent);
	assert.equal(timers.pendingCount, 1);

	controller.endSession();
	assert.equal(timers.pendingCount, 0);

	timers.runAll();
	assert.equal(sockets.length, 1);
	assert.equal(controller.getStatus(), "disconnected");
});

test("AudioPlayer.flush stops the current source, not just queued chunks", async () => {
	const originalAudioContext = globalThis.AudioContext;
	globalThis.AudioContext =
		FakeAudioContext as unknown as typeof globalThis.AudioContext;

	try {
		const player = new AudioPlayer();
		await player.init();
		player.enqueue(Buffer.from(new Int16Array([0, 0, 0, 0]).buffer).toString("base64"));

		const source = FakeAudioContext.lastSource;
		assert.ok(source);
		assert.equal(source.startCalls, 1);

		player.flush();
		assert.equal(source.stopCalls, 1);
	} finally {
		globalThis.AudioContext = originalAudioContext;
	}
});

test("AudioPlayer reports playback state changes when audio starts and ends", async () => {
	const originalAudioContext = globalThis.AudioContext;
	globalThis.AudioContext =
		FakeAudioContext as unknown as typeof globalThis.AudioContext;

	try {
		const playbackStates: boolean[] = [];
		const player = new AudioPlayer({
			onPlaybackStateChange: (isPlaying) => {
				playbackStates.push(isPlaying);
			},
		});

		await player.init();
		player.enqueue(
			Buffer.from(new Int16Array([0, 0, 0, 0]).buffer).toString("base64"),
		);

		assert.deepEqual(playbackStates, [true]);

		const source = FakeAudioContext.lastSource;
		assert.ok(source);
		source.onended?.();

		assert.deepEqual(playbackStates, [true, false]);
	} finally {
		globalThis.AudioContext = originalAudioContext;
	}
});
