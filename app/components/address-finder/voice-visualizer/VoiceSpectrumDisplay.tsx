import { AudioLines, Mic, PencilLine, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import {
	EMPTY_FREQUENCY_DATA,
	type VoiceConsoleStage,
	type VoiceVisualizerSource,
} from "./types";

interface VoiceSpectrumDisplayProps {
	analyser: VoiceVisualizerSource | null;
	stage: VoiceConsoleStage;
	isRecording: boolean;
	isVoiceActive: boolean;
	isAgentSpeaking: boolean;
	agentRequestedManual: boolean;
	className?: string;
}

const FRAME_RATE = 36;
const REDUCED_MOTION_FRAME_RATE = 12;
const TOP_LANE = {
	label: "Mic Input",
	subtitle: "Live capture",
	accent: "#5ce1e6",
	highlight: "#e0fbff",
	peak: "#c7fcff",
	glow: "rgba(92,225,230,0.36)",
	icon: Mic,
};
const BOTTOM_LANE = {
	label: "Agent Return",
	subtitle: "Playback bus",
	accent: "#ff9d4d",
	highlight: "#ffe2bc",
	peak: "#ffd59b",
	glow: "rgba(255,157,77,0.34)",
	icon: AudioLines,
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function createRoundedPath(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	const safeRadius = Math.min(radius, width / 2, height / 2);
	context.beginPath();
	context.moveTo(x + safeRadius, y);
	context.lineTo(x + width - safeRadius, y);
	context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
	context.lineTo(x + width, y + height - safeRadius);
	context.quadraticCurveTo(
		x + width,
		y + height,
		x + width - safeRadius,
		y + height,
	);
	context.lineTo(x + safeRadius, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
	context.lineTo(x, y + safeRadius);
	context.quadraticCurveTo(x, y, x + safeRadius, y);
	context.closePath();
}

function fillRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	createRoundedPath(context, x, y, width, height, radius);
	context.fill();
}

function usePrefersReducedMotion() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const handleChange = () => {
			setPrefersReducedMotion(mediaQuery.matches);
		};

		handleChange();
		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, []);

	return prefersReducedMotion;
}

function ensureBufferSize(
	buffer: Float32Array<ArrayBufferLike>,
	nextSize: number,
) {
	return buffer.length === nextSize ? buffer : new Float32Array(nextSize);
}

function sampleFrequencyData(
	frequencyData: Uint8Array,
	barCount: number,
	fallbackSeed: number,
	fallbackLevel: number,
	fallbackVariance: number,
	phase: number,
) {
	const values = new Float32Array(barCount);

	if (frequencyData.length === 0) {
		for (let index = 0; index < barCount; index += 1) {
			const wave =
				Math.sin(phase + index * 0.58 + fallbackSeed * 1.7) * 0.5 + 0.5;
			const contour = 0.78 + Math.sin(index / Math.max(barCount - 1, 1) * Math.PI) * 0.22;
			values[index] = clamp(
				fallbackLevel + wave * fallbackVariance * contour,
				0,
				1,
			);
		}
		return values;
	}

	const usableBins = Math.max(
		Math.min(Math.floor(frequencyData.length * 0.85), frequencyData.length),
		1,
	);

	for (let index = 0; index < barCount; index += 1) {
		const ratioStart = Math.pow(index / barCount, 1.72);
		const ratioEnd = Math.pow((index + 1) / barCount, 1.72);
		const start = Math.floor(ratioStart * usableBins);
		const end = Math.max(start + 1, Math.floor(ratioEnd * usableBins));
		let total = 0;

		for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
			total += frequencyData[sampleIndex] ?? 0;
		}

		const average = total / Math.max(end - start, 1) / 255;
		const contour = 0.88 + Math.sin((index / Math.max(barCount - 1, 1)) * Math.PI) * 0.2;
		values[index] = clamp(Math.pow(average, 0.9) * contour * 1.2, 0, 1);
	}

	return values;
}

