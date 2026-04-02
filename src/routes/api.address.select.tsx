import { createFileRoute } from "@tanstack/react-router";
import {
	action,
	loader,
} from "../../app/routes/api.address.select";

export const Route = createFileRoute("/api/address/select")({
	component: () => null,
	server: {
		handlers: {
			GET: () => loader(),
			POST: ({ request }) => action({ request }),
		},
	},
});
