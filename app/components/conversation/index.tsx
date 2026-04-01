"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useAgentConversation } from "~/elevenlabs/hooks/useAgentConversation";
import { cn } from "~/lib/utils";
import { LanguageSelector } from "./LanguageSelector";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { VoiceIndicator } from "./VoiceIndicator";
import type { Language, Message } from "./types";
import { CONVERSATION_CONFIG } from "./types";

export function Conversation() {
	return (
		<ConversationProvider>
			<ConversationContent />
		</ConversationProvider>
	);
}

function ConversationContent() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isAgentTyping, setIsAgentTyping] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
	const [isVoiceActive, setIsVoiceActive] = useState(false);
	const [isVoiceMode, setIsVoiceMode] = useState(false);

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | undefined>(undefined);
	const lastUpdateRef = useRef<number>(0);

	const conversation = useAgentConversation({
		agentKey: "CONVERSATION_ASSISTANT",
		getSessionToken: () => "",
		clearSessionToken: () => {},
		onConnect: () => {},
		onDisconnect: () => {},
		onMessage: (message) => {
			setIsAgentTyping(false);
			setMessages((prev) => {
				// Ignore if this message matches the last user message (typed or transcribed)
				if (
					prev.length > 0 &&
					prev[prev.length - 1].sender === "user" &&
					prev[prev.length - 1].text === message.message
				) {
					return prev;
				}
				// Add message based on source
				return [
					...prev,
					{
						text: message.message,
						sender:
							(message.role ?? message.source) === "user" ? "user" : "agent",
						isTranscribed: false,
					},
				];
			});
		},
		onError: (error) => console.error("Error:", error),
		textOnly: true,
	});

	// Handle user messages and transcriptions through conversation object
	const handleUserMessage = useCallback(
		(message: string) => {
			if (
				message.trim() &&
				!messages.some((m) => m.text === message && m.sender === "user")
			) {
				setMessages((prev) => [
					...prev,
					{ text: message, sender: "user", isTranscribed: false },
				]);
			}
		},
		[messages],
	);

	const handleTranscription = useCallback(
		(text: string) => {
			if (
				text.trim() &&
				!messages.some(
					(m) => m.text === text && m.sender === "user" && m.isTranscribed,
				)
			) {
				setMessages((prev) => [
					...prev,
					{ text: text, sender: "user", isTranscribed: true },
				]);
			}
		},
		[messages],
	);

	// Set up audio analysis for voice mode
	const setupAudioAnalysis = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			const audioContext = new AudioContext();
			audioContextRef.current = audioContext;

			const analyser = audioContext.createAnalyser();
			analyserRef.current = analyser;

			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);

			analyser.fftSize = 256;
			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			const checkAudioLevel = () => {
				analyser.getByteFrequencyData(dataArray);
				const average = dataArray.reduce((a, b) => a + b) / bufferLength;
				const isActive = average > CONVERSATION_CONFIG.AUDIO_THRESHOLD;
				const now = Date.now();

				if (
					isActive !== isVoiceActive &&
					(isActive ||
						now - lastUpdateRef.current >
							CONVERSATION_CONFIG.INACTIVE_THRESHOLD)
				) {
					setIsVoiceActive(isActive);
					lastUpdateRef.current = now;
				}

				animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
			};

			checkAudioLevel();
		} catch (error) {
			console.error("Failed to set up audio analysis:", error);
			throw error;
		}
	}, [isVoiceActive]);

	const startConversation = useCallback(
		async (useVoice: boolean) => {
			try {
				if (useVoice) {
					await setupAudioAnalysis();
				}

				await conversation.startSession({
					overrides: {
						agent: {
							language: selectedLanguage,
						},
					},
					textOnly: !useVoice,
				});
				setIsVoiceMode(useVoice);
				setMessages([]); // Reset messages on new session
			} catch (error) {
				console.error("Failed to start conversation:", error);
				// Clean up audio resources if voice setup failed
				if (useVoice) {
					if (animationFrameRef.current) {
						cancelAnimationFrame(animationFrameRef.current);
						if (mediaStreamRef.current) {
							for (const track of mediaStreamRef.current.getTracks()) {
								track.stop();
							}
							mediaStreamRef.current = null;
						}
						mediaStreamRef.current = null;
					}
					if (audioContextRef.current) {
						audioContextRef.current.close();
					}
				}
			}
		},
		[conversation, selectedLanguage, setupAudioAnalysis],
	);

	// Clean up audio resources when conversation ends
	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (mediaStreamRef.current) {
				for (const track of mediaStreamRef.current.getTracks()) {
					track.stop();
				}
				mediaStreamRef.current = null;
			}
			if (
				audioContextRef.current &&
				audioContextRef.current.state !== "closed"
			) {
				try {
					audioContextRef.current.close();
				} catch (error) {
					console.error("Error closing AudioContext:", error);
				}
			}
		};
	}, []);

	const stopConversation = useCallback(async () => {
		await conversation.endSession();
		setIsVoiceMode(false);
	}, [conversation]);

	const handleSendMessage = useCallback(
		async (message: string) => {
			try {
				setIsAgentTyping(true);
				await conversation.sendUserMessage(message);
				setMessages((prev) => [
					...prev,
					{ text: message, sender: "user", isTranscribed: false },
				]);
			} catch (error) {
				console.error("Failed to send message:", error);
				setIsAgentTyping(false);
			}
		},
		[conversation],
	);

	return (
		<Card className="w-full max-w-2xl mx-auto shadow-lg border-0 bg-white dark:bg-gray-900">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
						<span className="text-white text-lg">🤖</span>
					</div>
					<CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
						AI Assistant
					</CardTitle>
				</div>
				<div className="flex items-center gap-3">
					<LanguageSelector
						selectedLanguage={selectedLanguage}
						onLanguageChange={setSelectedLanguage}
						disabled={conversation.status === "connected"}
					/>
					{conversation.status === "connected" && isVoiceMode && (
						<VoiceIndicator isVoiceActive={isVoiceActive} />
					)}
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div className="flex flex-col h-[500px] bg-white dark:bg-gray-900">
					<MessageList messages={messages} isAgentTyping={isAgentTyping} />
					<MessageInput
						onSendMessage={handleSendMessage}
						isConnected={conversation.status === "connected"}
					/>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 p-6 pt-4 bg-gray-50/50 dark:bg-gray-900/50 border-t">
					{conversation.status !== "connected" ? (
						<>
							<Button
								onClick={() => startConversation(false)}
								variant="default"
								size="lg"
								className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
							>
								💬 Start Text Chat
							</Button>
							<Button
								onClick={() => startConversation(true)}
								variant="secondary"
								size="lg"
								className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md"
							>
								🎤 Start Voice Chat
							</Button>
						</>
					) : (
						<Button
							onClick={stopConversation}
							variant="destructive"
							size="lg"
							className="w-full shadow-md"
						>
							❌ End Conversation
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
