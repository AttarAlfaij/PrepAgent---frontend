import React, { useState } from 'react';
import { FileText, CheckCircle, RefreshCw } from 'lucide-react';
import Button from '../common/Button';
import FileUploader from './FileUploader';

const ResumeSelector = ({
  existingResume,
  uploadedFile,
  useExisting,
  onToggleUseExisting,
  onFileSelect,
  onFileRemove,
  error,
}) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // If there's no existing resume, directly show the file uploader
  if (!existingResume) {
    return (
      <FileUploader
        file={uploadedFile}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      {useExisting ? (
        <div className="bg-royal-50/60 border border-royal-200 rounded-2xl p-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-royal-600" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-royal-700 bg-royal-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Previously Uploaded Resume
                </span>
                <h4 className="text-sm font-bold text-slate-800">
                  {existingResume.originalName}
                </h4>
                <p className="text-xs text-slate-500">
                  {formatFileSize(existingResume.size)} • Uploaded {new Date(existingResume.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => onToggleUseExisting(false)}
              >
                Upload Different Resume
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs text-slate-500 font-medium">
              Uploading a new resume for this session
            </span>
            <button
              type="button"
              onClick={() => onToggleUseExisting(true)}
              className="text-xs text-royal-600 hover:text-royal-800 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              Use previously uploaded resume instead
            </button>
          </div>
          <FileUploader
            file={uploadedFile}
            onFileSelect={onFileSelect}
            onFileRemove={onFileRemove}
            error={error}
          />
        </div>
      )}
    </div>
  );
};

export default ResumeSelector;
