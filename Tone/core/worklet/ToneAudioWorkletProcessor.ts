/**
 * The base AudioWorkletProcessor for use in Tone.js. Works with the [[ToneAudioWorklet]].
 */
export class ToneAudioWorkletProcessor extends AudioWorkletProcessor {

	protected disposed: boolean;
	protected blockSize: number;
	protected sampleRate: number;

	constructor(options) {
		super();
		/**
		 * If the processor was disposed or not. Keep alive until it's disposed.
		 */
		this.disposed = false;
		/**
		 * The number of samples in the processing block
		 */
		this.blockSize = 256;
		/**
		 * the sample rate
		 */
		this.sampleRate = 44100; // TODO we don't have access to sample rate due to no AudioWorklet global scope

		this.port.onmessage = (event) => {
			// when it receives a dispose
			if (event.data === "dispose") {
				this.disposed = true;
			}
		};
	}
}
