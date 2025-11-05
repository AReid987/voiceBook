
import { VoiceOption } from './types';

export const VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore (Warm, Male)' },
  { id: 'Puck', name: 'Puck (Crisp, Male)' },
  { id: 'Charon', name: 'Charon (Deep, Male)' },
  { id: 'Fenrir', name: 'Fenrir (Strong, Male)' },
  { id: 'Zephyr', name: 'Zephyr (Gentle, Female)' },
];

export const PDF_JS_VERSION = '4.4.168';
export const PDF_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
