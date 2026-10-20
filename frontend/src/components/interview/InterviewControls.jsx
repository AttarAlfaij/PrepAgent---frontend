import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Keyboard,
  Send,
  Sparkles,
} from 'lucide-react';

/**
 * InterviewControls — Standalone Voice-First Answer Controls Bar (Section 19)
 * Positioned directly below the Live Caption card.
 * Left: [Start/Stop Answer] (Hero Button), [Type Answer], [Replay Question], [Submit Answer]
 * Right: Device Toggles [Camera], [Microphone], [Voice]
 */
const InterviewControls = ({
  inputMode = 'voice',
  isMicActive = false,
  isCameraOn = true,
  isSpeakerOn = true,
  isSpeakingTTS = false,
  isProcessing = false,
  hasAnswerContent = false,
  onStartAnswer = () => {},
  onStopAnswer = () => {},
  onToggleInputMode = () => {},
  onSubmitAnswer = () => {},
  onReplayQuestion = () => {},
  onToggleCamera = () => {},
  onToggleMic = () => {},
  onToggleSpeaker = () => {},
  className = '',
}) => {
  return (
    <div
      className={`w-full max-w-[1440px] mx-auto bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs px-4 sm:px-5 py-2 flex-shrink-0 flex items-center justify-between flex-wrap gap-2 transition-all ${className}`}
    >
      {/* Left: Voice-First Primary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. HERO ACTION: [ 🎙 Start Answer ] / [ 🔴 Stop Answer ] */}
        {inputMode === 'voice' ? (
          isMicActive ? (
            <button
              type="button"
              onClick={onStopAnswer}
              disabled={isProcessing}
              className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-rose-600/20 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Stop Answer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartAnswer}
              disabled={isProcessing || isSpeakingTTS}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Answer</span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => {
              onToggleInputMode('voice');
              onStartAnswer();
            }}
            disabled={isProcessing || isSpeakingTTS}
            className="px-5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm flex items-center gap-2 border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4 text-blue-600" />
            <span>Switch to Voice</span>
          </button>
        )}

        {/* 2. Secondary: Type Answer fallback toggle */}
        <button
          type="button"
          onClick={() => onToggleInputMode(inputMode === 'voice' ? 'text' : 'voice')}
          disabled={isProcessing}
          className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
            inputMode === 'text'
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5 text-blue-600" />
          <span>Type Answer</span>
        </button>

        {/* 3. Replay Question Button */}
        <button
          type="button"
          onClick={onReplayQuestion}
          disabled={isProcessing || isSpeakingTTS}
          className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          title="Replay Question"
        >
          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Replay Question</span>
        </button>

        {/* 4. Submit Answer (Active when candidate has spoken or typed content) */}
        {(hasAnswerContent || isProcessing) && (
          <button
            type="button"
            onClick={onSubmitAnswer}
            disabled={isProcessing || !hasAnswerContent}
            className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Right: Media & Device Toggles (Camera, Microphone, Voice) */}
      <div className="flex items-center gap-1.5">
        {/* Camera Toggle */}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            isCameraOn
              ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraOn ? (
            <Video className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">Camera</span>
        </button>

        {/* Microphone Toggle */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            isMicActive
              ? 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs'
          }`}
          title={isMicActive ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicActive ? (
            <Mic className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <MicOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">Mic</span>
        </button>

        {/* Voice Toggle */}
        <button
          type="button"
          onClick={onToggleSpeaker}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            isSpeakerOn
              ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}
          title={isSpeakerOn ? 'Turn Off AI Voice' : 'Turn On AI Voice'}
        >
          {isSpeakerOn ? (
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">Audio</span>
        </button>
      </div>
    </div>
  );
};

export default InterviewControls;
