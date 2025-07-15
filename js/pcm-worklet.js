const MAX_SECONDS = 30;                   // ←用途に応じて調整
const CAPACITY    = sampleRate * MAX_SECONDS; // 24kHz → 720kSample
class PCMPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf  = new Float32Array(CAPACITY);
    this.wptr = 0;
    this.rptr = 0;

    // 受信処理 --------------------------------------------------
    this.port.onmessage = ({data}) => {
      const u8  = new Uint8Array(data);
      const i16 = new Int16Array(u8.buffer);
      for (let s of i16) {
        const nxt = (this.wptr + 1) % CAPACITY;
        if (nxt === this.rptr) break;     // ★バッファ満杯→これ以降破棄
        this.buf[this.wptr] = s / 0x8000;
        this.wptr = nxt;
      }
    };
  }

  // 再生処理 ----------------------------------------------------
  process(_, outputs) {
    const out = outputs[0][0];            // 128 frame
    for (let i = 0; i < out.length; i++) {
      if (this.rptr !== this.wptr) {
        out[i] = this.buf[this.rptr];
        this.rptr = (this.rptr + 1) % CAPACITY;
      } else {
        out[i] = 0;                       // 無音補完
      }
    }
    return true;
  }
}
registerProcessor('pcm-player', PCMPlayer);
