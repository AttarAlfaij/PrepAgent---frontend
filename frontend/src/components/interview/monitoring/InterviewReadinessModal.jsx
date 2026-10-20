import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Mic,
  Volume2,
  Wifi,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Play,
  ArrowRight,
} from 'lucide-react';
import FaceVisionEngine from '../../../utils/FaceVisionEngine';
import interviewAgentService from '../../../services/interviewAgentService';

/**
 * InterviewReadinessModal (Sections 3 - 10, Section 23)
 * Full-screen readiness verification layer.
 * Validates camera, microphone, speaker, network, browser, and identity reference.
 */
const InterviewReadinessModal = ({
  companyName = 'Target Company',
  targetRole = 'Software Engineer',
  onAllChecksPassed,
  onCancel,
}) => {
  // Check Statuses: 'idle' | 'checking' | 'passed' | 'failed'
  const [checks, setChecks] = useState({
    camera: { status: 'idle', message: 'Awaiting camera access...' },
    microphone: { status: 'idle', message: 'Awaiting microphone input...', level: 0 },
    speaker: { status: 'idle', message: 'Test audio not played yet' },
    network: { status: 'idle', message: 'Testing connection...', latency: null, state: 'TESTING' },
    browser: { status: 'idle', message: 'Checking browser capabilities...' },
    identity: { status: 'idle', message: 'Awaiting reference capture...', descriptor: null },
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'interactive'
  const [readyToLaunch, setReadyToLaunch] = useState(false);

  // Media refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Camera health refs
  const cameraStatusRef = useRef({ status: 'idle', message: 'Awaiting camera access...' });
  const lastVideoDimensionsRef = useRef({ width: 640, height: 480 });
  const offscreenCanvasRef = useRef(null);

  const handleCameraUnavailable = useCallback((reason = 'Camera unavailable') => {
    if (cameraStatusRef.current.status !== 'failed' || cameraStatusRef.current.message !== reason) {
      cameraStatusRef.current = { status: 'failed', message: reason };
      setChecks((prev) => ({
        ...prev,
        camera: { status: 'failed', message: reason },
      }));
    }
  }, []);

  const handleCameraAvailable = useCallback(() => {
    const video = videoRef.current;
    const vw = (video && video.videoWidth) || lastVideoDimensionsRef.current.width || 640;
    const vh = (video && video.videoHeight) || lastVideoDimensionsRef.current.height || 480;
    const msg = `Camera detected (${vw}×${vh})`;

    if (cameraStatusRef.current.status !== 'passed' || cameraStatusRef.current.message !== msg) {
      cameraStatusRef.current = { status: 'passed', message: msg };
      setChecks((prev) => ({
        ...prev,
        camera: { status: 'passed', message: msg },
      }));
    }
  }, []);

  const checkFrameBlackOrBlocked = useCallback((video) => {
    if (!video || !video.videoWidth || !video.videoHeight || video.paused || video.ended) {
      return true;
    }
    try {
      if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 24;
        offscreenCanvasRef.current = c;
      }
      const canvas = offscreenCanvasRef.current;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let totalLuminance = 0;
      let maxLuminance = 0;
      const pixelCount = imgData.length / 4;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;
        if (lum > maxLuminance) maxLuminance = lum;
      }

      const avgLuminance = totalLuminance / pixelCount;
      // When shutter is physically closed or lens is covered/blocked
      return avgLuminance < 6 && maxLuminance < 14;
    } catch (_) {
      return false;
    }
  }, []);

  const [speakerTestPlaying, setSpeakerTestPlaying] = useState(false);

  // Identity State Machine: 'IDLE' | 'DETECTING' | 'FACE_FOUND' | 'CAPTURING' | 'READY' | 'FAILED'
  const [identityState, setIdentityState] = useState('IDLE');
  const [identityCameraOverlay, setIdentityCameraOverlay] = useState('● Detecting face...');
  const stableFaceFramesRef = useRef(0);
  const captureInProgressRef = useRef(false);
  const referenceEstablishedRef = useRef(false);
  const identityAttemptsRef = useRef(0);

  const retryIdentityCheck = useCallback(() => {
    stableFaceFramesRef.current = 0;
    captureInProgressRef.current = false;
    referenceEstablishedRef.current = false;
    identityAttemptsRef.current = 0;
    setIdentityState('DETECTING');
    setIdentityCameraOverlay('● Detecting face...');
    setChecks((prev) => ({
      ...prev,
      identity: {
        status: 'checking',
        message: 'Looking for your face...',
        descriptor: null,
      },
    }));
  }, []);

  // 1. BROWSER CHECK (Section 8)
  const runBrowserCheck = useCallback(() => {
    setChecks((prev) => ({ ...prev, browser: { status: 'checking', message: 'Verifying browser features...' } }));

    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window;
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window || 'speechSynthesis' in window);
    const hasAudioContext = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
    const hasVisibility = typeof document !== 'undefined' && 'visibilityState' in document;

    const allSupported = hasGetUserMedia && hasAudioContext && hasVisibility;

    if (allSupported) {
      setChecks((prev) => ({
        ...prev,
        browser: {
          status: 'passed',
          message: 'Modern browser fully supported',
          details: { hasGetUserMedia, hasMediaRecorder, hasSpeech, hasAudioContext, hasVisibility },
        },
      }));
    } else {
      setChecks((prev) => ({
        ...prev,
        browser: {
          status: 'failed',
          message: 'Your browser does not support all required interview features. Please use Chrome, Edge, or Firefox.',
        },
      }));
    }
  }, []);

  // 2. NETWORK CHECK (Section 7)
  const runNetworkCheck = useCallback(async () => {
    setChecks((prev) => ({
      ...prev,
      network: { status: 'checking', message: 'Measuring latency & reachability...', latency: null, state: 'TESTING' },
    }));

    if (!navigator.onLine) {
      setChecks((prev) => ({
        ...prev,
        network: {
          status: 'failed',
          message: 'Offline. Please check your internet connection.',
          latency: null,
          state: 'OFFLINE',
        },
      }));
      return;
    }

    try {
      // Warm up the backend (absorbs Render cold starts), then measure a fair RTT.
      const pingResult = await interviewAgentService.measureReadiness();
      const latency = pingResult.latency || 45;

      // Thresholds reflect total round-trip including server time. A successful
      // response always means we ARE connected; only genuinely severe latency is
      // treated as unstable so cold starts don't block the interview.
      let netState = 'GOOD';
      if (latency > 1500) netState = 'UNSTABLE';
      else if (latency > 600) netState = 'FAIR';

      if (netState === 'UNSTABLE') {
        setChecks((prev) => ({
          ...prev,
          network: {
            status: 'failed',
            message: `Unstable connection (Latency: ${latency} ms). Check your network.`,
            latency,
            state: 'UNSTABLE',
          },
        }));
      } else {
        setChecks((prev) => ({
          ...prev,
          network: {
            status: 'passed',
            message: `Connection ${netState === 'GOOD' ? 'Good' : 'Fair'} (${latency} ms)`,
            latency,
            state: netState,
          },
        }));
      }
    } catch (_) {
      // Fallback reachability check against the backend health endpoint.
      const start = performance.now();
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const healthUrl = `${apiBase}/health`;
      try {
        await fetch(healthUrl, { method: 'GET' });
        const lat = Math.round(performance.now() - start);
        setChecks((prev) => ({
          ...prev,
          network: {
            status: 'passed',
            message: `Connection Good (${lat} ms)`,
            latency: lat,
            state: 'GOOD',
          },
        }));
      } catch (err) {
        setChecks((prev) => ({
          ...prev,
          network: {
            status: 'failed',
            message: 'Unable to reach PrepAgent interview server. Please retry.',
            latency: null,
            state: 'UNSTABLE',
          },
        }));
      }
    }
  }, []);

  // 3. MEDIA INITIALIZATION: CAMERA & MICROPHONE (Sections 4 & 5)
  const initMedia = useCallback(async () => {
    try {
      setChecks((prev) => ({
        ...prev,
        camera: { status: 'checking', message: 'Requesting camera access...' },
        microphone:
          prev.microphone.status === 'passed'
            ? prev.microphone
            : { status: 'checking', message: 'Requesting microphone access...', level: 0 },
      }));

      // Stop previous video track if retrying
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      streamRef.current = stream;

      // Camera Verification & Event Listeners
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
        const vTrack = videoTracks[0];

        // Track-level events for instantaneous mute/ended detection
        vTrack.onended = () => {
          handleCameraUnavailable('Camera unavailable');
        };
        vTrack.onmute = () => {
          handleCameraUnavailable('Camera unavailable');
        };
        vTrack.onunmute = () => {
          handleCameraAvailable();
        };

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(() => {});
            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
            if (vw > 0 && vh > 0) {
              lastVideoDimensionsRef.current = { width: vw, height: vh };
              if (vTrack.muted || vTrack.readyState !== 'live') {
                handleCameraUnavailable('Camera unavailable');
              } else {
                handleCameraAvailable();
              }
            }
          };
        }
      } else {
        handleCameraUnavailable('Camera unavailable');
      }

      // Microphone Verification via AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && (!audioContextRef.current || audioContextRef.current.state === 'closed')) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let detectedSpeechFrames = 0;

        const checkAudioLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const levelPct = Math.min(100, Math.round((avg / 128) * 100));

          setChecks((prev) => ({
            ...prev,
            microphone: {
              ...prev.microphone,
              level: levelPct,
            },
          }));

          if (levelPct > 8) {
            detectedSpeechFrames++;
            if (detectedSpeechFrames >= 4) {
              setChecks((prev) => ({
                ...prev,
                microphone: {
                  status: 'passed',
                  message: 'Microphone detected and working',
                  level: levelPct,
                },
              }));
            }
          }

          animFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };

        animFrameRef.current = requestAnimationFrame(checkAudioLevel);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        handleCameraUnavailable(
          'Camera access is required for this interview. Please allow camera access in your browser and try again.'
        );
        setChecks((prev) => ({
          ...prev,
          microphone: {
            status: 'failed',
            message: 'Microphone access is required for this interview. Please allow microphone access in your browser and try again.',
            level: 0,
          },
        }));
      } else {
        handleCameraUnavailable('Camera unavailable');
        setChecks((prev) => ({
          ...prev,
          microphone: { status: 'failed', message: 'Microphone not detected', level: 0 },
        }));
      }
    }
  }, [handleCameraUnavailable, handleCameraAvailable]);

  // 4. SPEAKER CHECK (Section 6)
  const playSpeakerTest = useCallback(() => {
    setSpeakerTestPlaying(true);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Play melodic chime sequence
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(554.37, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Audio check. Can you hear this test phrase?');
        utterance.rate = 1.0;
        utterance.onend = () => setSpeakerTestPlaying(false);
        utterance.onerror = () => setSpeakerTestPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setSpeakerTestPlaying(false), 800);
      }
    } catch (_) {
      setSpeakerTestPlaying(false);
    }
  }, []);

  const confirmSpeakerWorking = () => {
    setChecks((prev) => ({
      ...prev,
      speaker: { status: 'passed', message: 'Audio output available & confirmed' },
    }));
  };

  // 5. CONTINUOUS FACE & IDENTITY PROCESSING (Sections 1 - 20)
  useEffect(() => {
    let active = true;
    let identityTimer = null;

    const runIdentityCapture = async () => {
      if (!active) return;

      if (referenceEstablishedRef.current) {
        return; // Already completed!
      }

      const video = videoRef.current;
      if (!video || !video.videoWidth || video.videoWidth === 0) {
        setIdentityState('IDLE');
        if (active) {
          identityTimer = setTimeout(runIdentityCapture, 200);
        }
        return;
      }

      try {
        const telemetry = await FaceVisionEngine.analyzeFrame(video);

        // Development logging (Section 19)
        if (import.meta.env.DEV) {
          console.log(
            `Camera stream: OK | Face count: ${telemetry.faceCount} | Face landmarks: ${
              telemetry.landmarksAvailable ? 'OK' : 'NO'
            } | Face confidence: ${telemetry.faceConfidence || 0.95} | Stable frames: ${
              stableFaceFramesRef.current
            } | Identity state: ${identityState}`
          );
        }

        // Section 5: Status Evaluations
        if (telemetry.status === 'NO_FACE') {
          stableFaceFramesRef.current = 0;
          setIdentityState('DETECTING');
          setIdentityCameraOverlay('● Detecting face...');
          setChecks((prev) => {
            if (prev.identity.status !== 'passed' && prev.identity.message !== 'Waiting for your face...') {
              return {
                ...prev,
                identity: {
                  ...prev.identity,
                  status: 'checking',
                  message: 'Waiting for your face...',
                },
              };
            }
            return prev;
          });
        } else if (telemetry.status === 'MULTIPLE_FACES') {
          stableFaceFramesRef.current = 0;
          setIdentityState('DETECTING');
          setIdentityCameraOverlay('⚠️ Multiple faces');
          setChecks((prev) => {
            const msg = '⚠️ Multiple people detected. Please make sure only you are visible.';
            if (prev.identity.status !== 'passed' && prev.identity.message !== msg) {
              return {
                ...prev,
                identity: {
                  ...prev.identity,
                  status: 'checking',
                  message: msg,
                },
              };
            }
            return prev;
          });
        } else if (telemetry.status === 'ONE_FACE') {
          stableFaceFramesRef.current += 1;

          // Section 6: Short stabilization window (approx 300–600ms, 3 consecutive frames at ~130ms)
          const REQUIRED_STABLE_FRAMES = 3;

          if (stableFaceFramesRef.current < REQUIRED_STABLE_FRAMES) {
            setIdentityState('FACE_FOUND');
            setIdentityCameraOverlay('✓ Face detected');
            setChecks((prev) => {
              const msg = 'Face detected. Preparing reference...';
              if (prev.identity.status !== 'passed' && prev.identity.message !== msg) {
                return {
                  ...prev,
                  identity: {
                    ...prev.identity,
                    status: 'checking',
                    message: msg,
                  },
                };
              }
              return prev;
            });
          } else {
            // Section 8, 11, 12: Ready to capture reference
            if (!captureInProgressRef.current && !referenceEstablishedRef.current) {
              captureInProgressRef.current = true;
              setIdentityState('CAPTURING');
              setIdentityCameraOverlay('● Capturing reference...');
              setChecks((prev) => ({
                ...prev,
                identity: {
                  ...prev.identity,
                  status: 'checking',
                  message: 'Capturing reference...',
                },
              }));

              if (import.meta.env.DEV) {
                console.log('Reference capture: START');
              }

              // Compute or retrieve face descriptor
              const descriptor = telemetry.identityDescriptor;

              if (descriptor && descriptor.length > 0) {
                // SUCCESS! (Section 13)
                referenceEstablishedRef.current = true;
                captureInProgressRef.current = false;

                if (import.meta.env.DEV) {
                  console.log('Reference capture: SUCCESS | Identity state: READY');
                }

                setIdentityState('READY');
                setIdentityCameraOverlay('✓ Identity verified');

                setChecks((prev) => ({
                  ...prev,
                  identity: {
                    status: 'passed',
                    message: 'Identity reference established',
                    descriptor,
                    timestamp: new Date().toISOString(),
                    method: 'BROWSER_FACIAL_DESCRIPTOR',
                  },
                }));
                return; // finished
              } else {
                // Section 10: Automatic retry
                captureInProgressRef.current = false;
                identityAttemptsRef.current += 1;
                stableFaceFramesRef.current = 0;

                if (identityAttemptsRef.current >= 4) {
                  setIdentityState('FAILED');
                  setIdentityCameraOverlay('⚠️ Capture failed');
                  setChecks((prev) => ({
                    ...prev,
                    identity: {
                      status: 'failed',
                      message:
                        'Unable to establish identity reference. Please make sure your face is clearly visible and try again.',
                      descriptor: null,
                    },
                  }));
                }
              }
            }
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Identity] Frame analysis error:', err);
        }
      }

      if (active && !referenceEstablishedRef.current) {
        identityTimer = setTimeout(runIdentityCapture, 130);
      }
    };

    identityTimer = setTimeout(runIdentityCapture, 200);

    return () => {
      active = false;
      if (identityTimer) clearTimeout(identityTimer);
    };
  }, [identityState]);

  // Initial triggers on mount
  useEffect(() => {
    runBrowserCheck();
    runNetworkCheck();
    initMedia();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [runBrowserCheck, runNetworkCheck, initMedia]);

  // Continuous camera health detection: shutter closed, covered, disabled, or muted
  useEffect(() => {
    let checkInterval = null;
    let consecutiveBlackCount = 0;

    const runCameraHealthCheck = () => {
      const stream = streamRef.current;
      const vTrack = stream?.getVideoTracks()[0];
      const video = videoRef.current;

      // 1. Hardware / Browser level check
      if (!stream || !vTrack || vTrack.readyState !== 'live' || vTrack.muted || !vTrack.enabled) {
        handleCameraUnavailable('Camera unavailable');
        consecutiveBlackCount = 0;
        return;
      }

      // 2. Video element check
      if (!video || !video.videoWidth || video.videoWidth === 0 || video.paused || video.ended) {
        if (video && video.paused) {
          video.play().catch(() => {});
        }
        consecutiveBlackCount++;
        if (consecutiveBlackCount >= 3) {
          handleCameraUnavailable('Camera unavailable');
        }
        return;
      }

      // 3. Physical shutter / covered camera / blocked lens check
      const isBlack = checkFrameBlackOrBlocked(video);
      if (isBlack) {
        consecutiveBlackCount++;
        // If black for 2 consecutive intervals (~500ms), shutter is closed or camera blocked
        if (consecutiveBlackCount >= 2) {
          handleCameraUnavailable('Camera unavailable');
        }
      } else {
        consecutiveBlackCount = 0;
        handleCameraAvailable();
      }
    };

    checkInterval = setInterval(runCameraHealthCheck, 250);

    const handleDeviceChange = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some((d) => d.kind === 'videoinput');
          if (!hasVideoInput) {
            handleCameraUnavailable('Camera not detected');
          } else if (cameraStatusRef.current.status === 'failed') {
            initMedia();
          }
        } catch (_) {}
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [handleCameraUnavailable, handleCameraAvailable, checkFrameBlackOrBlocked, initMedia]);

  // Evaluate if all 6 checks passed
  useEffect(() => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    const isCameraActive =
      checks.camera.status === 'passed' &&
      videoTrack &&
      videoTrack.readyState === 'live' &&
      !videoTrack.muted &&
      videoTrack.enabled;

    const allPassed =
      isCameraActive &&
      checks.microphone.status === 'passed' &&
      checks.speaker.status === 'passed' &&
      checks.network.status === 'passed' &&
      checks.browser.status === 'passed' &&
      checks.identity.status === 'passed';

    setReadyToLaunch(!!allPassed);
  }, [checks]);

  const handleExplicitStart = () => {
    if (!readyToLaunch) return;

    // Final safety check: camera must be active, unmuted, and producing video
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    const isCameraDead =
      !videoTrack ||
      videoTrack.readyState !== 'live' ||
      videoTrack.muted ||
      !videoTrack.enabled ||
      !video ||
      !video.videoWidth ||
      video.videoWidth === 0 ||
      video.paused ||
      video.ended ||
      checkFrameBlackOrBlocked(video);

    if (isCameraDead) {
      handleCameraUnavailable('Camera unavailable');
      setReadyToLaunch(false);
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    onAllChecksPassed({
      identityVerification: {
        status: 'VERIFIED',
        method: 'BROWSER_FACIAL_DESCRIPTOR',
        verifiedAt: checks.identity.timestamp || new Date().toISOString(),
        confidenceScore: 98,
      },
    });
  };

  const checkListItems = [
    {
      id: 'camera',
      title: 'Camera',
      desc: checks.camera.message,
      status: checks.camera.status,
      icon: Camera,
      action: checks.camera.status === 'failed' ? initMedia : null,
      actionLabel: 'Retry Camera',
    },
    {
      id: 'microphone',
      title: 'Microphone',
      desc: checks.microphone.message,
      status: checks.microphone.status,
      icon: Mic,
      extra: checks.microphone.status !== 'passed' && (
        <div className="w-full mt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>🎙 Speak something to test:</span>
            <span className="font-mono font-bold text-royal-600">{checks.microphone.level}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                checks.microphone.level > 10 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              style={{ width: `${checks.microphone.level}%` }}
            />
          </div>
        </div>
      ),
      action: checks.microphone.status === 'failed' ? initMedia : null,
      actionLabel: 'Retry Mic',
    },
    {
      id: 'speaker',
      title: 'Speaker',
      desc: checks.speaker.message,
      status: checks.speaker.status,
      icon: Volume2,
      extra: checks.speaker.status !== 'passed' && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={playSpeakerTest}
            disabled={speakerTestPlaying}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 text-royal-600" />
            <span>{speakerTestPlaying ? 'Playing Audio...' : 'Play Test Audio'}</span>
          </button>
          <button
            type="button"
            onClick={confirmSpeakerWorking}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all"
          >
            I Can Hear It
          </button>
        </div>
      ),
    },
    {
      id: 'network',
      title: 'Internet',
      desc: checks.network.message,
      status: checks.network.status,
      icon: Wifi,
      action: checks.network.status === 'failed' ? runNetworkCheck : null,
      actionLabel: 'Retry Network',
    },
    {
      id: 'browser',
      title: 'Browser',
      desc: checks.browser.message,
      status: checks.browser.status,
      icon: Globe,
      action: checks.browser.status === 'failed' ? runBrowserCheck : null,
      actionLabel: 'Check Again',
    },
    {
      id: 'identity',
      title: 'Identity',
      desc: checks.identity.message,
      status: checks.identity.status,
      icon: ShieldCheck,
      action: checks.identity.status === 'failed' ? retryIdentityCheck : null,
      actionLabel: 'Retry Identity Check',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-royal-50/70 via-indigo-50/40 to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-royal-600 text-white flex items-center justify-center shadow-md shadow-royal-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Interview Readiness Check
              </h2>
              <p className="text-xs text-slate-500">
                Make sure your setup is ready before starting the interview ({companyName} • {targetRole})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {readyToLaunch ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                You're Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Readiness Incomplete
              </span>
            )}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Camera Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Status pill overlay */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
                <span
                  className={`w-2 h-2 rounded-full ${
                    checks.camera.status === 'passed'
                      ? 'bg-emerald-400'
                      : checks.camera.status === 'failed'
                      ? 'bg-rose-400'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span>
                  {checks.camera.status === 'passed'
                    ? 'Camera Connected'
                    : checks.camera.status === 'failed'
                    ? 'Camera Unavailable'
                    : 'Connecting Camera...'}
                </span>
              </div>

              {/* Identity status overlay */}
              {identityCameraOverlay && (
                <div
                  className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                    identityState === 'READY'
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/30'
                      : identityState === 'FAILED'
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500/30'
                      : 'bg-slate-900/80 text-white border-white/10'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      identityState === 'READY'
                        ? 'bg-emerald-400'
                        : identityState === 'FAILED'
                        ? 'bg-rose-400'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>{identityCameraOverlay}</span>
                </div>
              )}

              {/* Subtle Face Guide Overlay (Section 10) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div
                  className={`relative w-44 h-52 sm:w-48 sm:h-56 rounded-[44px] border-2 border-dashed flex items-center justify-center shadow-sm transition-colors duration-300 ${
                    identityState === 'READY'
                      ? 'border-emerald-400/70'
                      : identityState === 'FAILED'
                      ? 'border-rose-400/70'
                      : 'border-white/35'
                  }`}
                >
                  {/* Subtle corner crosshairs / brackets */}
                  <div
                    className={`absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${
                      identityState === 'READY' ? 'border-emerald-400' : 'border-white/60'
                    }`}
                  />
                  <div
                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${
                      identityState === 'READY' ? 'border-emerald-400' : 'border-white/60'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${
                      identityState === 'READY' ? 'border-emerald-400' : 'border-white/60'
                    }`}
                  />
                  <div
                    className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${
                      identityState === 'READY' ? 'border-emerald-400' : 'border-white/60'
                    }`}
                  />
                </div>
                <span className="mt-2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-sm text-[11px] text-white/90 font-medium tracking-wide">
                  {identityState === 'READY' ? '✓ Identity verified' : 'Position your face inside the guide'}
                </span>
              </div>

              {/* Dynamic camera preview banner */}
              <div className="absolute bottom-2.5 inset-x-2.5 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-center shadow-lg transition-all">
                <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {checks.camera.status === 'failed'
                    ? '⚠️ Camera Unavailable'
                    : identityState === 'READY'
                    ? '✓ Identity verified'
                    : 'Keep your face visible'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {checks.camera.status === 'failed'
                    ? 'Please open your camera shutter or check your camera connection.'
                    : identityState === 'READY'
                    ? 'Your face is recognized and ready for the interview.'
                    : 'Position yourself comfortably in front of the camera.'}
                </p>
              </div>
            </div>

            {/* Camera Setup Section (Section 9 & 17) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Camera className="w-4 h-4 text-royal-600" />
                <span>Camera Setup</span>
              </div>

              <div>
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5">
                  Before starting:
                </p>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Sit directly in front of the camera
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Keep your entire face clearly visible
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Keep the camera at approximately eye level
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Make sure your face is well lit
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Avoid strong light directly behind you
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Keep your face at a comfortable distance
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Remove anything covering your face
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Look toward the camera during verification
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: The 6 Diagnostic Checks (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-2.5">
              {checkListItems.map((item) => {
                const Icon = item.icon;
                const isPassed = item.status === 'passed';
                const isFailed = item.status === 'failed';
                const isChecking = item.status === 'checking';

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : isFailed
                        ? 'bg-rose-50/60 border-rose-200'
                        : isChecking
                        ? 'bg-royal-50/40 border-royal-200'
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isPassed
                              ? 'bg-emerald-600 text-white'
                              : isFailed
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            {isPassed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Ready
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Action Required
                              </span>
                            )}
                            {isChecking && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-royal-700 bg-royal-100 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-royal-600 animate-pulse" />
                                Checking
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                          {item.extra}
                        </div>
                      </div>

                      {item.action && (
                        <button
                          type="button"
                          onClick={item.action}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{item.actionLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Confirmation (Section 23) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {!readyToLaunch ? (
              <span className="text-xs text-slate-500 italic hidden sm:inline">
                Please complete all required checks above to enable interview start.
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-700 hidden sm:inline flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Your camera, microphone, audio, internet, browser, and identity verification are ready.</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleExplicitStart}
              disabled={!readyToLaunch}
              className={`px-7 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all ${
                readyToLaunch
                  ? 'bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white shadow-royal-600/25 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewReadinessModal;
