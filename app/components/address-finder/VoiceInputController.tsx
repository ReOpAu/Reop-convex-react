import {
	AudioLines,
	Bot,
	LoaderCircle,
	Mic,
	PencilLine,
	Radio,
	Square,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { cn } from "~/lib/utils";
import { VoiceSpectrumDisplay } from "./voice-visualizer/VoiceSpectrumDisplay";
import { useVoiceConsoleStage } from "./voice-visualizer/useVoiceConsoleStage";
import type {
	VoiceConsoleStage,
	VoiceVisualizerSource,
} from "./voice-visualizer/types";

interface VoiceInputControllerProps {
	conversationStatus: string;
	isRecording: boolean;
	isVoiceActive: boolean;
	isAgentSpeaking: boolean;
	agentRequestedManual: boolean;
	voiceVisualizer: VoiceVisualizerSource | null;
	startRecording: () => void | Promise<void>;
	stopRecording: () => void | Promise<void>;
}

function StatusTile({
	icon: Icon,
	label,
	value,
	detail,
	active,
	tone = "neutral",
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	detail: string;
	active: boolean;
	tone?: "neutral" | "sky" | "orange" | "emerald";
}) {
	const toneClasses =
		tone === "sky"
			? "border-[#b7f3ff] bg-[linear-gradient(180deg,rgba(232,251,255,0.98),rgba(212,245,255,0.9))] text-[#083047]"
			: tone === "orange"
				? "border-[#ffd7bb] bg-[linear-gradient(180deg,rgba(255,246,238,0.98),rgba(255,235,214,0.9))] text-[#47240b]"
				: tone === "emerald"
					? "border-[#cdecd5] bg-[linear-gradient(180deg,rgba(243,252,246,0.98),rgba(225,245,231,0.9))] text-[#143421]"
					: "border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,241,233,0.92))] text-stone-900";

	return (
		<div
			className={cn(
				"rounded-[1.35rem] border px-4 py-3 transition-all duration-300",
				active
					? toneClasses
					: "border-stone-200/70 bg-white/78 text-stone-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]",
			)}
		>
			<div className="flex items-center gap-2">
				<Icon
					className={cn(
						"h-4 w-4 transition-transform duration-300",
						active && "scale-110",
					)}
				/>
				<p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
					{label}
				</p>
			</div>
			<p className="mt-2 text-sm font-semibold leading-tight">{value}</p>
			<p className="mt-1 text-xs leading-5 text-current/72">{detail}</p>
		</div>
	);
}

function getStageLabel(stage: VoiceConsoleStage) {
	switch (stage) {
		case "connecting":
			return "Connecting";
		case "ready":
			return "Ready";
		case "user-speaking":
			return "User speaking";
		case "thinking":
			return "Agent thinking";
		case "agent-speaking":
			return "Agent speaking";
		case "manual-live":
			return "Hybrid live";
		case "error":
			return "Session issue";
		default:
			return "Standby";
	}
}

const VoiceInputController: React.FC<VoiceInputControllerProps> = ({
	conversationStatus,
	isRecording,
	isVoiceActive,
	isAgentSpeaking,
	agentRequestedManual,
	voiceVisualizer,
	startRecording,
	stopRecording,
}) => {
	const [pendingAction, setPendingAction] = useState<"start" | "stop" | null>(
		null,
	);

	const displayConversationStatus =
		pendingAction === "start" ? "connecting" : conversationStatus;
	const isConnecting = displayConversationStatus === "connecting";
	const isConnected = displayConversationStatus === "connected";
	const isStopping = pendingAction === "stop";
	const hasError = displayConversationStatus === "error";
	const isIdle = !isRecording && !isConnecting && !isConnected && !hasError;
	const canToggle = !pendingAction && !(isConnecting && !isRecording);

	const { stage, isAwaitingAgent } = useVoiceConsoleStage({
		conversationStatus: displayConversationStatus,
		isRecording,
		isVoiceActive,
		isAgentSpeaking,
		agentRequestedManual,
	});

	const sessionCopy = useMemo(() => {
		switch (stage) {
			case "error":
				return {
					kicker: "Session issue",
					title: "The voice line did not come up cleanly.",
					body: "Retry the session, or keep typing below while the connection settles.",
				};
			case "connecting":
				return {
					kicker: "Connecting",
					title: "Opening the live voice channel.",
					body: "The console is warming up the mic path, playback bus, and session handshake.",
				};
			case "agent-speaking":
				return {
					kicker: "Agent speaking",
					title: "The reply is on air now.",
					body: "Watch the warm output lane while the address results update in real time.",
				};
			case "thinking":
				return {
					kicker: "Stand by",
					title: "The agent is composing the next turn.",
					body: "Keep the session live. You can jump back in by voice or wait for the reply.",
				};
			case "manual-live":
				return {
					kicker: "Hybrid mode",
					title: "Voice stays live while typing opens.",
					body: "Use whichever is faster. The session remains open and the equaliser keeps monitoring both sides.",
				};
			case "user-speaking":
				return {
					kicker: "Live input",
					title: "Your speech is landing clearly.",
					body: "Keep speaking naturally. The input lane is driven by the real mic signal, not a decorative loop.",
				};
			case "ready":
				return {
					kicker: "Ready",
					title: "The console is live and waiting for you.",
					body: "Start speaking whenever you like. Manual typing remains available below if you need it.",
				};
			default:
				return {
					kicker: "Standby",
					title: "Start a live voice search.",
					body: "Tap the control, wait for the channel to open, then say the address as you would naturally.",
				};
		}
	}, [stage]);

	const buttonTone = hasError
		? "from-rose-500 via-red-500 to-orange-500"
		: stage === "agent-speaking"
			? "from-orange-500 via-amber-500 to-rose-500"
			: stage === "user-speaking"
				? "from-sky-500 via-cyan-400 to-emerald-400"
				: stage === "manual-live"
					? "from-[#1b2a34] via-[#274556] to-[#44676e]"
					: isRecording || isConnecting
						? "from-slate-900 via-slate-800 to-sky-700"
						: "from-stone-950 via-stone-800 to-stone-700";

	const buttonLabel = isRecording ? "Stop voice session" : "Start voice session";
	const stageLabel = getStageLabel(stage);

	const controlCopy = useMemo(() => {
		switch (stage) {
			case "connecting":
				return {
					title: "Signal path coming online",
					body: "Once the channel connects, the spectrum will switch from standby to live analyser data.",
				};
			case "agent-speaking":
				return {
					title: "Playback bus active",
					body: "The lower lane is reading real output energy from the agent response path.",
				};
			case "thinking":
				return {
					title: "Reply pending",
					body: "The agent has your last phrase and is preparing the next response.",
				};
			case "manual-live":
				return {
					title: "Typing lane open",
					body: "Manual input is invited without dropping the active session.",
				};
			case "user-speaking":
				return {
					title: "Mic signal present",
					body: "The upper lane is reading the active microphone graph in real time.",
				};
			case "ready":
				return {
					title: "Console armed",
					body: "Speak to search, or type below if the AI asks for a precise follow-up.",
				};
			case "error":
				return {
					title: "Retry recommended",
					body: "The control is safe to re-open. Manual search stays available regardless.",
				};
			default:
				return {
					title: "Ready on tap",
					body: "The equaliser stays dark until the next session starts.",
				};
		}
	}, [stage]);

	const handleClick = () => {
		if (!canToggle) {
			return;
		}

		const nextAction = isRecording ? "stop" : "start";
		setPendingAction(nextAction);

		Promise.resolve(nextAction === "stop" ? stopRecording() : startRecording())
			.catch((error) => {
				console.error("[VoiceInputController] Voice action failed", error);
			})
			.finally(() => {
				setPendingAction(null);
			});
	};

	return (
		<div className="relative overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top,_rgba(92,225,230,0.1),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,157,77,0.12),transparent_30%),linear-gradient(135deg,_rgba(255,252,247,0.98),_rgba(247,241,231,0.98))] p-6 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-[-3.5rem] top-[-3rem] h-32 w-32 rounded-full bg-sky-200/20 blur-3xl" />
				<div className="absolute bottom-[-4rem] right-[-2rem] h-36 w-36 rounded-full bg-orange-200/20 blur-3xl" />
			</div>

			<div className="relative space-y-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-stone-500">
							Voice Console
						</p>
						<div className="space-y-1">
							<p className="text-xl font-semibold tracking-tight text-stone-950">
								{sessionCopy.title}
							</p>
							<p className="max-w-xl text-sm leading-6 text-stone-600">
								{sessionCopy.body}
							</p>
						</div>
					</div>

					<div
						className={cn(
							"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur",
							hasError
								? "border-rose-200 bg-rose-50/90 text-rose-700"
								: isConnected
									? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
									: isConnecting
										? "border-sky-200 bg-sky-50/90 text-sky-700"
										: "border-stone-200 bg-white/80 text-stone-600",
						)}
					>
						<Radio className="h-3.5 w-3.5" />
						<span>{sessionCopy.kicker}</span>
					</div>
				</div>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.85fr)]">
					<div className="space-y-4">
						<VoiceSpectrumDisplay
							analyser={voiceVisualizer}
							stage={stage}
							isRecording={isRecording}
							isVoiceActive={isVoiceActive}
							isAgentSpeaking={isAgentSpeaking}
							agentRequestedManual={agentRequestedManual}
						/>

						<div className="rounded-[1.55rem] border border-stone-200/70 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-full border border-stone-200/80 bg-stone-100/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-700">
											{stageLabel}
										</span>
										{isAwaitingAgent && (
											<span className="inline-flex items-center gap-1 rounded-full border border-orange-200/80 bg-orange-50/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-orange-700">
												<Sparkles className="h-3 w-3" />
												Reply pending
											</span>
										)}
										{agentRequestedManual && isRecording && (
											<span className="rounded-full border border-sky-200/80 bg-sky-50/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sky-700">
												Typing live
											</span>
										)}
									</div>
									<div>
										<p className="text-sm font-semibold text-stone-900">
											{controlCopy.title}
										</p>
										<p className="mt-1 text-sm leading-6 text-stone-600">
											{controlCopy.body}
										</p>
									</div>
								</div>

								<button
									type="button"
									onClick={handleClick}
									disabled={!canToggle}
									className={cn(
										"relative shrink-0 rounded-full bg-gradient-to-br p-[0.4rem] text-white shadow-[0_24px_55px_-22px_rgba(15,23,42,0.65)] transition-all duration-300",
										buttonTone,
										canToggle
											? "hover:scale-[1.03] active:scale-[0.98]"
											: "cursor-not-allowed opacity-80",
									)}
									aria-label={buttonLabel}
								>
									<span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),rgba(255,255,255,0.08)_54%,rgba(0,0,0,0.16))] backdrop-blur">
										{isConnecting || isStopping ? (
											<LoaderCircle className="h-8 w-8 animate-spin" />
										) : isRecording ? (
											<Square className="h-7 w-7 fill-current" />
										) : (
											<Mic className="h-8 w-8" />
										)}
									</span>
								</button>
							</div>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
						<StatusTile
							icon={Mic}
							label="Input"
							value={
								isVoiceActive
									? "Speech detected"
									: isRecording
										? "Mic open"
										: "Waiting to start"
							}
							detail={
								isVoiceActive
									? "Upper spectrum lane is tracking the live microphone signal."
									: isRecording
										? "The mic path is armed and listening for your next phrase."
										: "No capture graph is active."
							}
							active={isRecording}
							tone="sky"
						/>
						<StatusTile
							icon={Bot}
							label="Response"
							value={
								isAgentSpeaking
									? "Reply on air"
									: isAwaitingAgent
										? "Composing next turn"
										: isConnected
											? "Standing by"
											: "Offline"
							}
							detail={
								isAgentSpeaking
									? "Lower spectrum lane is reading the playback output bus."
									: isAwaitingAgent
										? "The session has your last phrase and is preparing the answer."
										: isConnected
											? "No response audio is playing right now."
											: "Playback will arm when the session connects."
							}
							active={isConnected || isAgentSpeaking || isAwaitingAgent}
							tone="orange"
						/>
						<StatusTile
							icon={AudioLines}
							label="Link"
							value={
								hasError
									? "Retry needed"
									: isConnected
										? "Connected"
										: isConnecting
											? "Handshaking"
											: "Disconnected"
							}
							detail={
								hasError
									? "The session hit an error before a stable voice channel was established."
									: isConnected
										? "Voice transport, mic path, and playback bus are all live."
										: isConnecting
											? "Opening the provider session and priming the audio graph."
											: "The console is idle."
							}
							active={isConnected || isConnecting}
							tone="emerald"
						/>
						<StatusTile
							icon={PencilLine}
							label="Manual"
							value={
								agentRequestedManual
									? "Typing invited"
									: isRecording
										? "Available below"
										: "Ready when needed"
							}
							detail={
								agentRequestedManual
									? "Manual typing is open without ending the live voice session."
									: isRecording
										? "The manual form stays available while voice remains active."
										: "Manual search is always available as a fallback."
							}
							active={agentRequestedManual}
							tone="neutral"
						/>
					</div>
				</div>

				{isIdle && (
					<p className="text-center text-xs uppercase tracking-[0.26em] text-stone-500">
						Standby
					</p>
				)}
			</div>
		</div>
	);
};

export default VoiceInputController;
