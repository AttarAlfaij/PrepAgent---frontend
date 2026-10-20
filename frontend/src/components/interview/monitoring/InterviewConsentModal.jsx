import React from 'react';
import { Shield, Camera, Mic, Eye, CheckCircle2 } from 'lucide-react';

/**
 * InterviewConsentModal (Section 2)
 * Explicit, transparent privacy & readiness check consent screen.
 * Displays before accessing camera or microphone.
 */
const InterviewConsentModal = ({ onConsent, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-7 pb-4 border-b border-slate-100 flex items-center gap-3.5 bg-gradient-to-r from-royal-50/70 to-indigo-50/50">
          <div className="w-11 h-11 rounded-2xl bg-royal-600 text-white flex items-center justify-center shadow-md shadow-royal-600/20 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Interview Readiness Check
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Privacy, permissions & responsible proctoring notice
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[75vh]">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            To provide a realistic AI interview experience, <strong className="text-slate-900">PrepAgent AI</strong> needs temporary access to your camera and microphone.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-royal-700 font-bold text-xs mb-1">
                <Camera className="w-4 h-4 text-royal-600" />
                <span>Camera</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Used for identity and liveness verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-royal-700 font-bold text-xs mb-1">
                <Mic className="w-4 h-4 text-royal-600" />
                <span>Microphone</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Used for speech-to-text and voice answers.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>During the interview, PrepAgent AI may detect:</span>
            </div>
            <ul className="space-y-1.5 text-xs text-indigo-950">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>Whether you remain visible in the camera frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>Whether multiple people appear in the interview space</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>Whether your camera or microphone disconnects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>Whether the interview page becomes hidden</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>Basic liveness signals such as natural blinking and head movement</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-500 italic">
            Your monitoring events may be recorded as part of the interview report. We do not store raw biometric recordings or inspect other tabs or private files.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConsent}
            className="ml-auto px-6 py-3 rounded-2xl bg-royal-600 hover:bg-royal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-royal-600/20 flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Understand & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewConsentModal;
