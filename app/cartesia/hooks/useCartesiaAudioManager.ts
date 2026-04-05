/**
 * Manages microphone capture and audio playback for Cartesia.
 * Captures mic PCM → base64 → sends via WebSocket.
 * Receives base64 PCM → decodes → plays via AudioContext.
 */

import { useCallback, useEffect, useRef } from "react";
import { useUIStore } from "~/stores/uiStore";
import { encodeAudioForWs } from "../utils/audioEncoder";
import { AudioPlayer } from "../utils/audioPlayer";
import {
	CARTESIA_MIC_CAPTURE_PROCESSOR_NAME,
	loadCartesiaMicCaptureWorklet,
} from "../utils/micCaptureWorklet";

const MIC_SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

interface UseCartesiaAudioManagerOptions {
	sendMediaInput: (base64Data: string) => void;
}

interface UseCartesiaAudioManagerReturn {
	startCapture: () => Promise<void>;
	stopCapture: () => void;
	playAudioChunk: (base64Data: string) => void;
	flushAudio: () => void;
	destroyAudio: () => Promise<void>;
}

function isAudioWorkletCaptureNode(
	node: AudioWorkletNode | ScriptProcessorNode,
): node is AudioWorkletNode {
	return (
		typeof AudioWorkletNode !== "undefined" && node instanceof AudioWorkletNode
	);
}

export function useCartesiaAudioManager({
	sendMediaInput,
}: UseCartesiaAudioManagerOptions): UseCartesiaAudioManagerReturn {
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(
		null,
	);
	const playerRef = useRef<AudioPlayer | null>(null);
	const playerReadyRef = useRef<Promise<AudioPlayer> | null>(null);

	const cleanupCaptureResources = useCallback(() => {
		for (const track of streamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		streamRef.current = null;

		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}

		const processor = processorRef.current;
		if (processor) {
			if (isAudioWorkletCaptureNode(processor)) {
				processor.port.onmessage = null;
				processor.onprocessorerror = null;
			} else {
				processor.onaudioprocess = null;
			}
			processor.disconnect();
			processorRef.current = null;
		}

		if (audioContextRef.current) {
			audioContextRef.current.close().catch(() => {});
			audioContextRef.current = null;
		}
	}, []);

	const ensurePlayerReady = useCallback(async (): Promise<AudioPlayer> => {
		if (!playerRef.current) {
			playerRef.current = new AudioPlayer();
		}

		if (!playerReadyRef.current) {
			playerReadyRef.current = playerRef.current.init().then(() => {
				if (!playerRef.current) {
					throw new Error("Cartesia audio player was destroyed");
				}
				return playerRef.current;
			});
		}

		return playerReadyRef.current;
	}, []);

	const startCapture = useCallback(async () => {
		try {
			cleanupCaptureResources();

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: MIC_SAMPLE_RATE,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});

			streamRef.current = stream;

			const audioContext = new AudioContext({
				sampleRate: MIC_SAMPLE_RATE,
			});
				audioContextRef.current = audioContext;

				const source = audioContext.createMediaStreamSource(stream);
				sourceRef.current = source;

				if (
					audioContext.audioWorklet &&
					typeof AudioWorkletNode !== "undefined"
				) {
					await loadCartesiaMicCaptureWorklet(audioContext.audioWorklet);
					const processor = new AudioWorkletNode(
						audioContext,
						CARTESIA_MIC_CAPTURE_PROCESSOR_NAME,
						{
							numberOfInputs: 1,
							numberOfOutputs: 1,
							channelCount: 1,
							outputChannelCount: [1],
						},
					);
					processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
						if (!(event.data instanceof Float32Array)) {
							return;
						}
						sendMediaInput(encodeAudioForWs(event.data));
					};
					processor.onprocessorerror = (event) => {
						console.error("[CartesiaAudio] AudioWorklet processor error:", event);
					};
					processorRef.current = processor;
					source.connect(processor);
					processor.connect(audioContext.destination);
				} else {
					const processor = audioContext.createScriptProcessor(
						BUFFER_SIZE,
						1,
						1,
					);
					processor.onaudioprocess = (event) => {
						const inputData = event.inputBuffer.getChannelData(0);
						sendMediaInput(encodeAudioForWs(inputData));
					};
					processorRef.current = processor;
					source.connect(processor);
					processor.connect(audioContext.destination);
				}

				await audioContext.resume().catch(() => {});

				await ensurePlayerReady();

				useUIStore.getState().setIsRecording(true);
				useUIStore.getState().setIsVoiceActive(true);
			} catch (err) {
				console.error("[CartesiaAudio] Failed to start capture:", err);
				cleanupCaptureResources();
				useUIStore.getState().setIsRecording(false);
				useUIStore.getState().setIsVoiceActive(false);
				throw err instanceof Error
					? err
					: new Error("Failed to start Cartesia audio capture");
			}
		}, [cleanupCaptureResources, ensurePlayerReady, sendMediaInput]);

	const stopCapture = useCallback(() => {
		cleanupCaptureResources();
		useUIStore.getState().setIsRecording(false);
		useUIStore.getState().setIsVoiceActive(false);
	}, [cleanupCaptureResources]);

	const playAudioChunk = useCallback((base64Data: string) => {
		void ensurePlayerReady()
			.then((player) => {
				player.enqueue(base64Data);
			})
			.catch((error) => {
				console.error("[CartesiaAudio] Failed to play audio chunk:", error);
			});
	}, [ensurePlayerReady]);

	const flushAudio = useCallback(() => {
		playerRef.current?.flush();
	}, []);

	const destroyAudio = useCallback(async () => {
		stopCapture();
		if (playerRef.current) {
			await playerRef.current.destroy();
			playerRef.current = null;
		}
		playerReadyRef.current = null;
	}, [stopCapture]);

	useEffect(() => {
		return () => {
			void destroyAudio();
		};
	}, [destroyAudio]);

	return {
		startCapture,
		stopCapture,
		playAudioChunk,
		flushAudio,
		destroyAudio,
	};
}
