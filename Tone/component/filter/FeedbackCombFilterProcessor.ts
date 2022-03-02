import { DelayLine } from "../../core/worklet/DelayLine";
import { SingleIOProcessor } from "../../core/worklet/SingleIOProcessor";

export const workletName = "feedback-comb-filter";

export class FeedbackCombFilterProcessor extends SingleIOProcessor {
	private delayLine: DelayLine;

	constructor(options) {
		super(options);
		this.delayLine = new DelayLine(this.sampleRate, options.channelCount || 2);
	}

	static get parameterDescriptors() {
		return [{
			name: "delayTime",
			defaultValue: 0.1,
			minValue: 0,
			maxValue: 1,
			automationRate: "k-rate"
		}, {
			name: "feedback",
			defaultValue: 0.5,
			minValue: 0,
			maxValue: 0.9999,
			automationRate: "k-rate"
		}];
	}

	generate(input, channel, parameters) {
		const delayedSample = this.delayLine.get(channel, parameters.delayTime * this.sampleRate);
		this.delayLine.push(channel, input + delayedSample * parameters.feedback);
		return delayedSample;
	}
}
