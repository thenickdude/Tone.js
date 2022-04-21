import { FeedbackEffect, FeedbackEffectOptions } from "../effect/FeedbackEffect";
import { Frequency, GainFactor, NormalRange } from "../core/type/Units";
import { optionsFromArguments } from "../core/util/Defaults";
import { readOnly } from "../core/util/Interface";
import { Signal } from "../signal/Signal";
import { LowpassCombFilter } from "../component/filter/LowpassCombFilter";
import { OnePoleFilter } from "../component";

export interface Freeverb1Options extends FeedbackEffectOptions {
	dampening: Frequency;
	roomSize: NormalRange;
	wetGain: GainFactor;
}

/**
 * An array of comb filter delay values from Freeverb implementation
 */
const combFilterTunings = [1557 / 44100, 1617 / 44100, 1491 / 44100, 1422 / 44100, 1277 / 44100, 1356 / 44100, 1188 / 44100, 1116 / 44100];

/**
 * An array of allpass filter frequency values from Freeverb implementation
 */
const allpassFilterFrequencies = [225, 556, 441, 341];

/**
 * Freeverb is a reverb based on [Freeverb](https://ccrma.stanford.edu/~jos/pasp/Freeverb.html).
 * Read more on reverb on [Sound On Sound](https://web.archive.org/web/20160404083902/http://www.soundonsound.com:80/sos/feb01/articles/synthsecrets.asp).
 * Freeverb is now implemented with an AudioWorkletNode which may result on performance degradation on some platforms. Consider using [[Reverb]].
 * @example
 * const freeverb = new Tone.Freeverb().toDestination();
 * freeverb.dampening = 1000;
 * // routing synth through the reverb
 * const synth = new Tone.NoiseSynth().connect(freeverb);
 * synth.triggerAttackRelease(0.05);
 * @category Effect
 */
export class Freeverb1 extends FeedbackEffect<Freeverb1Options> {

	readonly name: string = "Freeverb1";

	/**
	 * The roomSize value between 0 and 1. A larger roomSize will result in a longer decay.
	 */
	readonly roomSize: Signal<"normalRange">;

	readonly wetGain: Signal<"gain">;

	/**
	 * the comb filters
	 */
	private _combFilters: LowpassCombFilter[] = [];

	/**
	 * the allpass filters
	 */
	private _allpassFilters: BiquadFilterNode[] = [];

	/**
	 * @param roomSize Correlated to the decay time.
	 * @param dampening The cutoff frequency of a lowpass filter as part of the reverb.
	 * @param wetGain Allows to change the volume of the signal input into the wet
	 *                  branch of the filter. Doesn't affect dry output volume.
	 */
	constructor(roomSize?: NormalRange, dampening?: Frequency, wetGain?: GainFactor);
	constructor(options?: Partial<Freeverb1Options>);
	constructor() {

		super(optionsFromArguments(Freeverb1.getDefaults(), arguments, ["roomSize", "dampening", "wetGain"]));
		const options = optionsFromArguments(Freeverb1.getDefaults(), arguments, ["roomSize", "dampening", "wetGain"]);

		this.roomSize = new Signal({
			context: this.context,
			value: options.roomSize,
			units: "normalRange",
		});

		this.wetGain = new Signal({
			context: this.context,
			value: options.wetGain,
			units: "gain",
		});

		// make the allpass filters
		this._allpassFilters = allpassFilterFrequencies.map(freq => {
			const allpass = this.context.createBiquadFilter();
			allpass.type = "allpass";
			allpass.frequency.value = freq;
			return allpass;
		});

		// make the comb filters
		this._combFilters = combFilterTunings.map((delayTime, index) => {
			const lfpf = new LowpassCombFilter({
				context: this.context,
				dampening: options.dampening,
				delayTime,
			});

			this._internalChannels.push(lfpf, ...this._allpassFilters);

			this.effectSend.chain(lfpf, ...this._allpassFilters, this.effectReturn);

			this.wetGain.connect((lfpf.input as OnePoleFilter).input.gain);
			this.roomSize.connect(lfpf.resonance);
			return lfpf;
		});

		readOnly(this, ["roomSize", "wetGain"]);
	}

	static getDefaults(): Freeverb1Options {
		return Object.assign(FeedbackEffect.getDefaults(), {
			roomSize: 0.7,
			dampening: 3000,
			wetGain: 1
		});
	}

	/**
	 * The amount of dampening of the reverberant signal.
	 */

	get dampening(): Frequency {
		return this._combFilters[0].dampening;
	}
	set dampening(d) {
		this._combFilters.forEach(c => c.dampening = d);
	}

	dispose(): this {
		super.dispose();
		this._allpassFilters.forEach(al => al.disconnect());
		this._combFilters.forEach(cf => cf.dispose());
		this.roomSize.dispose();
		this.wetGain.dispose();
		return this;
	}
}
