import { createFileRoute } from "@tanstack/react-router";
import {
	action,
	loader,
} from "../../app/routes/api.address.details";

export const Route = createFileRoute("/api/address/details")({
	component: () => null,
	server: {
		handlers: {
			GET: () => loader(),
			POST: ({ request }) => action({ request }),
		},
	},
});
