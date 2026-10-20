import React, { useEffect, useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import AvatarRenderer from '../interview/avatar/AvatarRenderer';
import {
  AvatarAnimationController,
  AVATAR_STATES,
} from '../interview/avatar/AvatarAnimationController';
import {
  AvatarExpressionController,
  EXPRESSIONS,
} from '../interview/avatar/AvatarExpressionController';
import { AvatarSpeechController } from '../interview/avatar/AvatarSpeechController';

/**
 * HumanInterviewerAvatar
 *
 * Real-Time 3D WebGL Photorealistic Human AI Interviewer (Sarah J.)
 *
 * CRITICAL: Zero human JPG/PNG images.
 * Rendered using a fully articulated 3D photorealistic humanoid mesh in Three.js WebGL:
 * 1. 3D Female Executive Anatomy: Avaturn human head & upper body scan with realistic skin texture.
 * 2. Video-call framing: Head, Shoulders, Upper Torso at eye level.
 * 3. NO hand/arm gestures (interviewer remains calm, professional, seated naturally).
 * 4. Real-time Syllable Lip-Sync & Jaw Articulation driven by speech synthesis.
 * 5. Natural Poisson-like Eye Blinking & Saccadic Eye Gaze.
 * 6. Attentive listening reactions and micro-nods while candidate speaks.
 * 7. Responsive full-width stage with floating candidate camera and real-time state badges.
 */
const HumanInterviewerAvatar = ({
  avatarState = 'IDLE',
  isSpeaking = false,
  isListening = false,
  subtlePrompt = null,
  interviewerName = 'Sarah J.',
  companyName = 'Target Company',
  candidateCamera = null,
  className = '',
}) => {
  // Controller instances maintained across renders
  const animCtrlRef = useRef(null);
  const exprCtrlRef = useRef(null);
  const speechCtrlRef = useRef(null);

  // Equalizer waveform tick for bottom-center badge
  const [waveTick, setWaveTick] = useState(0);

  // Initialize controllers
  if (!animCtrlRef.current) animCtrlRef.current = new AvatarAnimationController();
  if (!exprCtrlRef.current) exprCtrlRef.current = new AvatarExpressionController();
  if (!speechCtrlRef.current) speechCtrlRef.current = new AvatarSpeechController();

  // Normalize effective interview state
  const effectiveState = isSpeaking
    ? 'SPEAKING'
    : isListening
    ? subtlePrompt
      ? 'ENCOURAGING'
      : 'LISTENING'
    : avatarState === 'THINKING'
    ? 'THINKING'
    : avatarState === 'ENCOURAGING'
    ? 'ENCOURAGING'
    : 'IDLE';

  // 1. Sync Interview State with 3D Controllers
  useEffect(() => {
    const anim = animCtrlRef.current;
    const expr = exprCtrlRef.current;
    const speech = speechCtrlRef.current;

    switch (effectiveState) {
      case 'SPEAKING':
        anim?.setState(AVATAR_STATES.SPEAKING);
        expr?.setExpression(EXPRESSIONS.ATTENTIVE);
        if (speech) speech.isSpeaking = true;
        break;

      case 'LISTENING':
        anim?.setState(AVATAR_STATES.LISTENING);
        expr?.setExpression(EXPRESSIONS.ATTENTIVE);
        if (speech) {
          speech.isSpeaking = false;
          speech.mouthOpen = 0;
        }
        break;

      case 'THINKING':
        anim?.setState(AVATAR_STATES.THINKING);
        expr?.setExpression(EXPRESSIONS.THINKING);
        if (speech) {
          speech.isSpeaking = false;
          speech.mouthOpen = 0;
        }
        break;

      case 'ENCOURAGING':
        anim?.setState(AVATAR_STATES.ENCOURAGING);
        expr?.setExpression(EXPRESSIONS.ENCOURAGING);
        if (speech) {
          speech.isSpeaking = false;
          speech.mouthOpen = 0;
        }
        break;

      case 'IDLE':
      default:
        anim?.setState(AVATAR_STATES.IDLE);
        expr?.setExpression(EXPRESSIONS.NEUTRAL);
        if (speech) {
          speech.isSpeaking = false;
          speech.mouthOpen = 0;
        }
        break;
    }
  }, [effectiveState]);

  // 3. Speaking Audio Waveform & Real-Time Mouth Modulation Loop
  useEffect(() => {
    if (effectiveState !== 'SPEAKING') {
      if (speechCtrlRef.current) speechCtrlRef.current.mouthOpen = 0;
      return;
    }

    let nextSyllableTime = Date.now();
    let syllableDuration = 180;
    let syllableCount = 0;
    let targetMouth = 0;

    const interval = setInterval(() => {
      setWaveTick((t) => (t + 1) % 100);

      // Syllable oscillation for real-time jaw/mouth movement
      const now = Date.now();
      if (now >= nextSyllableTime) {
        syllableCount++;
        if (syllableCount % 14 === 0) {
          syllableDuration = 260 + Math.random() * 140;
          targetMouth = 0.0;
        } else if (syllableCount % 4 === 0) {
          syllableDuration = 110 + Math.random() * 80;
          targetMouth = 0.15;
        } else {
          const isVowel = Math.random() > 0.35;
          targetMouth = isVowel ? 0.7 + Math.random() * 0.3 : 0.25 + Math.random() * 0.35;
          syllableDuration = 130 + Math.random() * 110;
        }
        nextSyllableTime = now + syllableDuration;
      }

      if (speechCtrlRef.current) {
        const cur = speechCtrlRef.current.mouthOpen || 0;
        speechCtrlRef.current.mouthOpen = cur + (targetMouth - cur) * 0.35;
      }
    }, 75);

    return () => {
      clearInterval(interval);
      if (speechCtrlRef.current) speechCtrlRef.current.mouthOpen = 0;
    };
  }, [effectiveState]);

  // 6 Equalizer Bars for Bottom-Center Speaking Badge
  const waveformHeights = [
    Math.sin(waveTick * 0.9) * 5 + 8,
    Math.cos(waveTick * 0.7) * 8 + 14,
    Math.sin(waveTick * 1.2) * 11 + 20,
    Math.cos(waveTick * 1.0) * 9 + 16,
    Math.sin(waveTick * 0.8) * 7 + 12,
    Math.cos(waveTick * 0.6) * 4 + 7,
  ];

  return (
    <div
      className={`relative w-full h-full rounded-2xl sm:rounded-3xl bg-[#070D1E] border-2 border-blue-500/70 shadow-[0_0_35px_rgba(37,99,235,0.25)] overflow-hidden flex-shrink-0 transition-all ${className}`}
    >
      {/* Real-Time 3D WebGL Rigged Avatar Canvas (NO PNG / JPG Images) */}
      <AvatarRenderer
        animationController={animCtrlRef.current}
        expressionController={exprCtrlRef.current}
        speechController={speechCtrlRef.current}
        className="w-full h-full"
      />

      {/* Cinematic Studio Edge Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />

      {/* Top-Left: Status Badge (● Interview in progress • {companyName}) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-5 z-20 flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white text-[11px] sm:text-xs font-semibold shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Interview in progress</span>
        <span className="text-white/40">•</span>
        <span className="text-slate-100 font-medium">{companyName}</span>
      </div>

      {/* Top-Right: Floating Candidate Camera (Never blocks 3D interviewer) */}
      {candidateCamera && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-5 z-20">
          {candidateCamera}
        </div>
      )}

      {/* Bottom-Left: Interviewer Identity (● Sarah J. • Senior AI Interviewer) */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-5 z-20 flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-lg">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[11px] sm:text-xs font-semibold text-white">{interviewerName}</span>
        <span className="text-[11px] sm:text-xs text-slate-300">• Senior AI Interviewer</span>
      </div>

      {/* Bottom-Center: Active Speaking / Listening / Thinking Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        {effectiveState === 'SPEAKING' ? (
          <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0B1528]/95 backdrop-blur-md border border-blue-500/50 text-white text-xs sm:text-sm font-semibold shadow-2xl transition-all">
            {/* Left Animated Equalizer Waveform */}
            <div className="flex items-center gap-0.5 sm:gap-1 h-4 mr-0.5" aria-hidden="true">
              {waveformHeights.slice(0, 3).map((h, i) => (
                <span
                  key={`l-${i}`}
                  className="w-0.5 sm:w-1 rounded-full bg-cyan-400 transition-all duration-75"
                  style={{ height: `${Math.max(4, Math.round(h * 0.75))}px` }}
                />
              ))}
            </div>
            <span className="tracking-wide text-white font-medium">Speaking</span>
            {/* Right Animated Equalizer Waveform */}
            <div className="flex items-center gap-0.5 sm:gap-1 h-4 ml-0.5" aria-hidden="true">
              {waveformHeights.slice(3, 6).map((h, i) => (
                <span
                  key={`r-${i}`}
                  className="w-0.5 sm:w-1 rounded-full bg-cyan-400 transition-all duration-75"
                  style={{ height: `${Math.max(4, Math.round(h * 0.75))}px` }}
                />
              ))}
            </div>
          </div>
        ) : effectiveState === 'LISTENING' ? (
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0B1528]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold shadow-2xl transition-all">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide text-white">Listening</span>
          </div>
        ) : effectiveState === 'THINKING' ? (
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0B1528]/90 backdrop-blur-md border border-indigo-500/40 text-indigo-300 text-xs sm:text-sm font-semibold shadow-2xl transition-all">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="tracking-wide text-white">Thinking...</span>
          </div>
        ) : effectiveState === 'ENCOURAGING' ? (
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0B1528]/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold shadow-2xl transition-all">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="tracking-wide text-white">Encouraging</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0B1528]/80 backdrop-blur-md border border-slate-700 text-slate-300 text-xs font-semibold shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Ready</span>
          </div>
        )}
      </div>

      {/* Silence Detection Conversational Cue Toast */}
      {subtlePrompt && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/20 text-slate-200 text-xs shadow-xl animate-fadeIn">
          "{subtlePrompt}"
        </div>
      )}
    </div>
  );
};

export default HumanInterviewerAvatar;