function drawLane(
	context: CanvasRenderingContext2D,
	options: {
		x: number;
		y: number;
		width: number;
		height: number;
		levels: Float32Array;
		peaks: Float32Array;
		palette: typeof TOP_LANE;
		gridOpacity: number;
	},
) {
	const { x, y, width, height, levels, peaks, palette, gridOpacity } = options;
	const barCount = levels.length;
	const gap = width > 420 ? 6 : 4;
	const barWidth = (width - gap * (barCount - 1)) / Math.max(barCount, 1);

	context.save();

	context.fillStyle = "rgba(8, 13, 18, 0.72)";
	fillRoundedRect(context, x, y, width, height, 18);

	context.strokeStyle = `rgba(255,255,255,${gridOpacity})`;
	context.lineWidth = 1;
	for (let row = 1; row <= 3; row += 1) {
		const rowY = y + (height / 4) * row;
		context.beginPath();
		context.moveTo(x + 14, rowY);
		context.lineTo(x + width - 14, rowY);
		context.stroke();
	}

	for (let index = 0; index < barCount; index += 1) {
		const barX = x + index * (barWidth + gap);
		const amplitude = levels[index] ?? 0;
		const peak = peaks[index] ?? amplitude;
		const minHeight = 6;
		const activeHeight = minHeight + amplitude * (height - minHeight - 18);
		const peakHeight = minHeight + peak * (height - minHeight - 18);
		const barY = y + height - activeHeight - 9;
		const peakY = y + height - peakHeight - 14;

		const gradient = context.createLinearGradient(
			barX,
			y + height,
			barX,
			y,
		);
		gradient.addColorStop(0, `${palette.accent}14`);
		gradient.addColorStop(0.15, palette.accent);
		gradient.addColorStop(0.85, palette.highlight);

		context.shadowColor = palette.glow;
		context.shadowBlur = 18;
		context.fillStyle = gradient;
		fillRoundedRect(context, barX, barY, barWidth, activeHeight, barWidth / 2);

		context.shadowBlur = 0;
		context.fillStyle = palette.peak;
		fillRoundedRect(
			context,
			barX,
			peakY,
			barWidth,
			3,
			Math.min(barWidth / 2, 1.5),
		);
	}

	context.restore();
}

