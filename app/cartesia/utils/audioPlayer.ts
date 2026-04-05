/**
 * Audio playback queue for Cartesia agent speech output.
 * Decodes base64 PCM chunks and plays them sequentially via AudioContext.
 */

import { decodeAudioFromWs } from "./audioEncoder";

const SAMPLE_RATE = 44100;

interface AudioPlayerOptions {
	onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export class AudioPlayer {
	private audioContext: AudioContext | null = null;
	private queue: Float32Array[] = [];
	private isPlaying = false;
	private nextStartTime = 0;
	private currentSource: AudioBufferSourceNode | null = null;
	private readonly onPlaybackStateChange?: (isPlaying: boolean) => void;

	constructor(options: AudioPlayerOptions = {}) {
		this.onPlaybackStateChange = options.onPlaybackStateChange;
	}

	private setPlaybackState(nextIsPlaying: boolean): void {
		if (this.isPlaying === nextIsPlaying) {
			return;
		}
		this.isPlaying = nextIsPlaying;
		this.onPlaybackStateChange?.(nextIsPlaying);
	}

	/**
	 * Initialize or resume the AudioContext.
	 * Must be called from a user gesture context (click/tap).
	 */
	async init(): Promise<this> {
		if (!this.audioContext) {
			this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
		}
		if (this.audioContext.state === "suspended") {
			await this.audioContext.resume();
		}
		return this;
	}

	/**
	 * Enqueue a base64 PCM chunk for playback.
	 */
	enqueue(base64Data: string): void {
		const float32 = decodeAudioFromWs(base64Data);
		this.queue.push(float32);
		if (!this.isPlaying) {
			this.playNext();
		}
	}

	/**
	 * Play the next chunk from the queue.
	 */
	private playNext(): void {
		if (!this.audioContext || this.queue.length === 0) {
			this.setPlaybackState(false);
			return;
		}

		this.setPlaybackState(true);
		const float32 = this.queue.shift()!;

		const buffer = this.audioContext.createBuffer(
			1,
			float32.length,
			SAMPLE_RATE,
		);
		buffer.getChannelData(0).set(float32);

		const source = this.audioContext.createBufferSource();
		source.buffer = buffer;
		source.connect(this.audioContext.destination);
		this.currentSource = source;

		// Schedule playback to avoid gaps between chunks
		const currentTime = this.audioContext.currentTime;
		const startTime = Math.max(currentTime, this.nextStartTime);
		source.start(startTime);
		this.nextStartTime = startTime + buffer.duration;

		source.onended = () => {
			if (this.currentSource === source) {
				this.currentSource = null;
			}
			this.playNext();
		};
	}

	/**
	 * Flush the queue and stop all pending playback.
	 * Called when receiving a `clear` event from the server.
	 */
	flush(): void {
		this.queue = [];
		this.nextStartTime = 0;
		if (this.currentSource) {
			this.currentSource.onended = null;
			try {
				this.currentSource.stop();
			} catch {
				// Ignore stop errors for sources that already ended.
			}
			this.currentSource.disconnect();
			this.currentSource = null;
		}
		this.setPlaybackState(false);
	}

	/**
	 * Destroy the audio context and clean up.
	 */
	async destroy(): Promise<void> {
		this.flush();
		if (this.audioContext) {
			await this.audioContext.close();
			this.audioContext = null;
		}
	}
}
