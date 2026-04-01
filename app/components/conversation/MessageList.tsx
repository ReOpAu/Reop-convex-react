"use client";

import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import { BlurFade } from "../ui/blur-fade";
import type { Message } from "./types";

interface MessageListProps {
	messages: Message[];
	isAgentTyping: boolean;
}

export function MessageList({ messages, isAgentTyping }: MessageListProps) {
	const chatContainerRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom when messages change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (chatContainerRef.current) {
			const container = chatContainerRef.current;
			// Always scroll for new messages
			const shouldAutoScroll = true;

			if (shouldAutoScroll) {
				// Use a slightly longer timeout to ensure content is rendered
				setTimeout(() => {
					container.scrollTo({
						top: container.scrollHeight,
						behavior: "smooth",
					});
				}, 100);

				// Add a second scroll after a longer delay to catch any delayed renders
				setTimeout(() => {
					container.scrollTo({
						top: container.scrollHeight,
						behavior: "smooth",
					});
				}, 500);
			}
		}
	}, [messages]);

	return (
		<div
			ref={chatContainerRef}
			className="flex-1 space-y-4 overflow-y-auto bg-transparent p-6 scroll-smooth"
			role="log"
			aria-label="Chat messages"
		>
			{messages.length === 0 && (
				<div className="flex h-full flex-col items-center justify-center text-center text-market-ink/62">
					<div className="mb-4 flex size-16 items-center justify-center rounded-full border border-market-line/80 bg-market-sand/55">
						<span className="font-display text-3xl leading-none text-market-forest">
							R
						</span>
					</div>
					<p className="mb-2 text-lg font-medium text-market-ink">
						Start a conversation
					</p>
					<p className="max-w-sm text-sm leading-7">
						Use text or voice to test a buyer or seller brief, compare suburbs,
						or think through your next move.
					</p>
				</div>
			)}
			{messages.map((msg, index) => (
				<BlurFade
					key={index}
					direction={msg.sender === "user" ? "right" : "left"}
					delay={Math.min(index * 0.05, 0.3)}
					duration={0.3}
				>
					<div
						className={cn(
							"flex items-start gap-3 max-w-[85%]",
							msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
						)}
					>
						<div
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-full",
								msg.sender === "user"
									? msg.isTranscribed
										? "bg-market-brass text-market-ink"
										: "bg-market-forest text-market-paper"
									: "border border-market-line/80 bg-market-sand/55 text-market-forest",
							)}
						>
							<span className="text-xs font-medium">
								{msg.sender === "user"
									? msg.isTranscribed
										? "V"
										: "You"
									: "RE"}
							</span>
						</div>
						<div
							className={cn(
								"max-w-full rounded-[22px] px-4 py-3 shadow-sm",
								msg.sender === "user"
									? msg.isTranscribed
										? "border border-market-brass/40 bg-market-brass/18 text-market-ink"
										: "bg-market-forest text-market-paper"
									: "border border-market-line/80 bg-white/72 text-market-ink",
							)}
							aria-label={`${msg.sender} message`}
							data-testid={`message-${index}`}
						>
							<p className="text-sm leading-relaxed break-words">{msg.text}</p>
						</div>
					</div>
				</BlurFade>
			))}
			{isAgentTyping && (
				<BlurFade direction="up" delay={0.1} duration={0.2}>
					<div className="flex items-start gap-3 max-w-[85%] mr-auto">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-market-line/80 bg-market-sand/55 text-market-forest">
							<span className="text-xs font-medium">RE</span>
						</div>
						<div className="rounded-[22px] border border-market-line/80 bg-white/72 px-4 py-3 shadow-sm">
							<div className="flex items-center gap-1">
								<div className="h-2 w-2 animate-bounce rounded-full bg-market-forest/40" />
								<div className="h-2 w-2 animate-bounce rounded-full bg-market-forest/40 delay-100" />
								<div className="h-2 w-2 animate-bounce rounded-full bg-market-forest/40 delay-200" />
							</div>
						</div>
					</div>
				</BlurFade>
			)}
		</div>
	);
}
