import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

/**
 * EnvironmentWarnings (Section 20)
 * Dual-tier warning system:
 * 1. Minor warning — Floating non-blocking Toast
 * 2. Serious/repeated warning — Actionable Centered Overlay
 */
export const EnvironmentToast = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isMinor = toast.type === 'minor';

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-3 duration-250 pointer-events-none">
      <div
        className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-900/90 border-emerald-700 text-white'
            : isMinor
            ? 'bg-slate-900/90 border-slate-700 text-white'
            : 'bg-amber-900/90 border-amber-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <p className="text-xs font-semibold leading-snug truncate">{toast.message}</p>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const EnvironmentOverlay = ({ overlay, onDismiss }) => {
  if (!overlay) return null;

  const isCritical = overlay.type === 'critical';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 text-center flex flex-col items-center">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            isCritical ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}
        >
          {isCritical ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{overlay.title}</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 max-w-sm">{overlay.message}</p>

        <div className="flex items-center gap-3 w-full justify-center">
          {overlay.onAction && (
            <button
              type="button"
              onClick={overlay.onAction}
              className="px-6 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-700 text-white font-bold text-xs shadow-md transition-all"
            >
              {overlay.actionLabel || 'Continue'}
            </button>
          )}

          {!overlay.onAction && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default {
  EnvironmentToast,
  EnvironmentOverlay,
};
