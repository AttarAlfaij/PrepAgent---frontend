import { useState, useEffect, useRef, useCallback } from 'react';
import FaceVisionEngine from '../../../utils/FaceVisionEngine';
import interviewAgentService from '../../../services/interviewAgentService';

/**
 * useEnvironmentMonitoring (Sections 12 - 21)
 * Continuous responsible proctoring and technical monitoring controller.
 * Runs silently in the background during live interview sessions.
 */
export const useEnvironmentMonitoring = ({
  interviewId,
  isInterviewActive = false,
  videoElement = null,
  isCameraOn = true,
  isMicActive = false,
  onPauseInterview,
  onResumeInterview,
}) => {
  // Warning System State (Section 20)
  const [activeToast, setActiveToast] = useState(null); // Minor toast: { id, type, message, iconType }
  const [activeOverlay, setActiveOverlay] = useState(null); // Serious overlay: { id, type, title, message, actionLabel, onAction }
  const [isInterviewPaused, setIsInterviewPaused] = useState(false);

  // Incidents Collection (Section 21)
  const [incidents, setIncidents] = useState([]);

  // Integrity summary metrics
  const summaryRef = useRef({
    cameraRemainedConnected: true,
    microphoneRemainedAvailable: true,
    networkRemainedConnected: true,
    onePersonEnvironmentMaintained: true,
    identityVerificationCompleted: true,
    livenessVerificationCompleted: true,
    totalWarningsCount: 0,
    totalWarningDurationSeconds: 0,
  });

  // Trackers and timers
  const toastTimeoutRef = useRef(null);
  const hiddenStartTimeRef = useRef(null);
  const faceAbsentStartTimeRef = useRef(null);
  const multipleFacesStartTimeRef = useRef(null);
  const headTurnedStartTimeRef = useRef(null);
  const multipleFacesWarnCountRef = useRef(0);
  const isNetworkOfflineRef = useRef(false);

  // Helper to show minor toast warning
  const showToastWarning = useCallback((message, type = 'warning', durationMs = 4000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast({ id: Date.now(), message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, durationMs);
  }, []);

  // Helper to record incident (Section 21)
  const recordIncident = useCallback(
    async (type, duration = 0, severity = 'warning', details = '') => {
      const incidentObj = {
        incidentId: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        timestamp: new Date().toISOString(),
        duration: Math.max(1, Math.round(duration)),
        severity,
        resolved: true,
        details,
      };

      setIncidents((prev) => [...prev, incidentObj]);

      summaryRef.current.totalWarningsCount++;
      summaryRef.current.totalWarningDurationSeconds += incidentObj.duration;

      if (type === 'CAMERA_DISCONNECTED') summaryRef.current.cameraRemainedConnected = false;
      if (type === 'MICROPHONE_DISCONNECTED') summaryRef.current.microphoneRemainedAvailable = false;
      if (type === 'NETWORK_DISCONNECTED') summaryRef.current.networkRemainedConnected = false;
      if (type === 'MULTIPLE_PERSONS_DETECTED') summaryRef.current.onePersonEnvironmentMaintained = false;

      if (interviewId) {
        try {
          await interviewAgentService.recordMonitoringIncident(interviewId, incidentObj);
        } catch (_) {}
      }
    },
    [interviewId]
  );

  // 1. PAGE VISIBILITY MONITORING (Section 13 & 19)
  useEffect(() => {
    if (!isInterviewActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenStartTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenStartTimeRef.current) {
          const hiddenDurationSec = Math.round((Date.now() - hiddenStartTimeRef.current) / 1000);
          hiddenStartTimeRef.current = null;

          if (hiddenDurationSec >= 2) {
            recordIncident(
              'INTERVIEW_PAGE_HIDDEN',
              hiddenDurationSec,
              'warning',
              `Interview window was out of focus for ${hiddenDurationSec}s`
            );
            showToastWarning(
              `⚠️ Interview Window Left — The interview page was hidden for ${hiddenDurationSec} seconds.`,
              'warning',
              5000
            );
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInterviewActive, recordIncident, showToastWarning]);

  // 2. NETWORK HEALTH & LATENCY MONITORING (Section 13 & 18)
  useEffect(() => {
    if (!isInterviewActive) return;

    let active = true;

    const checkNetworkHealth = async () => {
      if (!navigator.onLine) {
        if (!isNetworkOfflineRef.current) {
          isNetworkOfflineRef.current = true;
          setIsInterviewPaused(true);
          if (onPauseInterview) onPauseInterview();

          recordIncident('NETWORK_DISCONNECTED', 0, 'critical', 'Candidate connection dropped');
          setActiveOverlay({
            id: 'network_lost',
            type: 'critical',
            title: '⚠️ Connection Lost',
            message: 'Your interview has been temporarily paused. Reconnecting...',
            actionLabel: 'Retry Connection',
            onAction: () => checkNetworkHealth(),
          });
        }
        return;
      }

      try {
        const ping = await interviewAgentService.pingReadiness();
        if (!active) return;

        if (isNetworkOfflineRef.current) {
          // Restored from offline!
          isNetworkOfflineRef.current = false;
          setIsInterviewPaused(false);
          setActiveOverlay(null);
          showToastWarning('✓ Connection restored. Interview resumed.', 'success');
          if (onResumeInterview) onResumeInterview();
        }

        if (ping.latency > 450) {
          showToastWarning(`⚠️ Connection unstable (Latency: ${ping.latency} ms)`, 'warning');
          recordIncident('NETWORK_UNSTABLE', 2, 'minor', `High latency detected: ${ping.latency} ms`);
        }
      } catch (_) {
        if (!isNetworkOfflineRef.current) {
          showToastWarning('⚠️ Network request degraded. Continuing silently...', 'warning');
        }
      }
    };

    const interval = setInterval(checkNetworkHealth, 14000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isInterviewActive, onPauseInterview, onResumeInterview, recordIncident, showToastWarning]);

  // 3. CONTINUOUS CAMERA & VISION TELEMETRY (Sections 13, 14, 15, 16)
  useEffect(() => {
    if (!isInterviewActive || !isCameraOn) return;

    let active = true;
    let visionTimer = null;

    const runContinuousVision = async () => {
      if (!active) return;

      if (videoElement && videoElement.readyState >= 2) {
        try {
          const telemetry = await FaceVisionEngine.analyzeFrame(videoElement);

          // Section 14: Multiple People Detection
          if (telemetry.status === 'MULTIPLE_FACES') {
            if (!multipleFacesStartTimeRef.current) {
              multipleFacesStartTimeRef.current = Date.now();
              multipleFacesWarnCountRef.current++;

              if (multipleFacesWarnCountRef.current === 1) {
                // First occurrence: warning toast
                showToastWarning(
                  '⚠️ Multiple People Detected — Please ensure that you are the only person visible in the camera frame.',
                  'warning',
                  5000
                );
              }
            } else {
              const multiSec = (Date.now() - multipleFacesStartTimeRef.current) / 1000;
              if (multiSec > 6 || multipleFacesWarnCountRef.current > 1) {
                // Continued occurrence: serious overlay
                setActiveOverlay({
                  id: 'multiple_faces',
                  type: 'warning',
                  title: '⚠️ Interview Environment Issue',
                  message:
                    'Multiple people appear to be visible in the camera frame. Please ensure you are alone before continuing.',
                  actionLabel: 'I am alone now',
                  onAction: () => {
                    multipleFacesStartTimeRef.current = null;
                    setActiveOverlay(null);
                  },
                });
              }
            }
          } else {
            if (multipleFacesStartTimeRef.current) {
              const dur = Math.round((Date.now() - multipleFacesStartTimeRef.current) / 1000);
              recordIncident('MULTIPLE_PERSONS_DETECTED', dur, 'warning', 'Multiple faces detected in frame');
              multipleFacesStartTimeRef.current = null;
            }
          }

          // Section 15: Face Disappearance (with 3.5s Grace Period)
          if (telemetry.status === 'NO_FACE') {
            if (!faceAbsentStartTimeRef.current) {
              faceAbsentStartTimeRef.current = Date.now();
            } else {
              const absentSec = (Date.now() - faceAbsentStartTimeRef.current) / 1000;
              // Grace period: do not trigger on normal quick blinking or turning
              if (absentSec > 3.8) {
                showToastWarning('⚠️ Face Not Detected — Please return to the camera frame.', 'warning');
              }
            }
          } else {
            if (faceAbsentStartTimeRef.current) {
              const absentDuration = Math.round((Date.now() - faceAbsentStartTimeRef.current) / 1000);
              if (absentDuration > 3.5) {
                recordIncident(
                  'FACE_NOT_DETECTED',
                  absentDuration,
                  'warning',
                  `Candidate face temporarily out of frame for ${absentDuration}s`
                );
              }
              faceAbsentStartTimeRef.current = null;
            }
          }

          // Section 12: Extended Head Turn Away (> 15 seconds)
          if (telemetry.headPose === 'LEFT' || telemetry.headPose === 'RIGHT') {
            if (!headTurnedStartTimeRef.current) {
              headTurnedStartTimeRef.current = Date.now();
            } else {
              const turnSec = (Date.now() - headTurnedStartTimeRef.current) / 1000;
              if (turnSec > 16) {
                showToastWarning('Face turned away for an extended period. Please look towards the camera.', 'minor');
                recordIncident('FACE_TURNED_AWAY', Math.round(turnSec), 'minor', 'Head oriented away from camera');
                headTurnedStartTimeRef.current = Date.now(); // reset counter
              }
            }
          } else {
            headTurnedStartTimeRef.current = null;
          }
        } catch (_) {}
      }

      visionTimer = setTimeout(runContinuousVision, 800);
    };

    visionTimer = setTimeout(runContinuousVision, 1000);

    return () => {
      active = false;
      if (visionTimer) clearTimeout(visionTimer);
    };
  }, [isInterviewActive, isCameraOn, videoElement, recordIncident, showToastWarning]);

  // Section 16: Handle Camera Disconnection
  const handleCameraDisconnection = useCallback(() => {
    setIsInterviewPaused(true);
    if (onPauseInterview) onPauseInterview();

    recordIncident('CAMERA_DISCONNECTED', 0, 'critical', 'Camera stream disconnected');

    setActiveOverlay({
      id: 'camera_disconnected',
      type: 'critical',
      title: '⚠️ Camera Disconnected',
      message: 'Your camera connection was interrupted. The interview is temporarily paused.',
      actionLabel: 'Reconnect Camera',
      onAction: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (videoElement) {
            videoElement.srcObject = stream;
          }
          setIsInterviewPaused(false);
          setActiveOverlay(null);
          showToastWarning('✓ Camera restored. Interview resumed.', 'success');
          if (onResumeInterview) onResumeInterview();
        } catch (_) {
          showToastWarning('Could not reconnect camera. Please check permissions.', 'warning');
        }
      },
    });
  }, [onPauseInterview, onResumeInterview, recordIncident, showToastWarning, videoElement]);

  // Generate finalized environment summary for end of interview report
  const getFinalEnvironmentSummary = useCallback(() => {
    const eventsSummary = incidents.map((inc) => {
      let label = inc.type.replace(/_/g, ' ').toLowerCase();
      if (inc.type === 'FACE_NOT_DETECTED') label = 'Face briefly not detected';
      else if (inc.type === 'INTERVIEW_PAGE_HIDDEN') label = 'Interview page became hidden';
      else if (inc.type === 'MULTIPLE_PERSONS_DETECTED') label = 'Multiple people visible';
      else if (inc.type === 'NETWORK_UNSTABLE') label = 'Connection latency fluctuation';
      else if (inc.type === 'CAMERA_DISCONNECTED') label = 'Camera temporarily interrupted';

      return `${label} — ${inc.duration} second${inc.duration === 1 ? '' : 's'}`;
    });

    return {
      cameraRemainedConnected: summaryRef.current.cameraRemainedConnected,
      microphoneRemainedAvailable: summaryRef.current.microphoneRemainedAvailable,
      networkRemainedConnected: summaryRef.current.networkRemainedConnected,
      onePersonEnvironmentMaintained: summaryRef.current.onePersonEnvironmentMaintained,
      identityVerificationCompleted: summaryRef.current.identityVerificationCompleted,
      livenessVerificationCompleted: summaryRef.current.livenessVerificationCompleted,
      totalWarningsCount: summaryRef.current.totalWarningsCount,
      totalWarningDurationSeconds: summaryRef.current.totalWarningDurationSeconds,
      eventsSummary,
      incidents,
    };
  }, [incidents]);

  return {
    activeToast,
    activeOverlay,
    isInterviewPaused,
    incidents,
    showToastWarning,
    recordIncident,
    handleCameraDisconnection,
    getFinalEnvironmentSummary,
    dismissToast: () => setActiveToast(null),
    dismissOverlay: () => setActiveOverlay(null),
  };
};

export default useEnvironmentMonitoring;
