import {
	AudioLines,
	Bot,
	LoaderCircle,
	Mic,
	PencilLine,
	Radio,
	Square,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { cn } from "~/lib/utils";

interface VoiceInputControllerProps {
	conversationStatus: string;
	isRecording: boolean;
	isVoiceActive: boolean;
	isAgentSpeaking: boolean;
	agentRequestedManual: boolean;
	startRecording: () => void | Promise<void>;
	stopRecording: () => void | Promise<void>;
}

function ActivityMeter({
	active,
	tone,
}: {
	active: boolean;
	tone: "sky" | "orange";
}) {
	const activeTone =
		tone === "sky"
			? "bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.45)]"
			: "bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.4)]";

	return (
		<div className="flex h-8 items-end gap-1.5">
			{[0, 1, 2, 3, 4].map((bar) => (
				<span
					key={bar}
					className={cn(
						"w-1.5 rounded-full transition-all duration-300 ease-out",
						active ? `${activeTone} animate-pulse` : "bg-stone-300/80",
					)}
					style={{
						height: active ? `${14 + ((bar % 3) + 1) * 6}px` : `${8 + bar * 2}px`,
						animationDelay: `${bar * 90}ms`,
					}}
				/>
			))}
		</div>
	);
}

function StatusTile({
	icon: Icon,
	label,
	value,
	active,
	tone = "neutral",
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	active: boolean;
	tone?: "neutral" | "sky" | "orange" | "emerald";
}) {
	const toneClasses =
		tone === "sky"
			? "border-sky-200/80 bg-sky-50/80 text-sky-900"
			: tone === "orange"
				? "border-orange-200/80 bg-orange-50/80 text-orange-900"
				: tone === "emerald"
					? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900"
					: "border-stone-200/80 bg-white/70 text-stone-900";

	return (
		<div
			className={cn(
				"rounded-2xl border px-4 py-3 transition-all duration-300",
				active ? toneClasses : "border-stone-200/70 bg-white/55 text-stone-700",
			)}
		>
			<div className="flex items-center gap-2">
				<Icon
					className={cn(
						"h-4 w-4 transition-transform duration-300",
						active && "scale-110",
					)}
				/>
				<p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
					{label}
				</p>
			</div>
			<p className="mt-2 text-sm font-medium leading-tight">{value}</p>
		</div>
	);
}

const VoiceInputController: React.FC<VoiceInputControllerProps> = ({
	conversationStatus,
	isRecording,
	isVoiceActive,
	isAgentSpeaking,
	agentRequestedManual,
	startRecording,
	stopRecording,
}) => {
	const [pendingAction, setPendingAction] = useState<"start" | "stop" | null>(
		null,
	);

	const isConnecting =
		conversationStatus === "connecting" || pendingAction === "start";
	const isConnected = conversationStatus === "connected";
	const isStopping = pendingAction === "stop";
	const hasError = conversationStatus === "error";
	const isIdle = !isRecording && !isConnecting && !isConnected && !hasError;
	const canToggle = !pendingAction && !(isConnecting && !isRecording);

	const sessionCopy = useMemo(() => {
		if (hasError) {
			return {
				kicker: "Session issue",
				title: "We could not open the voice session.",
				body: "Try again, or use the manual search below while the connection settles.",
			};
		}

		if (isConnecting) {
			return {
				kicker: "Connecting",
				title: "Opening the live voice channel.",
				body: "This usually takes a moment while the session comes online.",
			};
		}

		if (isAgentSpeaking) {
			return {
				kicker: "Agent speaking",
				title: "The agent is responding now.",
				body: "Watch the address results update while the reply plays back.",
			};
		}

		if (agentRequestedManual && isRecording) {
			return {
				kicker: "Hybrid mode",
				title: "Voice is live and typing is open.",
				body: "Use whichever is faster. The session will keep listening while you type.",
			};
		}

		if (isVoiceActive) {
			return {
				kicker: "Live input",
				title: "We are hearing you clearly.",
				body: "Keep speaking naturally and let the search keep up with you.",
			};
		}

		if (isRecording && isConnected) {
			return {
				kicker: "Ready",
				title: "The session is live and ready for you.",
				body: "Speak whenever you are ready. Manual typing stays available below.",
			};
		}

		return {
			kicker: "Ready",
			title: "Start a live voice search.",
			body: "Tap the orb, wait for the session to open, then say the address naturally.",
		};
	}, [
		agentRequestedManual,
		hasError,
		isAgentSpeaking,
		isConnected,
		isConnecting,
		isRecording,
		isVoiceActive,
	]);

	const buttonTone = hasError
		? "from-rose-500 via-red-500 to-orange-500"
		: isAgentSpeaking
			? "from-orange-500 via-amber-500 to-rose-500"
			: isVoiceActive
				? "from-sky-500 via-cyan-400 to-emerald-400"
				: isRecording || isConnecting
					? "from-slate-900 via-slate-800 to-sky-700"
					: "from-stone-950 via-stone-800 to-stone-700";

	const buttonLabel = isRecording ? "Stop voice session" : "Start voice session";

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
		<div className="relative overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),transparent_30%),linear-gradient(135deg,_rgba(255,252,247,0.98),_rgba(247,241,231,0.98))] p-6 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-[-3.5rem] top-[-3rem] h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
				<div className="absolute bottom-[-4rem] right-[-2rem] h-36 w-36 rounded-full bg-orange-200/30 blur-3xl" />
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

				<div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
					<div className="rounded-[1.75rem] border border-stone-200/70 bg-white/65 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur">
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="relative flex h-48 w-48 items-center justify-center">
								<span
									className={cn(
										"absolute inset-0 rounded-full border border-white/70 bg-white/45 backdrop-blur transition-all duration-500",
										(isRecording || isConnecting || isAgentSpeaking) &&
											"scale-105 shadow-[0_0_0_12px_rgba(255,255,255,0.28)]",
									)}
								/>
								{(isRecording || isConnecting || isAgentSpeaking) && (
									<>
										<span className="absolute inset-3 rounded-full border border-white/60 animate-ping" />
										<span className="absolute inset-[-0.75rem] rounded-full border border-white/35 animate-pulse" />
									</>
								)}

								<button
									type="button"
									onClick={handleClick}
									disabled={!canToggle}
									className={cn(
										"relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_24px_55px_-22px_rgba(15,23,42,0.65)] transition-all duration-300",
										buttonTone,
										canToggle
											? "hover:scale-[1.03] active:scale-[0.98]"
											: "cursor-not-allowed opacity-80",
									)}
									aria-label={buttonLabel}
								>
									{isConnecting || isStopping ? (
										<LoaderCircle className="h-8 w-8 animate-spin" />
									) : isRecording ? (
										<Square className="h-7 w-7 fill-current" />
									) : (
										<Mic className="h-9 w-9" />
									)}
								</button>
							</div>

							<div className="space-y-2">
								<p className="text-sm font-medium text-stone-900">
									{isConnecting
										? "Connecting"
										: isAgentSpeaking
											? "Agent speaking"
											: agentRequestedManual && isRecording
												? "Voice and typing active"
											: isVoiceActive
												? "Speech detected"
												: isRecording
													? "Mic open"
													: "Tap to speak"}
								</p>
								<p className="text-xs uppercase tracking-[0.24em] text-stone-500">
									{isIdle
										? "Standby"
										: agentRequestedManual && isRecording
											? "Hybrid"
										: isRecording && !isVoiceActive && !isAgentSpeaking
											? "Listening"
											: isAgentSpeaking
												? "Playback"
												: "Live"}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<StatusTile
							icon={Mic}
							label="You"
							value={
								isVoiceActive
									? "Speaking detected"
									: agentRequestedManual && isRecording
										? "Voice open while typing"
									: isRecording
										? "Mic armed"
										: "Waiting to start"
							}
							active={isRecording}
							tone="sky"
						/>
						<div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 backdrop-blur">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
										User Activity
									</p>
									<p className="mt-1 text-sm font-medium text-stone-900">
										{isVoiceActive
											? "You are actively talking"
											: agentRequestedManual && isRecording
												? "Typing is open during the live session"
											: isRecording
												? "Listening for speech"
												: "Voice input is idle"}
									</p>
								</div>
								<ActivityMeter active={isVoiceActive} tone="sky" />
							</div>
						</div>

						<StatusTile
							icon={Bot}
							label="Agent"
							value={
								isAgentSpeaking
									? "Speaking back"
									: isConnected
										? "Standing by"
										: "Offline"
							}
							active={isConnected || isAgentSpeaking}
							tone="orange"
						/>
						<div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 backdrop-blur">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
										Agent Activity
									</p>
									<p className="mt-1 text-sm font-medium text-stone-900">
										{isAgentSpeaking
											? "Audio reply is playing"
											: isConnected
												? "Ready to respond"
												: "Waiting for connection"}
									</p>
								</div>
								<ActivityMeter active={isAgentSpeaking} tone="orange" />
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<StatusTile
								icon={AudioLines}
								label="Link"
								value={
									hasError
										? "Retry needed"
										: isConnected
											? "Connected"
											: isConnecting
												? "Connecting"
												: "Disconnected"
								}
								active={isConnected || isConnecting}
								tone={hasError ? "neutral" : "emerald"}
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
								active={agentRequestedManual}
								tone="neutral"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default VoiceInputController;
