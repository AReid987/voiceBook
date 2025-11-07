import { KokoroTTS } from '../kokoro.js';

let kokoro: KokoroTTS | null = null;

export async function initializeKokoro() {
  if (!kokoro) {
    // @ts-ignore
    const { env, KokoroTTS } = await import('../kokoro.js');
    env.allowLocalModels = false;
    kokoro = await KokoroTTS.from_pretrained('rhulha/kokoro-small');
  }
  return kokoro;
}

export async function generateKokoroSpeech(text: string, voice: string, speed: number) {
  if (!kokoro) {
    throw new Error('Kokoro TTS not initialized');
  }
  return await kokoro.generate(text, { voice, speed });
}
