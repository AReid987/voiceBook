import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PlaybackState, VoiceOption, Chapter, Bookmark, VoiceEngine } from './types';
import { VOICES } from './constants';
import { parsePdf } from './services/pdfParserService';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, decodeAudioData } from './services/audioUtils';
import * as browserTtsService from './services/browserTtsService';
import { PlaybackControls } from './PlaybackControls';

// Icon Components
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>;
const LoaderIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BookOpenIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
const BookmarkIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>;
const ListIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"></path></svg>;
const SpeedIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 13.41c.44-.44.66-1.01.66-1.62s-.22-1.18-.66-1.62l-4.24-4.24c-.78-.78-2.05-.78-2.83 0s-.78 2.05 0 2.83l4.24 4.24c.78.78 2.05.78 2.83 0zM12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8z"></path></svg>;
const ChevronDownIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>;
const SettingsIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>;

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini-api-key') || process.env.API_KEY || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<string>(VOICES[0].id);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => { isPlayingRef.current = playbackState === 'playing' || playbackState === 'buffering'; }, [playbackState]);
  useEffect(() => { if (currentSourceRef.current) { currentSourceRef.current.playbackRate.value = playbackRate; } }, [playbackRate]);
  useEffect(() => {
    browserTtsService.getBrowserVoices().then(voices => {
      const filteredVoices = voices.filter(v => v.lang.startsWith('en'));
      setBrowserVoices(filteredVoices);
      if (filteredVoices.length > 0) {
        setSelectedBrowserVoiceUri(filteredVoices[0].voiceURI);
      }
    });
  }, []);
  useEffect(() => { localStorage.setItem('gemini-api-key', apiKey); }, [apiKey]);
  useEffect(() => {
    if (currentSentenceRef.current) {
        currentSentenceRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
  }, [currentSentenceIndex]);

  const cleanupAudio = useCallback(() => {
    if (currentSourceRef.current) {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
    }
    audioContextRef.current = null;
    browserTtsService.cancel();
  }, []);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
        setError("Please select a valid PDF file."); return;
    }
    handleReset();
    setIsLoading(true); setLoadingMessage('Parsing your book...'); setError(null); setFile(selectedFile);
    const title = selectedFile.name.replace('.pdf', '');
    setBookTitle(title);
    try {
        const { sentences: parsedSentences, chapters: detectedChapters } = await parsePdf(selectedFile);
        if (parsedSentences.length === 0) { setError("Could not extract any text from the PDF."); } 
        else {
            setSentences(parsedSentences);
            setChapters(detectedChapters);
            const savedBookmarks = localStorage.getItem(`audiobook-bookmarks-${title}`);
            if (savedBookmarks) { setBookmarks(JSON.parse(savedBookmarks)); }
        }
    } catch (err: any) { setError(err.message || "An unknown error occurred during parsing."); } 
    finally { setIsLoading(false); setLoadingMessage(''); }
  };
  
  const playSentence = useCallback(async (index: number) => {
    if (index >= sentences.length) { setPlaybackState('stopped'); cleanupAudio(); setCurrentSentenceIndex(0); return; }
    if (!isPlayingRef.current) return;
    
    setCurrentSentenceIndex(index);
    setError(null);
    
    if (voiceEngine === 'gemini') {
        if (!apiKey) { setError("Please set your Gemini API key in Settings."); setPlaybackState('stopped'); return; }
        setPlaybackState('buffering');
        try {
          const audioB64 = await generateSpeech(sentences[index], selectedGeminiVoice, apiKey);
          const audioBytes = decodeBase64(audioB64);
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') { audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); }
          const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
          if (!isPlayingRef.current) return;
          if (audioContextRef.current.state === 'suspended') { await audioContextRef.current.resume(); }
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRate;
          source.connect(audioContextRef.current.destination);
          source.onended = () => { if (isPlayingRef.current) { playSentence(index + 1); } };
          currentSourceRef.current = source;
          source.start();
          setPlaybackState('playing');
        } catch (err: any) { setError(err.message || "Failed to play audio."); setPlaybackState('stopped'); cleanupAudio(); }
    } else {
        const voice = browserVoices.find(v => v.voiceURI === selectedBrowserVoiceUri);
        if (!voice) { setError("No browser voice selected."); setPlaybackState('stopped'); return; }
        setPlaybackState('playing');
        browserTtsService.speak(sentences[index], voice, playbackRate, () => { if (isPlayingRef.current) { playSentence(index + 1); } });
    }
  }, [sentences, selectedGeminiVoice, cleanupAudio, playbackRate, voiceEngine, apiKey, browserVoices, selectedBrowserVoiceUri]);

  const handlePlay = () => {
    if (playbackState === 'paused') {
      if (voiceEngine === 'gemini' && audioContextRef.current) { audioContextRef.current.resume(); } 
      else { browserTtsService.resume(); }
      setPlaybackState('playing');
    } else if (playbackState === 'stopped' && sentences.length > 0) {
      setPlaybackState('playing');
      playSentence(currentSentenceIndex);
    }
  };

  const handlePause = () => {
    if (playbackState !== 'playing') return;
    if (voiceEngine === 'gemini' && audioContextRef.current) { audioContextRef.current.suspend(); } 
    else { browserTtsService.pause(); }
    setPlaybackState('paused');
  };

  const handleStop = () => {
    setPlaybackState('stopped');
    cleanupAudio();
    setCurrentSentenceIndex(0);
  };
  
  const handleReset = () => {
    handleStop();
    setFile(null); setBookTitle(''); setSentences([]); setChapters([]); setBookmarks([]); setError(null); setIsLoading(false);
  };

  const handleJumpToSentence = (index: number) => {
    const wasPlaying = isPlayingRef.current;
    cleanupAudio();
    setPlaybackState('stopped');
    setTimeout(() => {
        setCurrentSentenceIndex(index);
        if (wasPlaying) { setPlaybackState('playing'); playSentence(index); }
    }, 100);
  };

  const handleAddBookmark = () => {
    if (!file || sentences.length === 0) return;
    const newBookmark: Bookmark = { sentenceIndex: currentSentenceIndex, textSnippet: sentences[currentSentenceIndex].substring(0, 40) + '...' };
    if (!bookmarks.some(b => b.sentenceIndex === newBookmark.sentenceIndex)) {
        const updatedBookmarks = [...bookmarks, newBookmark].sort((a, b) => a.sentenceIndex - b.sentenceIndex);
        setBookmarks(updatedBookmarks);
        localStorage.setItem(`audiobook-bookmarks-${bookTitle}`, JSON.stringify(updatedBookmarks));
    }
  };

  const handleDeleteBookmark = (indexToDelete: number) => {
    if (!file) return;
    const updatedBookmarks = bookmarks.filter(b => b.sentenceIndex !== indexToDelete);
    setBookmarks(updatedBookmarks);
    localStorage.setItem(`audiobook-bookmarks-${bookTitle}`, JSON.stringify(updatedBookmarks));
  };

  const renderVoiceSelector = () => {
    if (voiceEngine === 'gemini') {
        return (
          <select id="voice-select" value={selectedGeminiVoice} onChange={(e) => setSelectedGeminiVoice(e.target.value)} disabled={playbackState !== 'stopped'} className="bg-gray-700 text-white rounded-md px-2 py-1 text-sm border-transparent focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 w-full">
            {VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
          </select>
        );
    }
    return (
        <select id="voice-select" value={selectedBrowserVoiceUri || ''} onChange={(e) => setSelectedBrowserVoiceUri(e.target.value)} disabled={playbackState !== 'stopped' || browserVoices.length === 0} className="bg-gray-700 text-white rounded-md px-2 py-1 text-sm border-transparent focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 w-full">
            {browserVoices.map((voice) => ( <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option> ))}
        </select>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="p-6 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">PDF Audiobook Narrator</h1>
            <p className="text-gray-400 mt-1 text-sm">Your personal AI storyteller</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Settings"><SettingsIcon className="w-6 h-6"/></button>
        </header>
        
        <main className="flex-grow p-6 md:p-8">
          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-6">
              <BookOpenIcon className="w-24 h-24 text-indigo-500" />
              <h2 className="text-xl font-semibold">Upload Your Book</h2>
              <p className="text-gray-400 text-center max-w-md">Only do it if you are really cool and super smart though.</p>
              <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isLoading} />
              <label htmlFor="pdf-upload" className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'}`}>
                {isLoading ? ( <span className="flex items-center"><LoaderIcon className="w-5 h-5 mr-2 animate-spin" />{loadingMessage}</span> ) : 'Select PDF File'}
              </label>
              {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <h2 className="text-2xl font-bold text-center truncate w-full px-4" title={bookTitle}>{bookTitle}</h2>
              <div className="w-full p-4 bg-gray-900/70 rounded-lg h-64 overflow-y-auto text-lg leading-relaxed">
                {sentences.length > 0 ? (
                  <p className="text-left">
                    {sentences.map((sentence, index) => (
                      <span
                        key={index}
                        ref={index === currentSentenceIndex ? currentSentenceRef : null}
                        onClick={() => handleJumpToSentence(index)}
                        className={`cursor-pointer transition-all duration-300 p-1 rounded ${
                          index === currentSentenceIndex
                            ? 'bg-indigo-500/30 text-indigo-200'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                      >
                        {sentence}{' '}
                      </span>
                    ))}
                  </p>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-lg text-gray-300 italic">Ready to start.</p>
                  </div>
                )}
              </div>
              <div className="w-full flex items-center justify-between text-sm text-gray-400">
                <span>{currentSentenceIndex + 1} / {sentences.length}</span>
                <div className="w-1/2">{renderVoiceSelector()}</div>
              </div>
              <div className="w-full grid grid-cols-3 gap-2 items-center text-sm text-gray-400">
                <div className="relative group">
                    <button disabled={chapters.length === 0} className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ListIcon className="w-5 h-5" /><span>Chapters</span><ChevronDownIcon className="w-4 h-4" /></button>
                    <div className="absolute bottom-full mb-2 w-full bg-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto hidden group-hover:block z-10">{chapters.map(chap => <a key={chap.sentenceIndex} onClick={() => handleJumpToSentence(chap.sentenceIndex)} className="block px-4 py-2 text-xs truncate hover:bg-gray-600 cursor-pointer">{chap.title}</a>)}</div>
                </div>
                 <div className="relative group">
                    <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"><BookmarkIcon className="w-5 h-5" /><span>Bookmarks</span><ChevronDownIcon className="w-4 h-4" /></button>
                     <div className="absolute bottom-full mb-2 w-full bg-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto hidden group-hover:block z-10">
                        {bookmarks.length > 0 ? bookmarks.map(bm => (
                            <div key={bm.sentenceIndex} className="flex items-center justify-between px-4 py-2 hover:bg-gray-600">
                                <a onClick={() => handleJumpToSentence(bm.sentenceIndex)} className="text-xs truncate cursor-pointer flex-1 pr-2">{bm.textSnippet}</a>
                                <button onClick={() => handleDeleteBookmark(bm.sentenceIndex)} className="text-red-400 hover:text-red-300 text-xs font-bold">X</button>
                            </div>
                        )) : <span className="block px-4 py-2 text-xs text-gray-500">No bookmarks yet.</span>}
                    </div>
                </div>
                <div className="relative group">
                    <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"><SpeedIcon className="w-5 h-5" /><span>{playbackRate}x Speed</span><ChevronDownIcon className="w-4 h-4" /></button>
                     <div className="absolute bottom-full mb-2 w-full bg-gray-700 rounded-lg shadow-lg overflow-y-auto hidden group-hover:block z-10">{PLAYBACK_SPEEDS.map(speed => <a key={speed} onClick={() => setPlaybackRate(speed)} className="block px-4 py-2 text-xs text-center hover:bg-gray-600 cursor-pointer">{speed}x</a>)}</div>
                </div>
              </div>
              <PlaybackControls playbackState={playbackState} onPlay={handlePlay} onPause={handlePause} onStop={handleStop} onAddBookmark={handleAddBookmark} />
              {playbackState === 'buffering' && <p className="text-sm text-indigo-400">Generating audio...</p>}
              {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
              <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-4">Upload another book</button>
            </div>
          )}
        </main>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsSettingsOpen(false)}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Voice Engine</label>
                        <div className="flex rounded-md bg-gray-700 p-1">
                            <button onClick={() => setVoiceEngine('gemini')} className={`w-1/2 py-2 text-sm rounded ${voiceEngine === 'gemini' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-600'}`}>Gemini AI</button>
                            <button onClick={() => setVoiceEngine('browser')} className={`w-1/2 py-2 text-sm rounded ${voiceEngine === 'browser' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-600'}`}>Browser</button>
                        </div>
                    </div>
                    {voiceEngine === 'gemini' && (
                        <div>
                            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-400 mb-2">Gemini API Key</label>
                            <input type="password" id="api-key-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your API key" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
                            <p className="text-xs text-gray-500 mt-1">Your key is stored locally in your browser and never sent to our servers.</p>
                        </div>
                    )}
                    {voiceEngine === 'browser' && (
                         <p className="text-sm text-gray-400">Using your browser's built-in voices. Quality may vary. Works offline.</p>
                    )}
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded">Close</button>
            </div>
        </div>
      )}
    </div>
  );
}