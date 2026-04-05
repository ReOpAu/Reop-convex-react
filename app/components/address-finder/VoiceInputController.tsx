import { Mic, Square } from "lucide-react";
import type React from "react";
import { VoiceIndicator } from "~/components/conversation/VoiceIndicator";

interface VoiceInputControllerProps {
	isRecording: boolean;
	isVoiceActive: boolean;
	startRecording: () => void | Promise<void>;
	stopRecording: () => void | Promise<void>;
}

const VoiceInputController: React.FC<VoiceInputControllerProps> = ({
	isRecording,
	isVoiceActive,
	startRecording,
	stopRecording,
}) => {
	const handleClick = () => {
		try {
			const actionResult = isRecording ? stopRecording() : startRecording();
			if (actionResult && typeof actionResult.then === "function") {
				void actionResult.catch((error) => {
					console.error("[VoiceInputController] Voice action failed", error);
				});
			}
		} catch (error) {
			console.error("[VoiceInputController] Voice action failed", error);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center gap-3 py-4">
			<div className="relative">
				{/* Pulse ring when recording */}
				{isRecording && (
					<span className="absolute inset-0 rounded-full animate-ping bg-red-400/30" />
				)}
				{/* Subtle outer ring when recording */}
				{isRecording && (
					<span className="absolute -inset-1 rounded-full bg-red-100 animate-pulse" />
				)}
				<button
					type="button"
					onClick={handleClick}
					className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border transition-all duration-200 ${
						isRecording
							? "bg-white border-red-200 shadow-md text-red-500 hover:bg-red-50"
							: "bg-white border-gray-200 shadow-sm text-gray-600 hover:text-gray-900 hover:shadow-md hover:scale-105"
					}`}
					aria-label={isRecording ? "Stop recording" : "Start voice input"}
				>
					{isRecording ? (
						<Square className="w-5 h-5 fill-current" />
					) : (
						<Mic className="w-6 h-6" />
					)}
				</button>
			</div>

			<span className="text-xs text-muted-foreground">
				{isRecording ? "Listening..." : "Tap to speak"}
			</span>

			{isRecording && <VoiceIndicator isVoiceActive={isVoiceActive} />}
		</div>
	);
};

export default VoiceInputController;
