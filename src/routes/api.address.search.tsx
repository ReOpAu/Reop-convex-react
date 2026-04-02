import { createFileRoute } from "@tanstack/react-router";
import {
	action,
	loader,
} from "../../app/routes/api.address.search";

export const Route = createFileRoute("/api/address/search")({
	component: () => null,
	server: {
		handlers: {
			GET: () => loader(),
			POST: ({ request }) => action({ request }),
		},
	},
});
