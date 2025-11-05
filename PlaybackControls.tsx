import React from 'react';
import { PlaybackState } from './types';

// Icon Components
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>;
const PauseIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;
const StopIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>;
const LoaderIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BookmarkIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"></path></svg>;

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onAddBookmark: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onAddBookmark,
}) => {
  return (
    <div className="flex items-center space-x-6">
      <button onClick={onAddBookmark} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" aria-label="Add Bookmark">
          <BookmarkIcon className="w-6 h-6 text-white" />
      </button>
      {/* Fix: The check for 'buffering' was in a logical branch where it could never be true, causing a TypeScript error.
          The logic has been corrected to show a LoaderIcon when buffering and a PauseIcon when playing. The dead code in the 'else' branch has been removed. */}
      {playbackState === 'playing' || playbackState === 'buffering' ? (
        <button onClick={onPause} className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" aria-label="Pause">
          {playbackState === 'buffering' ? <LoaderIcon className="w-8 h-8 text-white animate-spin" /> : <PauseIcon className="w-8 h-8 text-white" />}
        </button>
      ) : (
        <button onClick={onPlay} className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 transition-colors" aria-label="Play">
          <PlayIcon className="w-8 h-8 text-white" />
        </button>
      )}
      <button onClick={onStop} className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" aria-label="Stop">
        <StopIcon className="w-8 h-8 text-white" />
      </button>
    </div>
  );
};