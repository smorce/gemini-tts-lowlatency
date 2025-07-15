import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@0.6.0/+esm';

// windowからAPIキーを取得
const apiKey = window.GEMINI_KEY;
if (!apiKey || apiKey === 'YOUR_API_KEY') {
  alert('APIキーを設定してください。');
  throw new Error('APIキーが設定されていません。');
}

const ai = new GoogleGenAI({ apiKey });
const ctx = new AudioContext({ sampleRate: 24000 });

await ctx.audioWorklet.addModule('/js/pcm-worklet.js');
const node = new AudioWorkletNode(ctx, 'pcm-player');
node.connect(ctx.destination);

async function speak(text) {
  // 再生前にAudioContextを再開する（ユーザー操作後に許可される）
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda', speed: 1.05} } }   // 大容量バッファでも 生成が極端に速い場合は溢れる ため，念のため TTS 側に voiceConfig.speed を少し速め（例: 1.05）に設定 し，再生側の消費速度と近づけると安定します
    }
  });

  for await (const chunk of stream) {
    const inline = chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inline?.data) continue;
    // base‑64 → Int16Array → Float32Array
    const pcm = Uint8Array.from(atob(inline.data), c => c.charCodeAt(0));
    node.port.postMessage(pcm.buffer, [pcm.buffer]);   // 共有メモリでコピー削減
  }
}

document.getElementById('speak-button')
        .addEventListener('click', () => speak(text.value));