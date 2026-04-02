import {
	handleAddressApiError,
	jsonNoStore,
	methodNotAllowed,
	parseJsonRequest,
} from "~/lib/address/api-route.server";
import { addressValidationRequestSchema } from "~/lib/address/contracts";
import { validateAddressService } from "~/lib/address/google-address.server";

export function loader() {
	return methodNotAllowed(["POST"]);
}

export async function action({ request }: { request: Request }) {
	try {
		const payload = await parseJsonRequest(
			request,
			addressValidationRequestSchema,
		);
		const result = await validateAddressService(payload);
		return jsonNoStore(result);
	} catch (error) {
		return handleAddressApiError(error);
	}
}

export default function AddressValidateApiRoute() {
	return null;
}
