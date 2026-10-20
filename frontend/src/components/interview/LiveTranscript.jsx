import React from 'react';

/**
 * LiveTranscript — Live Subtitle Caption Card (Sections 14, 15, 18)
 * Positioned directly below the Question card as its own full-width element.
 * - Compact height: ~52–65px
 * - Behaves strictly as a live subtitle area with zero scrollbar
 * - Displays the most recent words (sliding window)
 * - Preserves complete internal transcript for evaluation and report
 */
const LiveTranscript = ({
  isSpeakingTTS = false,
  questionText = '',
  isMicActive = false,
  inputMode = 'voice',
  finalTranscript = '',
  interimTranscript = '',
  typedAnswer = '',
  onTypedAnswerChange = () => {},
  speechError = null,
  isProcessing = false,
  className = '',
}) => {
  // Helper to extract the most recent words (sliding subtitle window)
  const getRecentWords = (text, maxWords = 22) => {
    if (!text || !text.trim()) return '';
    const tokens = text.trim().split(/\s+/);
    if (tokens.length <= maxWords) return text.trim();
    return '… ' + tokens.slice(-maxWords).join(' ');
  };

  const liveSpokenDisplay = `${finalTranscript} ${interimTranscript}`.trim();
  const recentFinal = getRecentWords(finalTranscript, 18);

  return (
    <div
      className={`w-full max-w-[1440px] mx-auto bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs px-4 sm:px-5 py-2 flex-shrink-0 flex flex-col gap-1 overflow-hidden transition-all ${className}`}
    >
      {/* Top Header: LIVE CAPTION + [● AI Speaking] / [● Listening] / [✦ Thinking...] */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          LIVE CAPTION
        </span>
        {isSpeakingTTS ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>AI Speaking</span>
          </span>
        ) : isMicActive ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Listening</span>
          </span>
        ) : null}
      </div>

      {/* Subtitle Caption Area (Fixed compact height, NO scrollbar) */}
      <div className="h-[36px] sm:h-[40px] overflow-hidden flex items-center">
        {inputMode === 'voice' ? (
          isSpeakingTTS ? (
            <p className="text-xs sm:text-[13px] text-slate-600 italic leading-snug line-clamp-2">
              "{getRecentWords(questionText, 25) || 'Speaking question...'}"
            </p>
          ) : liveSpokenDisplay ? (
            <p className="text-xs sm:text-[13px] text-slate-800 leading-snug font-normal line-clamp-2">
              <span>{recentFinal}</span>
              {interimTranscript && (
                <span className="text-blue-600 font-medium"> [{interimTranscript.trim()}]</span>
              )}
            </p>
          ) : (
            <p className="text-xs sm:text-[13px] text-slate-400 italic">
              {speechError ? speechError : "Start speaking when you're ready, or click Start Answer..."}
            </p>
          )
        ) : (
          <input
            type="text"
            value={typedAnswer}
            onChange={(e) => onTypedAnswerChange(e.target.value)}
            placeholder="Type your response here..."
            disabled={isProcessing}
            className="w-full rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none px-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 h-[32px]"
          />
        )}
      </div>
    </div>
  );
};

export default LiveTranscript;
