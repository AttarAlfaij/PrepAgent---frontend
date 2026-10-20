import React from 'react';
import { AlertTriangle } from 'lucide-react';

const IntegrityIndicator = ({ warningMessage = '' }) => {
  if (!warningMessage) return null;

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-3.5 bg-amber-500/95 backdrop-blur-md border border-amber-600 rounded-2xl shadow-xl text-white text-xs font-semibold flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <p className="flex-1 leading-snug">{warningMessage}</p>
      </div>
    </div>
  );
};

export default IntegrityIndicator;
