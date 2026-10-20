import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
        <div
          className={`w-full ${maxWidth} max-w-[calc(100vw-16px)] transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-[#E2E8F0] text-[#172B4D] z-10`}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="text-base sm:text-lg font-bold text-[#172B4D] truncate pr-2">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#64748B] hover:bg-[#EEF4FF] hover:text-[#172B4D] transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 py-4 sm:px-6 sm:py-5 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
