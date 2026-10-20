import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Keyboard,
  Volume2,
  VolumeX,
  Send,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Code2,
  Users,
  Layers,
  User,
  ShieldCheck,
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import HumanInterviewerAvatar from '../components/interviewAgent/HumanInterviewerAvatar';
import InterviewHeader from '../components/interview/InterviewHeader';
import CandidateWebcam from '../components/interview/CandidateWebcam';
import CurrentQuestion from '../components/interview/CurrentQuestion';
import LiveTranscript from '../components/interview/LiveTranscript';
import InterviewControls from '../components/interview/InterviewControls';
import interviewAgentService from '../services/interviewAgentService';
import InterviewConsentModal from '../components/interview/monitoring/InterviewConsentModal';
import InterviewReadinessModal from '../components/interview/monitoring/InterviewReadinessModal';
import { EnvironmentToast, EnvironmentOverlay } from '../components/interview/monitoring/EnvironmentWarnings';
import useEnvironmentMonitoring from '../components/interview/monitoring/useEnvironmentMonitoring';
import sarahAvatar from '../assets/ai_interviewer.jpg';

/**
 * Frontend State Machine Constants (Section 27)
 */
const MACHINE_STATES = {
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  AI_SPEAKING: 'AI_SPEAKING',
  LISTENING: 'LISTENING',
  TRANSCRIBING: 'TRANSCRIBING',
  ANSWER_SUBMITTED: 'ANSWER_SUBMITTED',
  EVALUATING: 'EVALUATING',
  DECIDING_NEXT_ACTION: 'DECIDING_NEXT_ACTION',
  NEXT_QUESTION: 'NEXT_QUESTION',
  FINAL_EVALUATION: 'FINAL_EVALUATION',
  COMPLETED: 'COMPLETED',
};

const SILENCE_HINT_THRESHOLD_SECONDS = 12;

