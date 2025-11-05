
export interface VoiceOption {
  id: string;
  name: string;
}

export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'buffering';

export interface Chapter {
  title: string;
  sentenceIndex: number;
}

export interface Bookmark {
  sentenceIndex: number;
  textSnippet: string;
}