export function VoiceSpectrumDisplay({
	analyser,
	stage,
	isRecording,
	isVoiceActive,
	isAgentSpeaking,
	agentRequestedManual,
	className,
}: VoiceSpectrumDisplayProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const inputLevelsRef = useRef<Float32Array<ArrayBufferLike>>(
		new Float32Array(0),
	);
	const outputLevelsRef = useRef<Float32Array<ArrayBufferLike>>(
		new Float32Array(0),
	);
	const inputPeaksRef = useRef<Float32Array<ArrayBufferLike>>(
		new Float32Array(0),
	);
	const outputPeaksRef = useRef<Float32Array<ArrayBufferLike>>(
		new Float32Array(0),
	);
	const animationFrameRef = useRef<number | null>(null);
	const lastFrameTimeRef = useRef(0);
	const labelId = useId();
	const prefersReducedMotion = usePrefersReducedMotion();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		const render = (time: number) => {
			const targetFrameDuration =
				1000 /
				(prefersReducedMotion ? REDUCED_MOTION_FRAME_RATE : FRAME_RATE);

			if (time - lastFrameTimeRef.current < targetFrameDuration) {
				animationFrameRef.current = requestAnimationFrame(render);
				return;
			}
			lastFrameTimeRef.current = time;

			const nextWidth = Math.max(canvas.clientWidth, 1);
			const nextHeight = Math.max(canvas.clientHeight, 1);
			const devicePixelRatio =
				typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;

			if (
				canvas.width !== Math.floor(nextWidth * devicePixelRatio) ||
				canvas.height !== Math.floor(nextHeight * devicePixelRatio)
			) {
				canvas.width = Math.floor(nextWidth * devicePixelRatio);
				canvas.height = Math.floor(nextHeight * devicePixelRatio);
				context.setTransform(1, 0, 0, 1, 0, 0);
				context.scale(devicePixelRatio, devicePixelRatio);
			}

			const width = nextWidth;
			const height = nextHeight;
			const barCount = clamp(Math.floor(width / 18), 16, 30);
			const phase = time / 780;
			const supportsLiveInput = Boolean(analyser?.supportsInputAnalyser);
			const supportsLiveOutput = Boolean(analyser?.supportsOutputAnalyser);
			const inputFrequencyData =
				supportsLiveInput
					? analyser?.getInputByteFrequencyData() ?? EMPTY_FREQUENCY_DATA
					: EMPTY_FREQUENCY_DATA;
			const outputFrequencyData =
				supportsLiveOutput
					? analyser?.getOutputByteFrequencyData() ?? EMPTY_FREQUENCY_DATA
					: EMPTY_FREQUENCY_DATA;

			const inputFallback =
				stage === "user-speaking"
					? { level: 0.38, variance: 0.42 }
					: stage === "ready" || stage === "manual-live"
						? { level: 0.08, variance: 0.08 }
						: stage === "connecting"
							? { level: 0.12, variance: 0.09 }
							: { level: 0.03, variance: 0.03 };
			const outputFallback =
				stage === "agent-speaking"
					? { level: 0.42, variance: 0.44 }
					: stage === "thinking"
						? { level: 0.16, variance: 0.1 }
						: stage === "connecting"
							? { level: 0.1, variance: 0.08 }
							: { level: 0.03, variance: 0.03 };

			const sampledInput = sampleFrequencyData(
				inputFrequencyData,
				barCount,
				0.18,
				inputFallback.level,
				inputFallback.variance,
				phase,
			);
			const sampledOutput = sampleFrequencyData(
				outputFrequencyData,
				barCount,
				1.3,
				outputFallback.level,
				outputFallback.variance,
				phase + 1.2,
			);

			inputLevelsRef.current = ensureBufferSize(inputLevelsRef.current, barCount);
			outputLevelsRef.current = ensureBufferSize(
				outputLevelsRef.current,
				barCount,
			);
			inputPeaksRef.current = ensureBufferSize(inputPeaksRef.current, barCount);
			outputPeaksRef.current = ensureBufferSize(outputPeaksRef.current, barCount);

			const attack = prefersReducedMotion ? 0.3 : 0.54;
			const decay = prefersReducedMotion ? 0.76 : 0.84;
			const peakDrop = prefersReducedMotion ? 0.05 : 0.024;

			for (let index = 0; index < barCount; index += 1) {
				const nextInputTarget = sampledInput[index] ?? 0;
				const nextOutputTarget = sampledOutput[index] ?? 0;
				const currentInput = inputLevelsRef.current[index] ?? 0;
				const currentOutput = outputLevelsRef.current[index] ?? 0;
				const easedInput =
					nextInputTarget > currentInput
						? currentInput + (nextInputTarget - currentInput) * attack
						: currentInput * decay + nextInputTarget * (1 - decay);
				const easedOutput =
					nextOutputTarget > currentOutput
						? currentOutput + (nextOutputTarget - currentOutput) * attack
						: currentOutput * decay + nextOutputTarget * (1 - decay);

				inputLevelsRef.current[index] = clamp(easedInput, 0, 1);
				outputLevelsRef.current[index] = clamp(easedOutput, 0, 1);
				inputPeaksRef.current[index] = Math.max(
					inputLevelsRef.current[index],
					(inputPeaksRef.current[index] ?? 0) - peakDrop,
				);
				outputPeaksRef.current[index] = Math.max(
					outputLevelsRef.current[index],
					(outputPeaksRef.current[index] ?? 0) - peakDrop,
				);
			}

			context.clearRect(0, 0, width, height);
			context.fillStyle = "#091117";
			context.fillRect(0, 0, width, height);

			const ambientGradient = context.createLinearGradient(0, 0, width, height);
			ambientGradient.addColorStop(0, "rgba(19, 38, 46, 0.88)");
			ambientGradient.addColorStop(0.5, "rgba(10, 16, 22, 0.92)");
			ambientGradient.addColorStop(1, "rgba(29, 19, 14, 0.88)");
			context.fillStyle = ambientGradient;
			context.fillRect(0, 0, width, height);

			const topGlow = context.createRadialGradient(
				width * 0.18,
				height * 0.2,
				0,
				width * 0.18,
				height * 0.2,
				width * 0.42,
			);
			topGlow.addColorStop(0, "rgba(92, 225, 230, 0.18)");
			topGlow.addColorStop(1, "rgba(92, 225, 230, 0)");
			context.fillStyle = topGlow;
			context.fillRect(0, 0, width, height);

			const bottomGlow = context.createRadialGradient(
				width * 0.82,
				height * 0.78,
				0,
				width * 0.82,
				height * 0.78,
				width * 0.42,
			);
			bottomGlow.addColorStop(0, "rgba(255, 157, 77, 0.15)");
			bottomGlow.addColorStop(1, "rgba(255, 157, 77, 0)");
			context.fillStyle = bottomGlow;
			context.fillRect(0, 0, width, height);

			if (!prefersReducedMotion && stage !== "idle") {
				const sweepX = ((time / 18) % (width + 160)) - 160;
				const sweep = context.createLinearGradient(sweepX, 0, sweepX + 140, 0);
				sweep.addColorStop(0, "rgba(255,255,255,0)");
				sweep.addColorStop(0.55, "rgba(255,255,255,0.05)");
				sweep.addColorStop(1, "rgba(255,255,255,0)");
				context.fillStyle = sweep;
				context.fillRect(0, 0, width, height);
			}

			const paddingX = width > 480 ? 22 : 16;
			const paddingY = 14;
			const laneGap = 18;
			const laneHeight = (height - paddingY * 2 - laneGap) / 2;

			drawLane(context, {
				x: paddingX,
				y: paddingY,
				width: width - paddingX * 2,
				height: laneHeight,
				levels: inputLevelsRef.current,
				peaks: inputPeaksRef.current,
				palette: TOP_LANE,
				gridOpacity: 0.09,
			});
			drawLane(context, {
				x: paddingX,
				y: paddingY + laneHeight + laneGap,
				width: width - paddingX * 2,
				height: laneHeight,
				levels: outputLevelsRef.current,
				peaks: outputPeaksRef.current,
				palette: BOTTOM_LANE,
				gridOpacity: 0.08,
			});

			animationFrameRef.current = requestAnimationFrame(render);
		};

		animationFrameRef.current = requestAnimationFrame(render);

		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			lastFrameTimeRef.current = 0;
		};
	}, [
		analyser,
		agentRequestedManual,
		isAgentSpeaking,
		isRecording,
		isVoiceActive,
		prefersReducedMotion,
		stage,
	]);

	const liveGraphLabel =
		analyser?.supportsInputAnalyser || analyser?.supportsOutputAnalyser
			? "Real analyser feed"
			: "State fallback";

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(16,25,31,0.98),rgba(10,16,22,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_-28px_rgba(8,15,23,0.95)]",
				className,
			)}
			role="img"
			aria-labelledby={labelId}
		>
			<span id={labelId} className="sr-only">
				Live equalizer showing microphone input and agent playback activity for
				the address finder voice console.
			</span>

			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent,rgba(255,255,255,0.03),transparent)] opacity-80" />

			<div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div>
					<p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#d3ecf2]/58">
						Spectrum Deck
					</p>
					<p className="mt-1 text-sm font-medium text-stone-100">
						Graphic equaliser
					</p>
				</div>
				<div className="flex items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.24em] text-stone-300/72">
					{agentRequestedManual && isRecording && (
						<span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-stone-100">
							<PencilLine className="h-3 w-3" />
							Typing live
						</span>
					)}
					<span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1">
						{liveGraphLabel}
					</span>
				</div>
			</div>

			<div className="relative px-4 pb-4 pt-3">
				<div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/25 p-3">
					<div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex items-start justify-between text-[0.65rem] uppercase tracking-[0.28em]">
						<div className="space-y-1 text-[#d6f9fb]/78">
							<div className="inline-flex items-center gap-2">
								<TOP_LANE.icon className="h-3.5 w-3.5" />
								<span>{TOP_LANE.label}</span>
							</div>
							<p className="tracking-[0.18em] text-[#c7f6fa]/42">
								{TOP_LANE.subtitle}
							</p>
						</div>
						<div className="space-y-1 text-right text-[#ffd6b2]/78">
							<div className="inline-flex items-center gap-2">
								<BOTTOM_LANE.icon className="h-3.5 w-3.5" />
								<span>{BOTTOM_LANE.label}</span>
							</div>
							<p className="tracking-[0.18em] text-[#ffd9af]/42">
								{BOTTOM_LANE.subtitle}
							</p>
						</div>
					</div>

					<canvas
						ref={canvasRef}
						className="block h-[15.5rem] w-full sm:h-[17rem]"
						aria-hidden="true"
					/>

					<div className="pointer-events-none absolute inset-x-4 bottom-3 z-10 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.24em] text-stone-300/64">
						<div className="inline-flex items-center gap-2">
							<Sparkles className="h-3 w-3" />
							<span>{prefersReducedMotion ? "Reduced motion" : "Peak hold"}</span>
						</div>
						<div className="inline-flex items-center gap-2">
							<PencilLine className="h-3 w-3" />
							<span>{isRecording ? "Session live" : "Standby"}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
