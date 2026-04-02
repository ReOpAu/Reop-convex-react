import {
	handleAddressApiError,
	jsonNoStore,
	methodNotAllowed,
	parseJsonRequest,
} from "~/lib/address/api-route.server";
import { addressDetailsRequestSchema } from "~/lib/address/contracts";
import { getPlaceDetailsService } from "~/lib/address/google-address.server";

export function loader() {
	return methodNotAllowed(["POST"]);
}

export async function action({ request }: { request: Request }) {
	try {
		const payload = await parseJsonRequest(request, addressDetailsRequestSchema);
		const result = await getPlaceDetailsService(payload);
		return jsonNoStore(result);
	} catch (error) {
		return handleAddressApiError(error);
	}
}

export default function AddressDetailsApiRoute() {
	return null;
}
