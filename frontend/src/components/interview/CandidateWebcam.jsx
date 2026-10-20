import React, { useEffect } from 'react';
import { User, VideoOff, Video } from 'lucide-react';

/**
 * CandidateWebcam — Floating Candidate Video Card matching Reference Image
 * - Width: 220–280px (w-60 to w-72)
 * - Aspect Ratio: 16:9
 * - Reuses existing videoRef / media stream (zero duplicate getUserMedia calls)
 * - Dark translucent header bar with ● Camera and 📹 indicator
 * - Proper object-fit: cover with horizontal flip for natural mirror feedback
 */
const CandidateWebcam = ({
  videoRef = null,
  stream = null,
  isCameraOn = true,
  cameraError = false,
  className = '',
}) => {
  useEffect(() => {
    if (videoRef?.current && stream && isCameraOn && !cameraError) {
      videoRef.current.muted = true;
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [videoRef, stream, isCameraOn, cameraError]);

  return (
    <div
      className={`relative w-56 sm:w-64 lg:w-72 aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          e.target.muted = true;
          e.target.play().catch(() => {});
        }}
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
          isCameraOn && !cameraError ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Camera Off Placeholder */}
      {(!isCameraOn || cameraError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-slate-400 p-2 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-1 text-slate-500">
            {cameraError ? <VideoOff className="w-5 h-5 text-rose-400" /> : <User className="w-5 h-5" />}
          </div>
          <p className="text-[10px] font-medium text-slate-400">
            {cameraError ? 'Camera unavailable' : 'Camera off'}
          </p>
        </div>
      )}

      {/* Top Header Bar Overlay: ● Camera and 📹 icon */}
      <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between pointer-events-none">
        {/* Left Badge: ● Camera */}
        <div className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isCameraOn && !cameraError ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span>Camera</span>
        </div>

        {/* Right Icon: 📹 */}
        <div className="p-1 rounded-full bg-black/70 backdrop-blur-md text-teal-400 border border-white/10">
          <Video className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

export default CandidateWebcam;
