import { createFileRoute } from "@tanstack/react-router";
import {
	action,
	loader,
} from "../../app/routes/api.address.validate";

export const Route = createFileRoute("/api/address/validate")({
	component: () => null,
	server: {
		handlers: {
			GET: () => loader(),
			POST: ({ request }) => action({ request }),
		},
	},
});
