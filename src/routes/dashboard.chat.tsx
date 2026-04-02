import { createFileRoute } from "@tanstack/react-router";
import Chat from "../../app/routes/dashboard/chat";

export const Route = createFileRoute("/dashboard/chat")({
	component: Chat as any,
});
