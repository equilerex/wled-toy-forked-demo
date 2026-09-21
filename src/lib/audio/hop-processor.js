// AudioWorklet: gathers render quanta (128 samples) into hops of one channel and posts them to the page.
// Plain JS on purpose: worklets load by URL, outside the bundler's TypeScript pipeline.
class HopProcessor extends AudioWorkletProcessor {
  constructor({ processorOptions }) {
    super()
    this.hop = new Float32Array(processorOptions.hop)
    this.filled = 0
    this.channel = processorOptions.channel
    this.port.onmessage = ({ data }) => {
      if (data.channel) this.channel = data.channel
    }
  }

  process([input]) {
    const left = input[0]
    if (!left) return true
    const right = input[1] ?? left
    for (let i = 0; i < left.length; i++) {
      this.hop[this.filled++] = this.channel === 'left' ? left[i] : this.channel === 'right' ? right[i] : (left[i] + right[i]) / 2
      if (this.filled === this.hop.length) {
        this.port.postMessage(this.hop.slice())
        this.filled = 0
      }
    }
    return true
  }
}

registerProcessor('hop-processor', HopProcessor)
