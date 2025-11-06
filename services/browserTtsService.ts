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
): void {
  // Proactively cancel any existing or pending speech. This is the most reliable
  // way to prevent the Web Speech API from getting into a confused state, which
  // is a common source of errors.
  if (tts.speaking || tts.pending) {
    tts.cancel();
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.pitch = 1;
  utterance.rate = rate;

  // Guard against the onEnd callback being called multiple times from different events.
  let hasEnded = false;
  const onEndOnce = () => {
    if (!hasEnded) {
      hasEnded = true;
      onEnd();
    }
  };

  utterance.onend = onEndOnce;
  utterance.onerror = (event) => {
    console.error('SpeechSynthesisUtterance.onerror', event);
    // Treat the error as the end of the sentence to allow playback to continue.
    onEndOnce();
  };
  
  // A small delay before speaking can prevent race conditions, especially after a cancel.
  setTimeout(() => {
    tts.speak(utterance);
  }, 100);
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
