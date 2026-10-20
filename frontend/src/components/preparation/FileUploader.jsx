import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import Button from '../common/Button';

const FileUploader = ({
  file,
  onFileSelect,
  onFileRemove,
  error,
  helperText = 'PDF, DOC, DOCX up to 10MB',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (selectedFile) => {
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert('Please upload a valid document (PDF, DOC, or DOCX).');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }
    onFileSelect(selectedFile);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-royal-500 bg-royal-50/50 scale-[1.01]'
              : error
              ? 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/50'
              : 'border-slate-300 hover:border-royal-400 bg-slate-50/60 hover:bg-royal-50/20'
          }`}
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-royal-100 text-royal-600 flex items-center justify-center ring-4 ring-royal-50 transition-transform duration-200 group-hover:scale-110">
            <Upload className="w-7 h-7" />
          </div>
          <h4 className="text-base font-semibold text-slate-800 mb-1">
            Drag & Drop Your Resume
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            or <span className="text-royal-600 font-semibold hover:underline">Browse Files</span> from your device
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
            <FileText className="w-3.5 h-3.5" />
            <span>{helperText}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-royal-200 rounded-2xl shadow-sm gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                {file.name || file.originalName}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(file.size)} • Ready for preparation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Change Resume
            </Button>
            {onFileRemove && (
              <button
                type="button"
                onClick={onFileRemove}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
