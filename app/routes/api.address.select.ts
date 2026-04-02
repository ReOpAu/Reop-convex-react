import {
	handleAddressApiError,
	jsonNoStore,
	methodNotAllowed,
	parseJsonRequest,
} from "~/lib/address/api-route.server";
import { addressSelectRequestSchema } from "~/lib/address/contracts";
import { selectAddressService } from "~/lib/address/google-address.server";

export function loader() {
	return methodNotAllowed(["POST"]);
}

export async function action({ request }: { request: Request }) {
	try {
		const payload = await parseJsonRequest(request, addressSelectRequestSchema);
		const result = await selectAddressService(payload);
		return jsonNoStore(result);
	} catch (error) {
		return handleAddressApiError(error);
	}
}

export default function AddressSelectApiRoute() {
	return null;
}
