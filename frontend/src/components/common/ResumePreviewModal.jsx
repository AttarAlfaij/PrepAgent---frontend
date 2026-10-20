import React, { useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  ExternalLink,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import Button from './Button';

const ResumePreviewModal = ({
  isOpen,
  onClose,
  blobUrl,
  filename = 'Candidate_Resume.pdf',
  fileSize,
  mimeType = 'application/pdf',
  onDownload,
  isDownloading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  const isPdf =
    (mimeType && mimeType.includes('pdf')) ||
    (filename && filename.toLowerCase().endsWith('.pdf'));

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
        <div className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-slate-200 z-10 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50/70">
            <div className="flex items-center gap-3 min-w-0 pr-3">
              <div className="w-10 h-10 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center flex-shrink-0 shadow-sm border border-royal-200/50">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Resume Preview
                  </h3>
                  {fileSize && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                      {fileSize}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-md" title={filename}>
                  {filename}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isPdf && blobUrl && (
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  title="Open in new window"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-royal-600 hover:bg-royal-50 rounded-lg transition-colors border border-slate-200/80"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open New Tab</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="p-3 sm:p-5 flex-1 min-h-0 bg-slate-100/60 overflow-hidden">
            {isPdf && blobUrl ? (
              <div className="w-full h-[62vh] sm:h-[68vh] rounded-xl overflow-hidden border border-slate-200/90 shadow-sm bg-white">
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=0`}
                  title={filename}
                  className="w-full h-full border-0"
                />
              </div>
            ) : !isPdf ? (
              /* Informative DOC/DOCX placeholder */
              <div className="h-[50vh] sm:h-[55vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-4 shadow-sm">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">
                  Preview Not Supported For This File Type
                </h4>
                <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
                  Preview is available for PDF files. Download the document to view it in Microsoft Word or your preferred document reader.
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 max-w-sm w-full flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-royal-100 text-royal-700 flex items-center justify-center flex-shrink-0">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={filename}>
                      {filename}
                    </p>
                    {fileSize && <p className="text-xs text-slate-500">{fileSize}</p>}
                  </div>
                </div>

                <Button
                  variant="primary"
                  icon={Download}
                  onClick={onDownload}
                  isLoading={isDownloading}
                >
                  Download {filename.endsWith('.docx') ? 'Word Document (.docx)' : 'Document'}
                </Button>
              </div>
            ) : (
              /* Loading or empty state */
              <div className="h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200">
                <div className="w-10 h-10 border-4 border-royal-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-600">Loading document preview...</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 bg-white">
            <p className="text-xs text-slate-500 hidden sm:block">
              Attached to this Preparation Session
            </p>
            <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
              <Button variant="outline" size="md" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Download}
                onClick={onDownload}
                isLoading={isDownloading}
              >
                Download Resume
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreviewModal;