const MockInterview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Interview State Machine
  const [machineState, setMachineState] = useState(MACHINE_STATES.INITIALIZING);

  // Pre-interview context & selected interview type
  const [preContext, setPreContext] = useState(null);
  const [selectedInterviewType, setSelectedInterviewType] = useState('Mixed');

  // Number of Questions Configuration
  const [questionCountSelect, setQuestionCountSelect] = useState('10');
  const [customQuestionCount, setCustomQuestionCount] = useState('');
  const [customQuestionError, setCustomQuestionError] = useState('');

  const isCustomCountValid =
    questionCountSelect !== 'Other' ||
    (customQuestionCount.trim() !== '' &&
      /^\d+$/.test(customQuestionCount.trim()) &&
      !isNaN(parseInt(customQuestionCount.trim(), 10)) &&
      parseInt(customQuestionCount.trim(), 10) >= 1 &&
      parseInt(customQuestionCount.trim(), 10) <= 20);

  const effectiveQuestionCount =
    questionCountSelect === 'Other'
      ? (/^\d+$/.test(customQuestionCount.trim())
          ? Math.min(20, Math.max(1, parseInt(customQuestionCount.trim(), 10)))
          : null)
      : parseInt(questionCountSelect, 10) || 10;

  const handleCustomQuestionChange = (e) => {
    const rawVal = e.target.value;

    if (rawVal === '') {
      setCustomQuestionCount('');
      setCustomQuestionError('');
      return;
    }

    if (rawVal.includes('.') || rawVal.includes('-') || !/^\d+$/.test(rawVal)) {
      setCustomQuestionError('Please enter a whole number.');
      return;
    }

    const num = parseInt(rawVal, 10);
    setCustomQuestionCount(rawVal);

    if (num > 20) {
      setCustomQuestionError('Maximum 20 questions allowed.');
    } else if (num < 1) {
      setCustomQuestionError('Minimum 1 question required.');
    } else {
      setCustomQuestionError('');
    }
  };

  const handleCustomQuestionKeyDown = (e) => {
    if (['.', '-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const [selectedTotalQuestions, setSelectedTotalQuestions] = useState(10);
  const configuredQuestionCountRef = useRef(10);
  const isResumingRef = useRef(false);

  const handleStartInterviewClick = () => {
    if (questionCountSelect === 'Other') {
      const trimmed = customQuestionCount.trim();
      if (!trimmed) {
        setCustomQuestionError('Please enter number of questions.');
        return;
      }
      if (trimmed.includes('.') || trimmed.includes('-') || !/^\d+$/.test(trimmed)) {
        setCustomQuestionError('Please enter a whole number.');
        return;
      }
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) {
        setCustomQuestionError('Please enter a whole number.');
        return;
      }
      if (num < 1) {
        setCustomQuestionError('Minimum 1 question required.');
        return;
      }
      if (num > 20) {
        setCustomQuestionError('Maximum 20 questions allowed.');
        return;
      }
    }

    const resolvedCount =
      questionCountSelect === 'Other'
        ? parseInt(customQuestionCount.trim(), 10)
        : parseInt(questionCountSelect, 10);

    if (!resolvedCount || isNaN(resolvedCount) || resolvedCount < 1 || resolvedCount > 20) {
      setCustomQuestionError('Please enter a valid number of questions between 1 and 20.');
      return;
    }

    configuredQuestionCountRef.current = resolvedCount;
    setSelectedTotalQuestions(resolvedCount);
    isResumingRef.current = false;
    setShowConsentModal(true);
  };

  // Active Interview Session State
  const [interview, setInterview] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
  const [closingMessage, setClosingMessage] = useState('');
  const currentQuestionNumberRef = useRef(1);
  const isSubmittingAnswerRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Voice, Camera & Answer Controls
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [speechError, setSpeechError] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);

  // Silence Detection & Subtle Conversational Prompt (Section 12)
  const [silenceHint, setSilenceHint] = useState(null);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [silenceDetectedThisQuestion, setSilenceDetectedThisQuestion] = useState(false);

  // Error Banner
  const [errorBanner, setErrorBanner] = useState(null);

  // Refs for Web Speech API, Webcam & Timers
  const recognitionRef = useRef(null);
  const isMicActiveRef = useRef(false);
  const lastSpeechTimestampRef = useRef(Date.now());
  const hintTriggeredForQRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Responsible Proctoring & Environment Readiness Modal State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [readinessData, setReadinessData] = useState(null);

  // Continuous Environment Monitoring Hook
  const {
    activeToast,
    activeOverlay,
    isInterviewPaused,
    incidents,
    handleCameraDisconnection,
    getFinalEnvironmentSummary,
    dismissToast,
    dismissOverlay,
  } = useEnvironmentMonitoring({
    interviewId: interview?._id || interview?.interviewId,
    isInterviewActive:
      interview &&
      interview.status === 'IN_PROGRESS' &&
      machineState !== MACHINE_STATES.READY &&
      machineState !== MACHINE_STATES.COMPLETED &&
      machineState !== MACHINE_STATES.INITIALIZING,
    videoElement: videoRef.current,
    isCameraOn,
    isMicActive,
    onPauseInterview: () => {
      stopMicrophone();
      stopTTS();
    },
    onResumeInterview: () => {},
  });

  // Dynamic interview-active class toggle (Sections 1 & 28)
  const isInterviewActive =
    interview &&
    interview.status === 'IN_PROGRESS' &&
    machineState !== MACHINE_STATES.READY &&
    machineState !== MACHINE_STATES.COMPLETED &&
    machineState !== MACHINE_STATES.INITIALIZING;

  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (isInterviewActive) {
      document.documentElement.classList.add('interview-active');
      document.body.classList.add('interview-active');
      if (rootEl) rootEl.classList.add('interview-active');
    } else {
      document.documentElement.classList.remove('interview-active');
      document.body.classList.remove('interview-active');
      if (rootEl) rootEl.classList.remove('interview-active');
    }
    return () => {
      document.documentElement.classList.remove('interview-active');
      document.body.classList.remove('interview-active');
      if (rootEl) rootEl.classList.remove('interview-active');
    };
  }, [isInterviewActive]);

  // Format MM:SS timer
  const formatTime = (totalSec) => {
    const clamped = Math.max(0, Math.floor(Number(totalSec) || 0));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Candidate Webcam Stream Lifecycle (Section 4)
  useEffect(() => {
    if (!isInterviewActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setCameraStream(null);
      return;
    }

    if (!isCameraOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraStream(null);
      return;
    }

    // Reuse existing active stream if already available!
    const activeVideoTrack = mediaStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
    if (mediaStreamRef.current && activeVideoTrack) {
      activeVideoTrack.enabled = true;
      setCameraError(false);
      setCameraStream(mediaStreamRef.current);
      if (videoRef.current) {
        videoRef.current.muted = true;
        if (videoRef.current.srcObject !== mediaStreamRef.current) {
          videoRef.current.srcObject = mediaStreamRef.current;
        }
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    let mounted = true;
    const initCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 480 }, height: { ideal: 320 }, facingMode: 'user' },
            audio: false,
          });

          if (!mounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          mediaStreamRef.current = stream;
          setCameraError(false);
          setCameraStream(stream);

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              setCameraError(true);
              handleCameraDisconnection();
            };
          }

          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        if (mounted) {
          setCameraError(true);
          handleCameraDisconnection();
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
    };
  }, [isInterviewActive, isCameraOn, handleCameraDisconnection]);

  // Ensure stream remains attached whenever video element mounts or re-renders
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current && isCameraOn && !cameraError) {
      videoRef.current.muted = true;
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  });

  // Load Pre-Context & Check for Resumable Active Interview on mount
  useEffect(() => {
    let mounted = true;
    const loadContext = async () => {
      try {
        setMachineState(MACHINE_STATES.INITIALIZING);
        const res = await interviewAgentService.getPreContext(sessionId);
        if (!mounted) return;

        const data = res?.data || {};
        setPreContext(data);
        if (data.defaultInterviewType) {
          setSelectedInterviewType(data.defaultInterviewType);
        }

        const savedId = sessionStorage.getItem(`prepagent_active_interview_${sessionId || 'default'}`);
        if (data.activeInterview && data.activeInterview.status === 'IN_PROGRESS') {
          setInterview(data.activeInterview);
          setElapsedSeconds(data.activeInterview.elapsedSeconds || 0);
          const restoredQNum = Math.min(
            data.activeInterview.totalQuestions || 10,
            Math.max(1, data.activeInterview.questionsAskedCount || (data.activeInterview.questionsAnsweredCount || 0) + 1)
          );
          setCurrentQuestionNumber(restoredQNum);
          currentQuestionNumberRef.current = restoredQNum;
        } else if (savedId) {
          try {
            const existing = await interviewAgentService.getInterview(savedId);
            if (existing?.data?.status === 'IN_PROGRESS') {
              setInterview(existing.data);
              setElapsedSeconds(existing.data.elapsedSeconds || 0);
              const restoredQNum = Math.min(
                existing.data.totalQuestions || 10,
                Math.max(1, existing.data.questionsAskedCount || (existing.data.questionsAnsweredCount || 0) + 1)
              );
              setCurrentQuestionNumber(restoredQNum);
              currentQuestionNumberRef.current = restoredQNum;
            }
          } catch (_) {
            sessionStorage.removeItem(`prepagent_active_interview_${sessionId || 'default'}`);
          }
        }

        setMachineState(MACHINE_STATES.READY);
      } catch (err) {
        if (!mounted) return;
        setPreContext({
          companyName: 'Target Company',
          targetRole: 'Software Engineer',
          defaultInterviewType: 'Mixed',
          resumeSummary: { projectsCount: 0, projects: [], skills: [] },
          skillGapSummary: { coverageScore: 0, missingSkills: [], needsPractice: [] },
          previousMistakesCount: 0,
        });
        setMachineState(MACHINE_STATES.READY);
      }
    };

    loadContext();
    return () => {
      mounted = false;
      stopMicrophone();
      stopTTS();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sessionId]);

  // Text-to-Speech helper (Section 7)
  const stopTTS = useCallback(() => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (_) {}
    }
    setIsSpeakingTTS(false);
  }, []);

  const speakText = useCallback(
    (textToSpeak, onComplete) => {
      if (!ttsEnabled || !synthRef.current || !textToSpeak) {
        setIsSpeakingTTS(false);
        if (onComplete) onComplete();
        return;
      }

      try {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.0;
        utterance.pitch = 1.02;

        const voices = synthRef.current.getVoices?.() || [];
        const preferredVoice =
          voices.find(
            (v) =>
              /en[-_](US|GB|IN)/i.test(v.lang) &&
              /(natural|google|samantha|aria|jenny|zira|female)/i.test(v.name)
          ) ||
          voices.find((v) => /en/i.test(v.lang)) ||
          voices[0];

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsSpeakingTTS(true);
        };
        utterance.onend = () => {
          setIsSpeakingTTS(false);
          if (onComplete) onComplete();
        };
        utterance.onerror = () => {
          setIsSpeakingTTS(false);
          if (onComplete) onComplete();
        };

        synthRef.current.speak(utterance);
      } catch (_) {
        setIsSpeakingTTS(false);
        if (onComplete) onComplete();
      }
    },
    [ttsEnabled]
  );

  // Stop Speech-to-Text Microphone
  const stopMicrophone = useCallback(() => {
    isMicActiveRef.current = false;
    setIsMicActive(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) {}
    }
  }, []);

  // Start Speech-to-Text Microphone (Section 6 & 8)
  const startMicrophone = useCallback(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError('Voice recognition unavailable in this browser. You can type your answer instead.');
      setInputMode('text');
      return;
    }

    stopTTS();
    setSpeechError(null);

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isMicActiveRef.current = true;
        setIsMicActive(true);
        lastSpeechTimestampRef.current = Date.now();
        setMachineState(MACHINE_STATES.LISTENING);
      };

      recognition.onresult = (event) => {
        lastSpeechTimestampRef.current = Date.now();
        setSilenceHint(null);
        setMachineState(MACHINE_STATES.TRANSCRIBING);

        let newlyFinalized = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newlyFinalized += transcriptChunk + ' ';
          } else {
            currentInterim += transcriptChunk;
          }
        }

        if (newlyFinalized) {
          setFinalTranscript((prev) => `${prev} ${newlyFinalized}`.replace(/\s+/g, ' ').trim());
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isMicActiveRef.current = false;
          setIsMicActive(false);
          setSpeechError('Microphone permission denied. Switched to Type Answer mode.');
          setInputMode('text');
        }
      };

      recognition.onend = () => {
        if (isMicActiveRef.current) {
          try {
            recognition.start();
          } catch (_) {
            isMicActiveRef.current = false;
            setIsMicActive(false);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setSpeechError('Voice recognition unavailable. You can type your answer instead.');
      setInputMode('text');
    }
  }, [stopTTS]);

  // Trigger AI_SPEAKING whenever a new question arrives
  const announceQuestion = useCallback(
    (questionObj) => {
      if (!questionObj?.question) return;
      setFinalTranscript('');
      setInterimTranscript('');
      setTypedAnswer('');
      setSilenceHint(null);
      setHintUsedThisQuestion(false);
      setSilenceDetectedThisQuestion(false);
      setQuestionStartTime(Date.now());
      lastSpeechTimestampRef.current = Date.now();
      hintTriggeredForQRef.current = null;

      setMachineState(MACHINE_STATES.AI_SPEAKING);
      speakText(questionObj.question, () => {
        setMachineState(MACHINE_STATES.LISTENING);
        lastSpeechTimestampRef.current = Date.now();
      });
    },
    [speakText]
  );

  // Continuous Interview Timer: starts at 00:00 and counts upward uninterrupted
  useEffect(() => {
    if (!isInterviewActive) return;

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isInterviewActive]);

  // Subtle Conversational Silence Prompt (Section 9 & 12)
  useEffect(() => {
    if (!isInterviewActive) return;
    const isCandidateTurn =
      machineState === MACHINE_STATES.LISTENING ||
      machineState === MACHINE_STATES.TRANSCRIBING;

    if (!isCandidateTurn || !isMicActive || isSpeakingTTS) return;

    const silenceCheckInterval = setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastSpeechTimestampRef.current) / 1000);
      const qId = interview?.currentQuestion?.questionId;

      if (
        idleSec >= SILENCE_HINT_THRESHOLD_SECONDS &&
        qId &&
        hintTriggeredForQRef.current !== qId
      ) {
        hintTriggeredForQRef.current = qId;
        setSilenceDetectedThisQuestion(true);
        setHintUsedThisQuestion(true);

        const currentPartial = `${finalTranscript} ${interimTranscript}`.trim();
        const conversationalNudge =
          interview?.currentQuestion?.hint ||
          'Take your time. You can start with the approach you would take.';
        setSilenceHint(conversationalNudge);

        const activeId = interview?._id || interview?.interviewId;
        if (activeId) {
          interviewAgentService
            .requestSilenceHint(activeId, currentPartial)
            .then((res) => {
              if (res?.data?.hint) {
                setSilenceHint(res.data.hint);
              }
            })
            .catch(() => {});
        }
      }
    }, 1000);

    return () => clearInterval(silenceCheckInterval);
  }, [
    isInterviewActive,
    machineState,
    isMicActive,
    isSpeakingTTS,
    interview?.currentQuestion?.questionId,
    interview?.currentQuestion?.hint,
    finalTranscript,
    interimTranscript,
  ]);

  // Start New Interview
  const handleStartNewInterview = async (verificationData = null) => {
    try {
      const targetTotal =
        configuredQuestionCountRef.current ||
        selectedTotalQuestions ||
        (questionCountSelect === 'Other'
          ? parseInt(customQuestionCount.trim(), 10)
          : parseInt(questionCountSelect, 10)) ||
        10;
      setSelectedTotalQuestions(targetTotal);
      configuredQuestionCountRef.current = targetTotal;

      setErrorBanner(null);
      setClosingMessage('');
      setIsInterviewCompleted(false);
      hasCompletedRef.current = false;
      isSubmittingAnswerRef.current = false;
      currentQuestionNumberRef.current = 1;
      setCurrentQuestionNumber(1);
      setElapsedSeconds(0); // Timer resets to 00:00!
      setMachineState(MACHINE_STATES.INITIALIZING);

      const res = await interviewAgentService.startInterview({
        sessionId: sessionId || preContext?.sessionId,
        companyName: preContext?.companyName,
        targetRole: preContext?.targetRole,
        interviewType: selectedInterviewType,
        totalQuestions: targetTotal,
        identityVerification: verificationData?.identityVerification || readinessData?.identityVerification,
        livenessVerification: verificationData?.livenessVerification || readinessData?.livenessVerification,
      });

      const sessionData = res?.data;
      if (sessionData && sessionData.currentQuestion) {
        sessionData.totalQuestions = targetTotal;
        setInterview(sessionData);
        setElapsedSeconds(0); // Timer starts at 00:00!
        sessionStorage.setItem(
          `prepagent_active_interview_${sessionId || 'default'}`,
          sessionData._id || sessionData.interviewId
        );
        announceQuestion(sessionData.currentQuestion);
        return;
      }
      throw new Error('No session returned');
    } catch (err) {
      console.warn('Backend interview start failed or preview mode active, providing interactive session fallback:', err);
      const targetTotal =
        configuredQuestionCountRef.current ||
        selectedTotalQuestions ||
        (questionCountSelect === 'Other'
          ? parseInt(customQuestionCount.trim(), 10)
          : parseInt(questionCountSelect, 10)) ||
        10;
      const fallbackSession = {
        _id: 'live_interview_session',
        companyName: preContext?.companyName || 'Target Company',
        targetRole: preContext?.targetRole || 'Software Engineer',
        interviewType: selectedInterviewType || 'Mixed',
        status: 'IN_PROGRESS',
        elapsedSeconds: 0,
        totalQuestions: targetTotal,
        currentQuestion: {
          questionId: 'q1',
          question:
            'Can you explain how you design and scale distributed microservices in a cloud-native architecture?',
          category: selectedInterviewType === 'HR' ? 'Behavioral' : 'System Design & Architecture',
        },
      };
      currentQuestionNumberRef.current = 1;
      setCurrentQuestionNumber(1);
      setElapsedSeconds(0); // Timer starts at 00:00!
      setInterview(fallbackSession);
      announceQuestion(fallbackSession.currentQuestion);
    }
  };

  // Resume Active Interview
  const handleResumeInterview = () => {
    if (!interview) return;
    announceQuestion(interview.currentQuestion);
  };

  // Submit Answer -> Silent Internal Evaluation -> Next Question or End Interview
  const handleSubmitAnswer = async () => {
    if (isSubmittingAnswerRef.current || hasCompletedRef.current || isInterviewCompleted) {
      return;
    }

    const combinedAnswer =
      inputMode === 'voice'
        ? `${finalTranscript} ${interimTranscript}`.trim() || typedAnswer.trim()
        : typedAnswer.trim() || `${finalTranscript} ${interimTranscript}`.trim();

    if (!combinedAnswer) {
      setErrorBanner('Please speak or type your answer before submitting.');
      return;
    }

    isSubmittingAnswerRef.current = true;
    stopMicrophone();
    stopTTS();
    setErrorBanner(null);

    const activeId = interview?._id || interview?.interviewId;
    const answerDurationSec = Math.max(3, Math.round((Date.now() - questionStartTime) / 1000));
    const totalQCount =
      configuredQuestionCountRef.current ||
      selectedTotalQuestions ||
      Number(interview?.totalQuestions) ||
      (questionCountSelect === 'Other'
        ? parseInt(customQuestionCount.trim(), 10)
        : parseInt(questionCountSelect, 10)) ||
      10;
    const isFinalQuestion = currentQuestionNumberRef.current >= totalQCount;

    try {
      setMachineState(MACHINE_STATES.ANSWER_SUBMITTED);
      await interviewAgentService.submitAnswer(activeId, {
        answerText: combinedAnswer,
        transcription: `${finalTranscript} ${interimTranscript}`.trim(),
        answerMode: inputMode,
        durationSeconds: answerDurationSec,
        elapsedSeconds,
        silenceDetected: silenceDetectedThisQuestion,
        hintUsed: hintUsedThisQuestion,
        autoOrchestrate: false,
      }).catch((e) => console.warn('Submit answer warning:', e));

      setMachineState(MACHINE_STATES.EVALUATING);
      const evalRes = await interviewAgentService.evaluateAnswer(activeId).catch((e) => {
        console.warn('Evaluate answer warning:', e);
        return null;
      });
      if (evalRes?.data?.interview) {
        setInterview((prev) => ({
          ...prev,
          ...evalRes.data.interview,
          totalQuestions: totalQCount,
        }));
      }

      // 4. FINAL QUESTION MUST NOT GENERATE ANOTHER QUESTION
      if (isFinalQuestion) {
        hasCompletedRef.current = true;
        setIsInterviewCompleted(true);
        setMachineState(MACHINE_STATES.FINAL_EVALUATION);
        sessionStorage.removeItem(`prepagent_active_interview_${sessionId || 'default'}`);

        const summaryPayload = getFinalEnvironmentSummary();
        await interviewAgentService.endInterview(
          activeId,
          elapsedSeconds,
          summaryPayload,
          summaryPayload?.incidents || []
        ).catch((e) => console.warn('End interview warning:', e));

        const closingText = 'Thank you for your time. Have a nice day!';
        setClosingMessage(closingText);

        let hasNavigated = false;
        const completeAndNavigate = () => {
          if (hasNavigated) return;
          hasNavigated = true;
          setMachineState(MACHINE_STATES.COMPLETED);
          navigate(
            `/preparation/${sessionId || preContext?.sessionId || 'default'}/interview-report?interviewId=${activeId}`
          );
        };

        // Speak closing message using EXISTING speech/TTS mechanism
        speakText(closingText, () => {
          setTimeout(completeAndNavigate, 800);
        });

        // Safety fallback in case speech is disabled or unhandled
        setTimeout(completeAndNavigate, 5000);
        return;
      }

      // Otherwise: increment question number once answer completed and loading next question
      const nextNum = Math.min(totalQCount, currentQuestionNumberRef.current + 1);
      currentQuestionNumberRef.current = nextNum;
      setCurrentQuestionNumber(nextNum);

      setMachineState(MACHINE_STATES.DECIDING_NEXT_ACTION);
      const nextRes = await interviewAgentService.getNextQuestion(activeId);
      const decisionPayload = nextRes?.data;

      if (
        decisionPayload?.action === 'END_INTERVIEW' ||
        decisionPayload?.interview?.status === 'COMPLETED'
      ) {
        hasCompletedRef.current = true;
        setIsInterviewCompleted(true);
        setMachineState(MACHINE_STATES.FINAL_EVALUATION);
        sessionStorage.removeItem(`prepagent_active_interview_${sessionId || 'default'}`);

        const summaryPayload = getFinalEnvironmentSummary();
        await interviewAgentService.updateMonitoringSummary(activeId, {
          environmentSummary: summaryPayload,
          incidents: summaryPayload?.incidents || [],
        }).catch(() => {});

        const closingText = 'Thank you for your time. Have a nice day!';
        setClosingMessage(closingText);

        let hasNavigated = false;
        const completeAndNavigate = () => {
          if (hasNavigated) return;
          hasNavigated = true;
          setMachineState(MACHINE_STATES.COMPLETED);
          navigate(
            `/preparation/${sessionId || preContext?.sessionId || 'default'}/interview-report?interviewId=${activeId}`
          );
        };

        speakText(closingText, () => {
          setTimeout(completeAndNavigate, 800);
        });

        setTimeout(completeAndNavigate, 5000);
        return;
      }

      setMachineState(MACHINE_STATES.NEXT_QUESTION);
      if (decisionPayload?.interview) {
        setInterview((prev) => ({
          ...prev,
          ...decisionPayload.interview,
          totalQuestions: totalQCount,
        }));
      }
      announceQuestion(decisionPayload?.nextQuestion || decisionPayload?.interview?.currentQuestion);
    } catch (err) {
      console.warn('Answer progression notice:', err);
      if (isFinalQuestion) {
        hasCompletedRef.current = true;
        setIsInterviewCompleted(true);
        const closingText = 'Thank you for your time. Have a nice day!';
        setClosingMessage(closingText);
        speakText(closingText, () => {
          setTimeout(() => {
            setMachineState(MACHINE_STATES.COMPLETED);
            navigate(
              `/preparation/${sessionId || preContext?.sessionId || 'default'}/interview-report?interviewId=${activeId || 'preview'}`
            );
          }, 800);
        });
      } else {
        // Fallback next question in case of offline/network interruption
        const fallbackQuestions = [
          'Could you describe a challenging bug you encountered in production and how you debugged and resolved it?',
          'How do you approach writing clean, maintainable, and test-driven code in a fast-paced environment?',
          'Tell me about a time you had a technical disagreement with a team member and how you reached consensus.',
          'How do you optimize system performance and identify bottlenecks in a web application?',
        ];
        const nextQIndex = (currentQuestionNumberRef.current - 1) % fallbackQuestions.length;
        const fallbackNextQ = {
          questionId: `fallback_q_${currentQuestionNumberRef.current}`,
          question: fallbackQuestions[nextQIndex],
          category: selectedInterviewType || 'Technical',
          difficulty: 'Medium',
        };
        setInterview((prev) => ({
          ...prev,
          currentQuestion: fallbackNextQ,
          totalQuestions: totalQCount,
        }));
        announceQuestion(fallbackNextQ);
      }
    } finally {
      isSubmittingAnswerRef.current = false;
    }
  };

  // End Interview & View Report
  const handleEndInterviewEarly = async () => {
    if (!interview) {
      navigate(sessionId ? `/preparation/${sessionId}` : '/dashboard');
      return;
    }
    stopMicrophone();
    stopTTS();
    const activeId = interview._id || interview.interviewId;
    try {
      setMachineState(MACHINE_STATES.FINAL_EVALUATION);
      const summaryPayload = getFinalEnvironmentSummary();
      await interviewAgentService.endInterview(
        activeId,
        elapsedSeconds,
        summaryPayload,
        summaryPayload.incidents
      );
      sessionStorage.removeItem(`prepagent_active_interview_${sessionId || 'default'}`);
      setMachineState(MACHINE_STATES.COMPLETED);
      navigate(
        `/preparation/${sessionId || preContext?.sessionId || 'default'}/interview-report?interviewId=${activeId}`
      );
    } catch (_) {
      setErrorBanner('Could not finalize interview report right now. Please try again.');
      setMachineState(MACHINE_STATES.LISTENING);
    }
  };

  // Map machine state to visual AI Interviewer state
  const getAvatarStateForMachine = () => {
    if (isSpeakingTTS || machineState === MACHINE_STATES.AI_SPEAKING) return 'SPEAKING';
    if (
      machineState === MACHINE_STATES.ANSWER_SUBMITTED ||
      machineState === MACHINE_STATES.EVALUATING ||
      machineState === MACHINE_STATES.DECIDING_NEXT_ACTION ||
      machineState === MACHINE_STATES.FINAL_EVALUATION
    ) {
      return 'THINKING';
    }
    if (machineState === MACHINE_STATES.LISTENING || machineState === MACHINE_STATES.TRANSCRIBING) {
      return silenceHint ? 'ENCOURAGING' : 'LISTENING';
    }
    if (machineState === MACHINE_STATES.COMPLETED) return 'COMPLETED';
    return 'IDLE';
  };

  // 1. Loading Screen
  if (machineState === MACHINE_STATES.INITIALIZING && !interview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-royal-50 border border-royal-200 flex items-center justify-center mb-4 animate-pulse">
          <Sparkles className="w-7 h-7 text-royal-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Preparing Your Interview Room</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Connecting with your AI Interviewer for {preContext?.companyName || 'your target role'}...
        </p>
      </div>
    );
  }

  // 2. Pre-Interview Selection Screen (Light, Clean Brand Style)
  if (machineState === MACHINE_STATES.READY) {
    const interviewTypes = [
      {
        id: 'Technical',
        title: 'Technical Interview',
        icon: Code2,
        badge: 'Engineering & Architecture',
        description:
          'Focuses on technical concepts, projects, coding, and problem solving.',
      },
      {
        id: 'HR',
        title: 'HR & Behavioral',
        icon: Users,
        badge: 'Culture & Leadership',
        description:
          'Focuses on introduction, behavior, teamwork, and career-related questions.',
      },
      {
        id: 'Mixed',
        title: 'Mixed Interview',
        icon: Layers,
        badge: 'Recommended Full Simulation',
        description:
          'Combines technical, project, problem-solving, and behavioral questions.',
      },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F3F6FD] to-[#F8FAFC] text-slate-900 flex flex-col">
        {/* Clean Top Navigation */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(sessionId ? `/preparation/${sessionId}` : '/dashboard')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Back to Preparation"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-royal-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                PrepAgent <span className="text-royal-600">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {preContext?.latestCompletedInterviewId && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/preparation/${sessionId || preContext.sessionId}/interview-report?interviewId=${preContext.latestCompletedInterviewId}`
                  )
                }
                className="px-4 py-2 rounded-xl bg-royal-50 hover:bg-royal-100 text-royal-700 font-semibold text-xs border border-royal-200 transition-all"
              >
                View Previous Feedback Report
              </button>
            )}

            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() =>
                navigate(`/preparation/${sessionId || preContext?.sessionId}/interview-report`)
              }
              className="text-xs font-semibold whitespace-nowrap shadow-sm"
            >
              Continue Next
            </Button>
          </div>
        </header>

        <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
          {errorBanner && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Active Interview Resume Card */}
          {interview && interview.status === 'IN_PROGRESS' && (
            <div className="mb-8 p-6 rounded-3xl bg-white border border-royal-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Interview in Progress
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Continue your {interview.interviewType} Interview for {interview.companyName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your AI Interviewer is ready to continue where you left off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  isResumingRef.current = true;
                  setShowConsentModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                Rejoin Interview Room
              </button>
            </div>
          )}

          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-royal-50 text-royal-700 border border-royal-200 mb-3">
              {preContext?.companyName || 'Target Company'} • {preContext?.targetRole || 'Software Engineer'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Join Your AI Video Interview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-xl mx-auto">
              Select your primary interview focus below. Your AI interviewer will adapt questions dynamically based on your resume and answers.
            </p>
          </div>

          {/* AI Interviewer Greeting Card */}
          <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-[#091122] border border-blue-500/30 shadow-xl text-white flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-blue-400/50 shadow-lg flex-shrink-0 bg-slate-900">
              <img
                src={sarahAvatar}
                alt="Sarah J. - AI Interviewer"
                className="w-full h-full object-cover object-[50%_35%] scale-105"
              />
              <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#091122] shadow-sm animate-pulse" title="AI Interviewer Ready" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Sarah J. • AI Interviewer</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Hi! I'm Sarah J. I'll be conducting your interview.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Your AI interviewer will ask personalized questions based on your resume, role, and responses.
              </p>
            </div>
          </div>

          {/* Number of Questions Section */}
          <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <Select
              label="Number of Questions"
              name="questionCount"
              value={questionCountSelect}
              onChange={(e) => {
                const val = e.target.value;
                setQuestionCountSelect(val);
                if (val !== 'Other') {
                  setCustomQuestionError('');
                }
              }}
              options={['5', '10', '15', '20', 'Other']}
              placeholder=""
            />

            {questionCountSelect === 'Other' && (
              <div className="mt-4">
                <Input
                  label="Custom Number of Questions"
                  name="customQuestionCount"
                  type="number"
                  placeholder="Enter number of questions"
                  value={customQuestionCount}
                  onChange={handleCustomQuestionChange}
                  onKeyDown={handleCustomQuestionKeyDown}
                  min="1"
                  max="20"
                  step="1"
                  error={customQuestionError}
                  required
                />
              </div>
            )}
          </div>

          {/* Interview Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {interviewTypes.map((typeItem) => {
              const Icon = typeItem.icon;
              const isSelected = selectedInterviewType === typeItem.id;
              return (
                <button
                  key={typeItem.id}
                  type="button"
                  onClick={() => setSelectedInterviewType(typeItem.id)}
                  className={`text-left p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-royal-600 ring-2 ring-royal-500/20 shadow-md'
                      : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-royal-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isSelected
                            ? 'bg-royal-50 text-royal-700 border border-royal-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {typeItem.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5">{typeItem.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {typeItem.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className={isSelected ? 'text-royal-700 font-bold' : 'text-slate-400'}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-royal-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleStartInterviewClick}
              disabled={questionCountSelect === 'Other' && !isCustomCountValid}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all ${
                questionCountSelect === 'Other' && !isCustomCountValid
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-royal-600 to-indigo-600 hover:from-royal-700 hover:to-indigo-700 text-white shadow-royal-600/20 cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>

        {/* Responsible Proctoring & Environment Modals (Sections 2 - 11, Section 23) */}
        {showConsentModal && (
          <InterviewConsentModal
            onConsent={() => {
              setShowConsentModal(false);
              setShowReadinessModal(true);
            }}
            onCancel={() => setShowConsentModal(false)}
          />
        )}

        {showReadinessModal && (
          <InterviewReadinessModal
            companyName={preContext?.companyName || 'Target Company'}
            targetRole={preContext?.targetRole || 'Software Engineer'}
            onAllChecksPassed={(verificationPayload) => {
              setShowReadinessModal(false);
              setReadinessData(verificationPayload);
              if (isResumingRef.current && interview && interview.status === 'IN_PROGRESS') {
                handleResumeInterview();
              } else {
                handleStartNewInterview(verificationPayload);
              }
            }}
            onCancel={() => setShowReadinessModal(false)}
          />
        )}
      </div>
    );
  }

  // 3. LIVE VIDEO INTERVIEW SCREEN (Redesigned with Dominant Human AI Interviewer)
  const isProcessingTurn =
    machineState === MACHINE_STATES.ANSWER_SUBMITTED ||
    machineState === MACHINE_STATES.EVALUATING ||
    machineState === MACHINE_STATES.DECIDING_NEXT_ACTION ||
    machineState === MACHINE_STATES.FINAL_EVALUATION ||
    isInterviewCompleted ||
    Boolean(closingMessage);

  const liveSpokenDisplay = `${finalTranscript} ${interimTranscript}`.trim();
  const totalQuestions =
    configuredQuestionCountRef.current ||
    selectedTotalQuestions ||
    Number(interview?.totalQuestions) ||
    10;
  const currentQuestionIndex = Math.min(totalQuestions, Math.max(1, currentQuestionNumber));
  const companyName = interview?.companyName || preContext?.companyName || 'Nvidia';

  const activeQuestionText =
    closingMessage ||
    interview?.currentQuestion?.question ||
    'Welcome to your Nvidia QA / Test Engineer interview. I noticed on your resume that you built "WanderWave(MERN Stack)" using Node.js, Express.js, EJS. Could you explain the core architecture of WanderWave(MERN Stack) and the most challenging technical problem you solved while building it?';

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#070D1E] text-slate-900 flex flex-col">
      {/* 1. TOP NAVIGATION */}
      <InterviewHeader
        companyName={companyName}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        elapsedSeconds={elapsedSeconds}
        remainingSeconds={elapsedSeconds}
        isMonitored={true}
        isProcessing={isProcessingTurn}
        formatTime={formatTime}
        onExit={() => navigate(sessionId ? `/preparation/${sessionId}` : '/dashboard')}
        onFeedback={handleEndInterviewEarly}
        onEndInterview={handleEndInterviewEarly}
      />

      {/* Minor Warning Toast */}
      <EnvironmentToast toast={activeToast} onDismiss={dismissToast} />

      {/* Serious / Repeated Warning Overlay */}
      <EnvironmentOverlay overlay={activeOverlay} onDismiss={dismissOverlay} />

      {/* MAIN VIEWPORT CONTAINER (Section 29: Grid with AI stage minmax(0, 1fr) auto auto auto) */}
      <main className="interview-content flex-1 min-h-0 w-full max-w-[1440px] mx-auto px-3 sm:px-5 py-2 grid grid-rows-[minmax(0,1fr)_auto_auto_auto] gap-2 overflow-hidden">
        {errorBanner && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs font-semibold underline cursor-pointer ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. LARGE CINEMATIC AI HUMAN STAGE + FLOATING CANDIDATE CAMERA (Row 1: minmax(0, 1fr)) */}
        <div className="ai-stage min-h-0 overflow-hidden relative h-full w-[calc(100%-2rem)] sm:w-[calc(100%-8vw)] mx-auto">
          <HumanInterviewerAvatar
            avatarState={getAvatarStateForMachine()}
            isSpeaking={isSpeakingTTS || machineState === MACHINE_STATES.AI_SPEAKING}
            isListening={isMicActive}
            subtlePrompt={silenceHint}
            companyName={companyName}
            candidateCamera={
              <CandidateWebcam
                videoRef={videoRef}
                stream={cameraStream || mediaStreamRef.current}
                isCameraOn={isCameraOn}
                cameraError={cameraError}
              />
            }
          />
        </div>

        {/* 2. FULL-WIDTH COMPACT QUESTION CARD (Row 2: auto) */}
        <CurrentQuestion
          className="question-card !w-[calc(100%-2rem)] sm:!w-[calc(100%-8vw)] mx-auto"
          question={activeQuestionText}
          questionNumber={currentQuestionIndex}
          totalQuestions={totalQuestions}
          category={closingMessage ? 'Closing' : (interview?.currentQuestion?.category || selectedInterviewType || 'Technical')}
          difficulty={closingMessage ? 'Completed' : (interview?.currentQuestion?.difficulty || 'Medium')}
          isTransitioning={isProcessingTurn}
          onReplay={() => speakText(activeQuestionText)}
        />

        {/* 3. FULL-WIDTH COMPACT LIVE CAPTION CARD (Row 3: auto) */}
        <LiveTranscript
          className="live-caption !w-[calc(100%-2rem)] sm:!w-[calc(100%-8vw)] mx-auto"
          isSpeakingTTS={isSpeakingTTS || machineState === MACHINE_STATES.AI_SPEAKING}
          questionText={activeQuestionText}
          isMicActive={isMicActive}
          inputMode={inputMode}
          finalTranscript={finalTranscript}
          interimTranscript={interimTranscript}
          typedAnswer={typedAnswer}
          onTypedAnswerChange={(text) => {
            setTypedAnswer(text);
            lastSpeechTimestampRef.current = Date.now();
          }}
          speechError={speechError}
          isProcessing={isProcessingTurn}
        />

        {/* 4. FULL-WIDTH COMPACT ANSWER CONTROLS BAR (Row 4: auto) */}
        <InterviewControls
          className="answer-controls"
          inputMode={inputMode}
          isMicActive={isMicActive}
          isCameraOn={isCameraOn}
          isSpeakerOn={ttsEnabled}
          isSpeakingTTS={isSpeakingTTS}
          isProcessing={isProcessingTurn}
          hasAnswerContent={Boolean(liveSpokenDisplay || typedAnswer.trim())}
          onStartAnswer={() => startMicrophone()}
          onStopAnswer={() => stopMicrophone()}
          onToggleInputMode={(mode) => {
            if (mode === 'text') {
              stopMicrophone();
              if (liveSpokenDisplay && !typedAnswer) {
                setTypedAnswer(liveSpokenDisplay);
              }
              setInputMode('text');
            } else {
              setInputMode('voice');
            }
          }}
          onSubmitAnswer={handleSubmitAnswer}
          onReplayQuestion={() => speakText(activeQuestionText)}
          onToggleCamera={() => setIsCameraOn((v) => !v)}
          onToggleMic={() => {
            if (isMicActive) stopMicrophone();
            else startMicrophone();
          }}
          onToggleSpeaker={() => {
            if (ttsEnabled) stopTTS();
            setTtsEnabled((v) => !v);
          }}
        />
      </main>
    </div>
  );
};

export default MockInterview;
