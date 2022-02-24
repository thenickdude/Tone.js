import { FeedbackEffect, FeedbackEffectOptions } from "../effect/FeedbackEffect";
import { Degrees, Frequency, Milliseconds, NormalRange, Seconds, Time } from "../core/type/Units";
import { ToneOscillatorType } from "../source/oscillator/OscillatorInterface";
import { optionsFromArguments } from "../core/util/Defaults";
import { LFO } from "../source/oscillator/LFO";
import { Delay } from "../core/context/Delay";
import { Signal } from "../signal/Signal";
import { readOnly } from "../core/util/Interface";

export interface Chorus1Options extends FeedbackEffectOptions {
	frequency: Frequency;
	delayTime: Milliseconds;
	depth: NormalRange;
	type: ToneOscillatorType;
	spread: Degrees;
	channel: number; // New option to tell us if this is channel 0 or channel 1
}

/**
 * This variant of Chorus takes a single input channel instead of two. This allows you to
 * process both channels separately but end up with the same effect in the end.
 *
 * @category Effect
 */
export class Chorus1 extends FeedbackEffect<Chorus1Options> {

	readonly name: string = "Chorus1";

	/**
	 * the depth of the chorus
	 */
	private _depth: NormalRange;

	/**
	 * the delayTime in seconds.
	 */
	private _delayTime: Seconds;

	/**
	 * the lfo which controls the delayTime
	 */
	private _lfo: LFO

	/**
	 * delay
	 */
	private _delayNode: Delay;

	private _channel: number;

	/**
	 * The frequency of the LFO which modulates the delayTime.
	 */
	readonly frequency: Signal<"frequency">

	/**
	 * @param frequency The frequency of the LFO.
	 * @param delayTime The delay of the chorus effect in ms.
	 * @param depth The depth of the chorus.
	 * @param channel 0 or 1, for the left or right channel
	 */
	constructor(frequency?: Frequency, delayTime?: Milliseconds, depth?: NormalRange, channel?: number);
	constructor(options?: Partial<Chorus1Options>);
	constructor() {

		super(optionsFromArguments(Chorus1.getDefaults(), arguments, ["frequency", "delayTime", "depth", "channel"]));
		const options = optionsFromArguments(Chorus1.getDefaults(), arguments, ["frequency", "delayTime", "depth", "channel"]);

		this._channel = options.channel;
		this._depth = options.depth;
		this._delayTime = options.delayTime / 1000;
		this._lfo = new LFO({
			context: this.context,
			frequency: options.frequency,
			min: 0,
			max: 1,
			phase: 180 * options.channel
		});
		this._delayNode = new Delay({ context: this.context });
		this.frequency = this._lfo.frequency;
		readOnly(this, ["frequency"]);

		// connections
		this.connectEffect(this._delayNode);
		// lfo setup
		this._lfo.connect(this._delayNode.delayTime);
		// set the initial values
		this.depth = this._depth;
		this.type = options.type;
		this.spread = options.spread;
	}

	static getDefaults(): Chorus1Options {
		return Object.assign(FeedbackEffect.getDefaults(), {
			frequency: 1.5,
			delayTime: 3.5,
			depth: 0.7,
			type: "sine" as const,
			spread: 180,
			feedback: 0,
			wet: 0.5,
			channel: 0
		});
	}

	/**
	 * The depth of the effect. A depth of 1 makes the delayTime
	 * modulate between 0 and 2*delayTime (centered around the delayTime).
	 */
	get depth(): NormalRange {
		return this._depth;
	}
	set depth(depth) {
		this._depth = depth;
		const deviation = this._delayTime * depth;
		this._lfo.min = Math.max(this._delayTime - deviation, 0);
		this._lfo.max = this._delayTime + deviation;
	}

	/**
	 * The delayTime in milliseconds of the chorus. A larger delayTime
	 * will give a more pronounced effect. Nominal range a delayTime
	 * is between 2 and 20ms.
	 */
	get delayTime(): Milliseconds {
		return this._delayTime * 1000;
	}
	set delayTime(delayTime) {
		this._delayTime = delayTime / 1000;
		this.depth = this._depth;
	}

	/**
	 * The oscillator type of the LFO.
	 */
	get type(): ToneOscillatorType {
		return this._lfo.type;
	}
	set type(type) {
		this._lfo.type = type;
	}

	/**
	 * Amount of stereo spread. When set to 0, both LFO's will be panned centrally.
	 * When set to 180, LFO's will be panned hard left and right respectively.
	 */
	get spread(): Degrees {
		return Math.abs(this._lfo.phase - 90) * 2;
	}
	set spread(spread) {
		if (this._channel === 0) {
			this._lfo.phase = 90 - (spread / 2);
		} else {
			this._lfo.phase = (spread / 2) + 90;
		}
	}

	/**
	 * Start the effect.
	 */
	start(time?: Time): this {
		this._lfo.start(time);
		return this;
	}

	/**
	 * Stop the lfo
	 */
	stop(time?: Time): this {
		this._lfo.stop(time);
		return this;
	}

	/**
	 * Sync the filter to the transport. See [[LFO.sync]]
	 */
	sync(): this {
		this._lfo.sync();
		return this;
	}

	/**
	 * Unsync the filter from the transport.
	 */
	unsync(): this {
		this._lfo.unsync();
		return this;
	}

	dispose(): this {
		super.dispose();
		this._lfo.dispose();
		this._delayNode.dispose();
		this.frequency.dispose();
		return this;
	}
}
