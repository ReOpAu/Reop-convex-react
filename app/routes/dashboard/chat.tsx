"use client";

import { useState } from "react";
import { useAuth } from "@clerk/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Markdown from "react-markdown";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_URL?.replace(
	/.cloud$/,
	".site",
);

export default function Chat() {
	const { getToken } = useAuth();
	const [input, setInput] = useState("");
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: `${CONVEX_SITE_URL}/api/chat`,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
				const token = await getToken({ template: "convex" });
				if (!token) {
					throw new Error("Authentication required");
				}

				return fetch(input, {
					...init,
					headers: {
						...(init?.headers ?? {}),
						Authorization: `Bearer ${token}`,
					},
				});
			},
		}),
	});
	const isLoading = status === "submitted" || status === "streaming";

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedInput = input.trim();
		if (!trimmedInput || isLoading) {
			return;
		}

		await sendMessage({ text: trimmedInput });
		setInput("");
	}

	return (
		<div className="flex flex-col w-full py-24 justify-center items-center">
			<div className="w-full max-w-xl space-y-4 mb-20">
				{messages.map((message, i) => (
					<div
						key={message.id}
						className={cn(
							"flex",
							message.role === "user" ? "justify-end" : "justify-start",
						)}
					>
						<div
							className={cn(
								"max-w-[65%] px-3 py-1.5 text-sm shadow-sm",
								message.role === "user"
									? "bg-[#0B93F6] text-white rounded-2xl rounded-br-sm"
									: "bg-[#E9E9EB] text-black rounded-2xl rounded-bl-sm",
							)}
						>
							{message.parts.map((part) => {
								switch (part.type) {
									case "text":
										return (
											<div
												key={`${message.id}-${i}`}
												className="prose-sm prose-p:my-0.5 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1"
											>
												<Markdown>{part.text}</Markdown>
											</div>
										);
									default:
										return null;
								}
							})}
						</div>
					</div>
				))}
			</div>

			<form
				className="flex gap-2 justify-center w-full items-center fixed bottom-0"
				onSubmit={handleSubmit}
			>
				<div className="flex flex-col gap-2 justify-center items-start mb-8 max-w-xl w-full border p-2 rounded-lg bg-white ">
					<Input
						className="w-full border-0 shadow-none !ring-transparent "
						value={input}
						placeholder="Say something..."
						onChange={(event) => setInput(event.target.value)}
					/>
					<div className="flex justify-end gap-3 items-center w-full">
						<Button size="sm" className="text-xs" disabled={isLoading}>
							Send
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
