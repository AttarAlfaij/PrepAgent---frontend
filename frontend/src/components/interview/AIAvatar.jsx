import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, Sparkles, Radio } from 'lucide-react';
import {
  AvatarRenderer,
  AvatarAnimationController,
  AvatarExpressionController,
  AvatarGestureController,
  AvatarSpeechController,
  AVATAR_STATES,
} from './avatar';

const AIAvatar = ({
  state = 'idle', // 'idle' | 'speaking' | 'listening' | 'thinking' | 'analyzing' | 'encouraging' | 'completed'
  questionText = '',
  avatarBehavior = null,
  isMuted = false,
  onToggleMute,
  onSpeakingEnd,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);

  // Controller Instances maintained across renders
  const animCtrlRef = useRef(null);
  const exprCtrlRef = useRef(null);
  const gestCtrlRef = useRef(null);
  const speechCtrlRef = useRef(null);

  if (!animCtrlRef.current) animCtrlRef.current = new AvatarAnimationController();
  if (!exprCtrlRef.current) exprCtrlRef.current = new AvatarExpressionController();
  if (!gestCtrlRef.current) gestCtrlRef.current = new AvatarGestureController();
  if (!speechCtrlRef.current) {
    speechCtrlRef.current = new AvatarSpeechController({
      onSpeakingStart: () => {
        animCtrlRef.current?.setState(AVATAR_STATES.SPEAKING);
      },
      onSpeakingEnd: () => {
        animCtrlRef.current?.setState(AVATAR_STATES.LISTENING);
        gestCtrlRef.current?.setGesture('listening_hands');
        if (onSpeakingEnd) onSpeakingEnd();
      },
    });
  }

  // 1. Sync Interview State with Avatar Controllers
  useEffect(() => {
    const anim = animCtrlRef.current;
    const expr = exprCtrlRef.current;
    const gest = gestCtrlRef.current;

    switch (state) {
      case 'speaking':
        anim?.setState(AVATAR_STATES.SPEAKING);
        if (avatarBehavior?.gesture) gest?.setGesture(avatarBehavior.gesture);
        else gest?.setGesture('open_hand_explanation');
        if (avatarBehavior?.expression) expr?.setExpression(avatarBehavior.expression);
        else expr?.setExpression('attentive');
        break;

      case 'listening':
        anim?.setState(AVATAR_STATES.LISTENING);
        expr?.setExpression('attentive');
        gest?.setGesture('listening_hands');
        break;

      case 'thinking':
        anim?.setState(AVATAR_STATES.THINKING);
        expr?.setExpression('thinking');
        gest?.setGesture('small_hand_emphasis');
        break;

      case 'analyzing':
        anim?.setState(AVATAR_STATES.ANALYZING);
        expr?.setExpression('thinking');
        gest?.setGesture('neutral_hands');
        break;

      case 'encouraging':
        anim?.setState(AVATAR_STATES.ENCOURAGING);
        expr?.setExpression('encouraging');
        gest?.setGesture('welcoming_gesture');
        break;

      case 'completed':
        anim?.setState(AVATAR_STATES.COMPLETED);
        expr?.setExpression('smile');
        gest?.setGesture('welcoming_gesture');
        break;

      case 'idle':
      default:
        anim?.setState(AVATAR_STATES.IDLE);
        expr?.setExpression('neutral');
        gest?.setGesture('neutral_hands');
        break;
    }
  }, [state, avatarBehavior]);

  // 2. Speech Synthesis Execution
  useEffect(() => {
    const speech = speechCtrlRef.current;
    if (!speech) return;

    speech.setRate(speechRate);
    speech.setPitch(speechPitch);

    if (state === 'speaking' && questionText) {
      speech.speak(questionText, isMuted);
    } else if (state !== 'speaking' || isMuted) {
      speech.stop();
    }

    return () => {
      speech.stop();
    };
  }, [state, questionText, isMuted, speechRate, speechPitch]);

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-800 bg-slate-950 select-none group">
      {/* 1. 3D WebGL Rigged Avatar Canvas */}
      <AvatarRenderer
        animationController={animCtrlRef.current}
        expressionController={exprCtrlRef.current}
        gestureController={gestCtrlRef.current}
        speechController={speechCtrlRef.current}
        className="w-full h-full"
      />

      {/* 2. State-Specific Atmospheric Overlays */}
      {/* Speaking Pulse Glow */}
      {state === 'speaking' && (
        <div className="absolute inset-0 ring-4 ring-royal-500/30 rounded-2xl pointer-events-none transition-opacity duration-300" />
      )}

      {/* Listening Radar Ring */}
      {state === 'listening' && (
        <div className="absolute inset-0 ring-4 ring-emerald-400/30 rounded-2xl pointer-events-none transition-opacity duration-300" />
      )}

      {/* Top-Right Voice & Audio Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        <button
          type="button"
          onClick={onToggleMute}
          className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-sm cursor-pointer ${
            isMuted
              ? 'bg-rose-500/80 text-white hover:bg-rose-600'
              : 'bg-black/50 text-white/90 hover:bg-black/70 hover:text-white'
          }`}
          title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className="p-2 rounded-xl bg-black/50 backdrop-blur-md text-white/90 hover:bg-black/70 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Interviewer Voice Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Voice Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 mt-2 w-48 p-3 rounded-xl bg-white border border-slate-200 shadow-xl text-xs text-slate-700 z-30 space-y-2">
              <p className="font-bold text-slate-900 border-b pb-1">Voice Settings</p>
              <div>
                <label className="text-[10px] text-slate-500 flex justify-between">
                  <span>Speed</span>
                  <span>{speechRate}x</span>
                </label>
                <input
                  type="range"
                  min="0.75"
                  max="1.3"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-royal-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 flex justify-between">
                  <span>Pitch</span>
                  <span>{speechPitch}x</span>
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-royal-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Pill */}
      <div className="absolute bottom-4 inset-x-4 flex flex-col items-center justify-center gap-1.5 z-20 pointer-events-none">
        <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
          {state === 'speaking' && (
            <>
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 bg-royal-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" style={{ height: '60%' }} />
                <span className="w-1 bg-royal-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" style={{ height: '100%' }} />
                <span className="w-1 bg-royal-400 rounded-full animate-[pulse_0.3s_ease-in-out_infinite]" style={{ height: '40%' }} />
                <span className="w-1 bg-royal-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" style={{ height: '80%' }} />
              </div>
              <span className="text-[11px] tracking-wide">Speaking...</span>
            </>
          )}

          {state === 'listening' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] tracking-wide text-emerald-300">Listening...</span>
            </>
          )}

          {state === 'analyzing' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] tracking-wide text-amber-300">Analyzing answer...</span>
            </>
          )}

          {state === 'thinking' && (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] tracking-wide text-indigo-300">Formulating question...</span>
            </>
          )}

          {state === 'encouraging' && (
            <>
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[11px] tracking-wide text-purple-300">Encouraging</span>
            </>
          )}

          {state === 'completed' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] tracking-wide text-emerald-300">Interview Complete</span>
            </>
          )}

          {state === 'idle' && (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-[11px] tracking-wide text-slate-300">Ready</span>
            </>
          )}
        </div>

        <div className="text-[11px] font-semibold text-white/90 drop-shadow-sm tracking-wide">
          PrepAgent AI Interviewer (Sarah)
        </div>
      </div>
    </div>
  );
};

export default AIAvatar;
