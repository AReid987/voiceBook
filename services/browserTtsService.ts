
export const tts = window.speechSynthesis;

export function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = tts.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    tts.onvoiceschanged = () => {
      resolve(tts.getVoices());
    };
  });
}

export function speak(
  text: string, 
  voice: SpeechSynthesisVoice, 
  rate: number, 
  onEnd: () => void
): SpeechSynthesisUtterance | null {
  if (tts.speaking) {
    // This can happen in rare race conditions, best to cancel and let the next one play
    tts.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.pitch = 1;
  utterance.rate = rate;
  utterance.onend = onEnd;
  utterance.onerror = (event) => {
    console.error('SpeechSynthesisUtterance.onerror', event);
    onEnd(); // treat error as end to continue the queue
  };
  
  tts.speak(utterance);
  return utterance;
}

export function cancel() {
  tts.cancel();
}

export function pause() {
    tts.pause();
}

export function resume() {
    tts.resume();
}
