import { ZodError, type ZodType } from "zod";

const NO_STORE_HEADER = "no-store";

export class AddressApiRequestError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "AddressApiRequestError";
		this.status = status;
	}
}

function withNoStoreHeaders(headers?: HeadersInit): Headers {
	const responseHeaders = new Headers(headers);
	if (!responseHeaders.has("Cache-Control")) {
		responseHeaders.set("Cache-Control", NO_STORE_HEADER);
	}
	return responseHeaders;
}

export function jsonNoStore(body: unknown, init?: ResponseInit): Response {
	return Response.json(body, {
		...init,
		headers: withNoStoreHeaders(init?.headers),
	});
}

export function methodNotAllowed(allowedMethods: string[]): Response {
	return jsonNoStore(
		{
			success: false,
			error: `Method not allowed. Use ${allowedMethods.join(", ")}.`,
		},
		{
			status: 405,
			headers: {
				Allow: allowedMethods.join(", "),
			},
		},
	);
}

export async function parseJsonRequest<T>(
	request: Request,
	schema: ZodType<T>,
): Promise<T> {
	const contentType = request.headers.get("content-type");
	if (contentType && !contentType.includes("application/json")) {
		throw new AddressApiRequestError(
			415,
			"Expected an application/json request body.",
		);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw new AddressApiRequestError(400, "Request body must be valid JSON.");
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		const message = parsed.error.issues
			.map((issue) => {
				const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
				return `${path}${issue.message}`;
			})
			.join("; ");
		throw new AddressApiRequestError(400, message || "Invalid request body.");
	}

	return parsed.data;
}

export function handleAddressApiError(error: unknown): Response {
	if (error instanceof AddressApiRequestError) {
		return jsonNoStore(
			{
				success: false,
				error: error.message,
			},
			{ status: error.status },
		);
	}

	if (error instanceof ZodError) {
		return jsonNoStore(
			{
				success: false,
				error: error.issues.map((issue) => issue.message).join("; "),
			},
			{ status: 400 },
		);
	}

	const message =
		error instanceof Error ? error.message : "Internal server error";
	return jsonNoStore(
		{
			success: false,
			error: message,
		},
		{ status: 500 },
	);
}
