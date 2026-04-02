import {
	handleAddressApiError,
	jsonNoStore,
	methodNotAllowed,
	parseJsonRequest,
} from "~/lib/address/api-route.server";
import { addressSearchRequestSchema } from "~/lib/address/contracts";
import { getPlaceSuggestionsService } from "~/lib/address/google-address.server";

export function loader() {
	return methodNotAllowed(["POST"]);
}

export async function action({ request }: { request: Request }) {
	try {
		const payload = await parseJsonRequest(request, addressSearchRequestSchema);
		const result = await getPlaceSuggestionsService(payload);
		return jsonNoStore(result);
	} catch (error) {
		return handleAddressApiError(error);
	}
}

export default function AddressSearchApiRoute() {
	return null;
}
