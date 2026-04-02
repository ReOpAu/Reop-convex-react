import { createFileRoute } from "@tanstack/react-router";
import { loader as healthLoader } from "../../app/routes/health";

export const Route = createFileRoute("/health")({
	component: () => null,
	server: {
		handlers: {
			GET: () => healthLoader(),
		},
	},
});
