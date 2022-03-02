import "../core/worklet/SingleIOProcessor";
import { SingleIOProcessor } from "../core/worklet/SingleIOProcessor";

export const workletName = "bit-crusher";

export class BitCrusherProcessor extends SingleIOProcessor {

	static get parameterDescriptors() {
		return [{
			name: "bits",
			defaultValue: 12,
			minValue: 1,
			maxValue: 16,
			automationRate: "k-rate"
		}];
	}

	generate(input, _channel, parameters) {
		const step = Math.pow(0.5, parameters.bits - 1);
		const val = step * Math.floor(input / step + 0.5);
		return val;
	}
}
