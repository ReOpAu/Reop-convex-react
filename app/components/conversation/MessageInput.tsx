"use client";

import { Send } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface MessageInputProps {
	onSendMessage: (message: string) => Promise<void>;
	isConnected: boolean;
}

export function MessageInput({
	onSendMessage,
	isConnected,
}: MessageInputProps) {
	const [message, setMessage] = useState("");

	const handleSend = useCallback(async () => {
		if (!message.trim()) return;

		try {
			await onSendMessage(message);
			setMessage("");
		} catch (error) {
			console.error("Failed to send message:", error);
		}
	}, [message, onSendMessage]);

	return (
		<div className="flex items-center gap-3 border-t border-market-line/70 bg-white/48 p-4">
			<Input
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyPress={(e) => e.key === "Enter" && handleSend()}
				placeholder="Type a question about your brief, suburb, or next move..."
				disabled={!isConnected}
				className="h-12 flex-1 rounded-full border-market-line/80 bg-market-paper/80 px-5 text-market-ink placeholder:text-market-ink/40 focus-visible:border-market-forest/30 focus-visible:ring-market-forest/10"
				aria-label="Message input"
			/>
			<Button
				onClick={handleSend}
				disabled={!isConnected || !message.trim()}
				size="icon"
				className={cn(
					"h-12 w-12 shrink-0 rounded-full shadow-none transition-all duration-200",
					message.trim() && isConnected
						? "scale-100 border border-market-forest bg-market-forest text-market-paper hover:bg-market-forest/92"
						: "scale-95 border border-market-line/70 bg-market-line/60 text-market-paper/75",
				)}
				aria-label="Send message"
			>
				<Send className="h-4 w-4" />
			</Button>
		</div>
	);
}
