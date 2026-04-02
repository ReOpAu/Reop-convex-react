import { createFileRoute } from "@tanstack/react-router";
import AddressFinder from "../../app/routes/address-finder";

export const Route = createFileRoute("/address-finder")({
	component: AddressFinder as any,
});
