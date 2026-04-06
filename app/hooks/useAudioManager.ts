import { useCallback, useEffect, useRef } from "react";
import { useHistoryStore } from "~/stores/historyStore";
import { useUIStore } from "~/stores/uiStore";

const EMPTY_FREQUENCY_DATA = new Uint8Array(new ArrayBuffer(0));

export function useAudioManager() {
	const audioContextRef = useRef<AudioContext | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const inputFrequencyDataRef = useRef<Uint8Array<ArrayBuffer>>(
		EMPTY_FREQUENCY_DATA,
	);

	// ✅ GET STATE AND ACTIONS FROM NEW PILLAR STORES
	const {
		isRecording,
		isLoggingEnabled,
		setIsRecording,
		setAgentRequestedManual,
	} = useUIStore();
	const { addHistory } = useHistoryStore();

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback((...args: any[]) => {
		// Use getState() to access store values without creating a reactive dependency
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[AudioManager]", ...args);
		}
	}, []); // Empty dependency array makes this completely stable

	const cleanupAudio = useCallback(() => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}

		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}

		if (analyserRef.current) {
			analyserRef.current.disconnect();
			analyserRef.current = null;
		}
		inputFrequencyDataRef.current = EMPTY_FREQUENCY_DATA;

		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}
	}, []);

	const getInputByteFrequencyData = useCallback(() => {
		const analyser = analyserRef.current;
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

	const startRecording = useCallback(
		async (conversation: any) => {
			log("🎤 === STARTING RECORDING ===");
			log("📊 PRE-RECORDING STATE:", {
				isRecording: useUIStore.getState().isRecording,
				isVoiceActive: useUIStore.getState().isVoiceActive,
				conversationStatus: conversation.status,
			});

			cleanupAudio();
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				mediaStreamRef.current = stream;

				const audioContext = new AudioContext();
				audioContextRef.current = audioContext;
				const source = audioContext.createMediaStreamSource(stream);
				sourceRef.current = source;
				const analyser = audioContext.createAnalyser();
				analyser.fftSize = 256;
				analyser.smoothingTimeConstant = 0.78;
				analyser.minDecibels = -90;
				analyser.maxDecibels = -18;
				analyserRef.current = analyser;
				inputFrequencyDataRef.current = new Uint8Array(
					new ArrayBuffer(analyser.frequencyBinCount),
				);
				source.connect(analyser);
				await audioContext.resume().catch(() => {});

				await conversation.startSession();
				setIsRecording(true);
				setAgentRequestedManual(false); // Reset manual request flag when starting voice
				addHistory({
					type: "system",
					text: "Recording started - Autocomplete disabled",
				});

				log("✅ RECORDING STARTED SUCCESSFULLY");
			} catch (err) {
				log("❌ RECORDING START FAILED:", err);
				setIsRecording(false);
				cleanupAudio();
				console.error("Error starting recording:", err);
				addHistory({
					type: "system",
					text: `Error starting recording: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
		},
		[
			addHistory,
			cleanupAudio,
			log,
			setIsRecording,
			setAgentRequestedManual,
		],
	);

	const stopRecording = useCallback(
		async (conversation: any) => {
			log("🎤 === STOPPING RECORDING ===");
			log("📊 PRE-STOP STATE:", {
				isRecording: useUIStore.getState().isRecording,
				isVoiceActive: useUIStore.getState().isVoiceActive,
				conversationStatus: conversation.status,
			});

			if (conversation.status === "connected") {
				await conversation.endSession();
			}
			setIsRecording(false);
			cleanupAudio();
			addHistory({
				type: "system",
				text: "Recording stopped - Autocomplete re-enabled",
			});

			log("✅ RECORDING STOPPED SUCCESSFULLY");
		},
		[addHistory, setIsRecording, cleanupAudio, log],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanupAudio();
		};
	}, [cleanupAudio]);

	return {
		startRecording,
		stopRecording,
		cleanupAudio,
		getInputByteFrequencyData,
		getInputLevel,
	};
}
