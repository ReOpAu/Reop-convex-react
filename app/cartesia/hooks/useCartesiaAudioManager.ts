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
const MIC_ACTIVITY_ACTIVATION_THRESHOLD = 0.024;
const MIC_ACTIVITY_DEACTIVATION_THRESHOLD = 0.015;
const MIC_ACTIVITY_HOLD_MS = 320;
const EMPTY_FREQUENCY_DATA = new Uint8Array(new ArrayBuffer(0));

interface UseCartesiaAudioManagerOptions {
	sendMediaInput: (base64Data: string) => void;
}

interface UseCartesiaAudioManagerReturn {
	startCapture: () => Promise<void>;
	stopCapture: () => void;
	playAudioChunk: (base64Data: string) => void;
	flushAudio: () => void;
	destroyAudio: () => Promise<void>;
	getInputByteFrequencyData: () => Uint8Array;
	getOutputByteFrequencyData: () => Uint8Array;
	getInputLevel: () => number;
	getOutputLevel: () => number;
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
	const inputAnalyserRef = useRef<AnalyserNode | null>(null);
	const inputFrequencyDataRef = useRef<Uint8Array<ArrayBuffer>>(
		EMPTY_FREQUENCY_DATA,
	);
	const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(
		null,
	);
	const playerRef = useRef<AudioPlayer | null>(null);
	const playerReadyRef = useRef<Promise<AudioPlayer> | null>(null);
	const voiceInactiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const clearVoiceInactiveTimeout = useCallback(() => {
		if (voiceInactiveTimeoutRef.current) {
			clearTimeout(voiceInactiveTimeoutRef.current);
			voiceInactiveTimeoutRef.current = null;
		}
	}, []);

	const setVoiceActive = useCallback((isActive: boolean) => {
		if (useUIStore.getState().isVoiceActive !== isActive) {
			useUIStore.getState().setIsVoiceActive(isActive);
		}
	}, []);

	const updateVoiceActivity = useCallback(
		(samples: Float32Array) => {
			let sumSquares = 0;
			for (let index = 0; index < samples.length; index += 1) {
				const sample = samples[index] ?? 0;
				sumSquares += sample * sample;
			}

			const rms = Math.sqrt(sumSquares / Math.max(samples.length, 1));
			const isCurrentlyActive = useUIStore.getState().isVoiceActive;

			if (!isCurrentlyActive && rms >= MIC_ACTIVITY_ACTIVATION_THRESHOLD) {
				clearVoiceInactiveTimeout();
				setVoiceActive(true);
				return;
			}

			clearVoiceInactiveTimeout();
			if (!isCurrentlyActive) {
				return;
			}

			if (rms >= MIC_ACTIVITY_DEACTIVATION_THRESHOLD) {
				return;
			}

			voiceInactiveTimeoutRef.current = setTimeout(() => {
				setVoiceActive(false);
				voiceInactiveTimeoutRef.current = null;
			}, MIC_ACTIVITY_HOLD_MS);
		},
		[clearVoiceInactiveTimeout, setVoiceActive],
	);

	const cleanupCaptureResources = useCallback(() => {
		clearVoiceInactiveTimeout();
		for (const track of streamRef.current?.getTracks() ?? []) {
			track.stop();
		}
		streamRef.current = null;

		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}

		if (inputAnalyserRef.current) {
			inputAnalyserRef.current.disconnect();
			inputAnalyserRef.current = null;
		}
		inputFrequencyDataRef.current = EMPTY_FREQUENCY_DATA;

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
	}, [clearVoiceInactiveTimeout]);

	const getInputByteFrequencyData = useCallback(() => {
		const analyser = inputAnalyserRef.current;
		if (!analyser) {
			return EMPTY_FREQUENCY_DATA;
		}

		if (inputFrequencyDataRef.current.length !== analyser.frequencyBinCount) {
			inputFrequencyDataRef.current = new Uint8Array(
				new ArrayBuffer(analyser.frequencyBinCount),
			);
		}

		analyser.getByteFrequencyData(inputFrequencyDataRef.current);
		return inputFrequencyDataRef.current;
	}, []);

	const getOutputByteFrequencyData = useCallback(() => {
		return playerRef.current?.getByteFrequencyData() ?? EMPTY_FREQUENCY_DATA;
	}, []);

	const getInputLevel = useCallback(() => {
		const frequencyData = getInputByteFrequencyData();
		if (frequencyData.length === 0) {
			return 0;
		}

		let total = 0;
		for (let index = 0; index < frequencyData.length; index += 1) {
			total += frequencyData[index] ?? 0;
		}

		return total / frequencyData.length / 255;
	}, [getInputByteFrequencyData]);

	const getOutputLevel = useCallback(() => {
		return playerRef.current?.getVolume() ?? 0;
	}, []);

	const ensurePlayerReady = useCallback(async (): Promise<AudioPlayer> => {
		if (!playerRef.current) {
			playerRef.current = new AudioPlayer({
				onPlaybackStateChange: (isPlaying) => {
					useUIStore.getState().setIsAgentSpeaking(isPlaying);
				},
			});
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
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.78;
			analyser.minDecibels = -90;
			analyser.maxDecibels = -18;
			inputAnalyserRef.current = analyser;
			inputFrequencyDataRef.current = new Uint8Array(
				new ArrayBuffer(analyser.frequencyBinCount),
			);

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
					updateVoiceActivity(event.data);
					sendMediaInput(encodeAudioForWs(event.data));
				};
				processor.onprocessorerror = (event) => {
					console.error("[CartesiaAudio] AudioWorklet processor error:", event);
				};
				processorRef.current = processor;
				source.connect(analyser);
				analyser.connect(processor);
				processor.connect(audioContext.destination);
			} else {
				const processor = audioContext.createScriptProcessor(
					BUFFER_SIZE,
					1,
					1,
				);
				processor.onaudioprocess = (event) => {
					const inputData = event.inputBuffer.getChannelData(0);
					updateVoiceActivity(inputData);
					sendMediaInput(encodeAudioForWs(inputData));
				};
				processorRef.current = processor;
				source.connect(analyser);
				analyser.connect(processor);
				processor.connect(audioContext.destination);
			}

			await audioContext.resume().catch(() => {});

			await ensurePlayerReady();

			useUIStore.getState().setIsRecording(true);
			useUIStore.getState().setIsVoiceActive(false);
			useUIStore.getState().setIsAgentSpeaking(false);
		} catch (err) {
			console.error("[CartesiaAudio] Failed to start capture:", err);
			cleanupCaptureResources();
			useUIStore.getState().setIsRecording(false);
			useUIStore.getState().setIsVoiceActive(false);
			useUIStore.getState().setIsAgentSpeaking(false);
			throw err instanceof Error
				? err
				: new Error("Failed to start Cartesia audio capture");
		}
	}, [
		cleanupCaptureResources,
		ensurePlayerReady,
		sendMediaInput,
		updateVoiceActivity,
	]);

	const stopCapture = useCallback(() => {
		cleanupCaptureResources();
		useUIStore.getState().setIsRecording(false);
		useUIStore.getState().setIsVoiceActive(false);
		useUIStore.getState().setIsAgentSpeaking(false);
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
		useUIStore.getState().setIsAgentSpeaking(false);
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
		getInputByteFrequencyData,
		getOutputByteFrequencyData,
		getInputLevel,
		getOutputLevel,
	};
}
