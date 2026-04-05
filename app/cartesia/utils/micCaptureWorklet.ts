export const CARTESIA_MIC_CAPTURE_PROCESSOR_NAME =
	"cartesia-mic-capture-processor";

export interface AudioWorkletLike {
	addModule(moduleUrl: string): Promise<void>;
}

export interface ObjectUrlApi {
	createObjectURL(blob: Blob): string;
	revokeObjectURL(url: string): void;
}

export function createCartesiaMicCaptureWorkletSource(): string {
	return `
class CartesiaMicCaptureProcessor extends AudioWorkletProcessor {
	process(inputs, outputs) {
		const input = inputs[0];
		const channel = input && input[0];
		const output = outputs[0];
		if (output && output[0]) {
			output[0].fill(0);
		}
		if (channel && channel.length > 0) {
			const samples = new Float32Array(channel.length);
			samples.set(channel);
			this.port.postMessage(samples, [samples.buffer]);
		}
		return true;
	}
}

registerProcessor("${CARTESIA_MIC_CAPTURE_PROCESSOR_NAME}", CartesiaMicCaptureProcessor);
`;
}

export async function loadCartesiaMicCaptureWorklet(
	audioWorklet: AudioWorkletLike,
	objectUrlApi: ObjectUrlApi = URL,
): Promise<void> {
	const moduleBlob = new Blob([createCartesiaMicCaptureWorkletSource()], {
		type: "application/javascript",
	});
	const moduleUrl = objectUrlApi.createObjectURL(moduleBlob);

	try {
		await audioWorklet.addModule(moduleUrl);
	} finally {
		objectUrlApi.revokeObjectURL(moduleUrl);
	}
}
