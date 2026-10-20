import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Clock,
  Sliders,
  Layers,
  HelpCircle,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { preparationService } from '../services/preparationService';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ResumeSelector from '../components/preparation/ResumeSelector';
import CompanyCombobox from '../components/common/CompanyCombobox';

const TARGET_ROLES = [
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Java Developer',
  'Python Developer',
  'AI Engineer',
  'Machine Learning Engineer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'Cloud Engineer',
  'Cybersecurity Engineer',
  'Mobile App Developer',
  'QA / Test Engineer',
  'Other / Custom Role',
];

const QUESTION_COUNT_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
  { value: 'Other', label: 'Other' },
];

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Medium-Hard', 'Hard'];

const PreparationSetup = () => {
  const [existingResume, setExistingResume] = useState(null);
  const [useExistingResume, setUseExistingResume] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);

  const [formData, setFormData] = useState({
    targetRole: '',
    customRole: '',
    company: '',
    jobDescription: '',
    questionCount: 10,
    difficultyOverride: null, // null when using AI recommended
  });

  const [selectedCompany, setSelectedCompany] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
  const [customQuestionCount, setCustomQuestionCount] = useState('');

  // Dynamic Gemini difficulty states
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiDifficultyReason, setAiDifficultyReason] = useState(
    'Based on your company, target role, job description, resume and identified skill gaps.'
  );
  const [isAiDifficultyLoading, setIsAiDifficultyLoading] = useState(false);
  const [isAiDifficultyGenerated, setIsAiDifficultyGenerated] = useState(false);
  const [aiDifficultyFailed, setAiDifficultyFailed] = useState(false);
  const [isUserOverridden, setIsUserOverridden] = useState(false);

  // Target role explicit selection & inference refs
  const userExplicitRoleSelectedRef = useRef(false);
  const lastInferredJdRef = useRef('');
  const roleInferDebounceTimerRef = useRef(null);

  // Dynamic difficulty debouncing and caching refs
  const lastDifficultyContextRef = useRef('');
  const difficultyDebounceTimerRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineError, setPipelineError] = useState(null);

  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const step4Ref = useRef(null);

  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  // Fetch latest resume on mount
  useEffect(() => {
    const fetchExistingResume = async () => {
      try {
        const res = await preparationService.getLatestResume();
        if (res.success && res.resume) {
          setExistingResume(res.resume);
          setUseExistingResume(true);
        } else {
          setUseExistingResume(false);
        }
      } catch (err) {
        setUseExistingResume(false);
      }
    };
    fetchExistingResume();
  }, []);

  // Compute effective display role for Step 4
  const displayRole = useMemo(() => {
    if (formData.targetRole === 'Other / Custom Role') {
      return formData.customRole.trim();
    }
    return formData.targetRole.trim();
  }, [formData.targetRole, formData.customRole]);

  // Active difficulty (User manual override has priority if selected, else Gemini recommendation)
  const effectiveDifficulty = formData.difficultyOverride || aiDifficulty;

  // Target Role Intelligent Auto-Detection (Priority 1: User Explicit, Priority 2: Stored, Priority 3: Gemini Infer)
  useEffect(() => {
    // If user has already explicitly selected/entered a role, do NOT overwrite
    if (userExplicitRoleSelectedRef.current || formData.targetRole) {
      return;
    }

    const jd = (formData.jobDescription || '').trim();
    if (jd.length < 25) {
      return;
    }

    if (lastInferredJdRef.current === jd.slice(0, 150)) {
      return;
    }

    if (roleInferDebounceTimerRef.current) {
      clearTimeout(roleInferDebounceTimerRef.current);
    }

    roleInferDebounceTimerRef.current = setTimeout(async () => {
      lastInferredJdRef.current = jd.slice(0, 150);

      try {
        let payload;
        if (!useExistingResume && uploadedFile) {
          payload = new FormData();
          payload.append('jobDescription', jd);
          payload.append('company', formData.company);
          payload.append('resume', uploadedFile);
        } else {
          payload = {
            jobDescription: jd,
            company: formData.company,
            resumeId: useExistingResume && existingResume ? existingResume._id : undefined,
          };
        }

        const res = await preparationService.inferTargetRole(payload);
        // Only apply if user STILL hasn't explicitly chosen a role
        if (res && res.success && res.targetRole && !userExplicitRoleSelectedRef.current) {
          const detectedRole = res.targetRole.trim();
          const matchedRole = TARGET_ROLES.find(
            (r) => r.toLowerCase() === detectedRole.toLowerCase()
          );

          if (matchedRole) {
            setFormData((prev) => (prev.targetRole ? prev : { ...prev, targetRole: matchedRole }));
          } else {
            setFormData((prev) =>
              prev.targetRole
                ? prev
                : { ...prev, targetRole: 'Other / Custom Role', customRole: detectedRole }
            );
          }
        }
      } catch (err) {
        console.warn('Role inference error:', err);
      }
    }, 900);

    return () => {
      if (roleInferDebounceTimerRef.current) {
        clearTimeout(roleInferDebounceTimerRef.current);
      }
    };
  }, [
    formData.jobDescription,
    formData.targetRole,
    formData.company,
    useExistingResume,
    existingResume,
    uploadedFile,
  ]);

  // Dynamic Gemini Difficulty Analysis (analyzes Company + Role + JD + Resume + Skill Gap)
  useEffect(() => {
    const company = (formData.company || '').trim();
    const role = displayRole;
    const jd = (formData.jobDescription || '').trim();
    const resumeKey = useExistingResume ? existingResume?._id || '' : uploadedFile?.name || '';

    // Only run when sufficient context is available:
    // Company is provided AND (role is provided OR JD is at least 20 characters)
    if (!company || company.toLowerCase() === 'other' || (!role && jd.length < 20)) {
      return;
    }

    const currentContext = `${company}:::${role}:::${jd.slice(0, 200)}:::${resumeKey}`;
    if (lastDifficultyContextRef.current === currentContext) {
      return; // Already analyzed for this exact context
    }

    if (difficultyDebounceTimerRef.current) {
      clearTimeout(difficultyDebounceTimerRef.current);
    }

    difficultyDebounceTimerRef.current = setTimeout(async () => {
      lastDifficultyContextRef.current = currentContext;
      setIsAiDifficultyLoading(true);

      try {
        let payload;
        if (!useExistingResume && uploadedFile) {
          payload = new FormData();
          payload.append('company', company);
          payload.append('targetRole', role);
          payload.append('jobDescription', jd);
          payload.append('resume', uploadedFile);
        } else {
          payload = {
            company,
            targetRole: role,
            jobDescription: jd,
            resumeId: useExistingResume && existingResume ? existingResume._id : undefined,
          };
        }

        const res = await preparationService.recommendDifficulty(payload);
        if (res && res.difficulty) {
          setAiDifficulty(res.difficulty);
          if (res.reason) setAiDifficultyReason(res.reason);
          setIsAiDifficultyGenerated(res.isAiGenerated !== false);
          setAiDifficultyFailed(!res.isAiGenerated);
        } else {
          setIsAiDifficultyGenerated(false);
          setAiDifficultyFailed(true);
        }
      } catch (err) {
        console.warn('Difficulty recommendation API failed:', err);
        setAiDifficulty('Medium');
        setIsAiDifficultyGenerated(false);
        setAiDifficultyFailed(true);
        setAiDifficultyReason(
          'AI recommendation unavailable. You can choose the difficulty manually.'
        );
      } finally {
        setIsAiDifficultyLoading(false);
      }
    }, 700);

    return () => {
      if (difficultyDebounceTimerRef.current) {
        clearTimeout(difficultyDebounceTimerRef.current);
      }
    };
  }, [
    formData.company,
    displayRole,
    formData.jobDescription,
    useExistingResume,
    existingResume,
    uploadedFile,
  ]);

  // Step completion indicators
  const isStep1Done = Boolean((useExistingResume && existingResume) || uploadedFile);
  const isStep2Done = Boolean(
    formData.targetRole &&
      (formData.targetRole !== 'Other / Custom Role' || formData.customRole.trim())
  );
  const isStep3Done = Boolean(formData.jobDescription.trim().length >= 20);
  const isCompanyValid = Boolean(
    selectedCompany &&
      (selectedCompany !== 'Other' ||
        (customCompany.trim() && customCompany.trim().toLowerCase() !== 'other'))
  );
  const isQuestionCountValid = Boolean(
    selectedQuestionCount !== 'Other'
      ? [5, 10, 15, 20].includes(Number(selectedQuestionCount))
      : /^\d+$/.test(String(customQuestionCount).trim()) &&
          Number(customQuestionCount) >= 1 &&
          Number(customQuestionCount) <= 20
  );
  const isStep4Done = Boolean(isCompanyValid && isQuestionCountValid && displayRole);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleCompanySelect = (e) => {
    const val = e.target.value;
    if (val === 'Other') {
      setSelectedCompany('Other');
      setCustomCompany('');
      setFormData((prev) => ({ ...prev, company: '' }));
      if (errors.company) {
        setErrors((prev) => ({ ...prev, company: null }));
      }
    } else {
      setSelectedCompany(val);
      setCustomCompany('');
      setFormData((prev) => ({ ...prev, company: val }));
      if (errors.company || errors.customCompany) {
        setErrors((prev) => ({ ...prev, company: null, customCompany: null }));
      }
    }
  };

  const handleCustomCompanyChange = (e) => {
    const val = e.target.value;
    setCustomCompany(val);
    setFormData((prev) => ({ ...prev, company: val }));
    if (errors.customCompany) {
      setErrors((prev) => ({ ...prev, customCompany: null }));
    }
  };

  const handleQuestionCountSelect = (e) => {
    const val = e.target.value;
    if (val === 'Other') {
      setSelectedQuestionCount('Other');
      setCustomQuestionCount('');
      setFormData((prev) => ({ ...prev, questionCount: '' }));
      if (errors.customQuestionCount) {
        setErrors((prev) => ({ ...prev, customQuestionCount: null }));
      }
    } else {
      const num = Number(val);
      setSelectedQuestionCount(num);
      setCustomQuestionCount('');
      setFormData((prev) => ({ ...prev, questionCount: num }));
      if (errors.customQuestionCount) {
        setErrors((prev) => ({ ...prev, customQuestionCount: null }));
      }
    }
  };

  const handleCustomQuestionChange = (e) => {
    const val = e.target.value;
    setCustomQuestionCount(val);

    const trimmed = String(val).trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, customQuestionCount: null }));
      setFormData((prev) => ({ ...prev, questionCount: '' }));
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setErrors((prev) => ({
        ...prev,
        customQuestionCount: 'Please enter a valid whole number.',
      }));
      setFormData((prev) => ({ ...prev, questionCount: '' }));
      return;
    }

    const num = Number(trimmed);
    if (num > 20) {
      setErrors((prev) => ({
        ...prev,
        customQuestionCount: 'Maximum allowed is 20 questions.',
      }));
      setFormData((prev) => ({ ...prev, questionCount: '' }));
    } else if (num < 1) {
      setErrors((prev) => ({
        ...prev,
        customQuestionCount: 'Minimum allowed is 1 question.',
      }));
      setFormData((prev) => ({ ...prev, questionCount: '' }));
    } else {
      setErrors((prev) => ({ ...prev, customQuestionCount: null }));
      setFormData((prev) => ({ ...prev, questionCount: num }));
    }
  };

  const handleDifficultyChange = (e) => {
    const newDiff = e.target.value;
    setIsUserOverridden(true);
    setFormData((prev) => ({
      ...prev,
      difficultyOverride: newDiff,
    }));
  };

  const validate = () => {
    const errs = {};

    // 1. Resume validation
    if (useExistingResume && existingResume) {
      // Valid using existing resume
    } else if (!uploadedFile) {
      errs.resume = 'Please upload your resume or select an existing one.';
    }

    // 2. Target Job Role validation
    if (!formData.targetRole) {
      errs.targetRole = 'Please select a target job role.';
    } else if (formData.targetRole === 'Other / Custom Role' && !formData.customRole.trim()) {
      errs.customRole = 'Please specify your custom target role.';
    }

    // 3. Job Description validation
    if (!formData.jobDescription.trim()) {
      errs.jobDescription = 'Please provide the job description.';
    } else if (formData.jobDescription.trim().length < 20) {
      errs.jobDescription = 'Please provide a more detailed job description (minimum 20 characters).';
    }

    // 4. Company validation
    if (!selectedCompany) {
      errs.company = 'Please enter or select a company name.';
    } else if (selectedCompany === 'Other') {
      if (!customCompany.trim()) {
        errs.customCompany = 'Please enter your custom company name.';
      } else if (customCompany.trim().toLowerCase() === 'other') {
        errs.customCompany = 'Please enter a valid company name (cannot be "Other").';
      }
    }

    // 5. Question Count validation
    if (selectedQuestionCount === 'Other') {
      const trimmedQ = String(customQuestionCount || '').trim();
      if (!trimmedQ) {
        errs.customQuestionCount = 'Please enter the number of questions.';
      } else if (!/^\d+$/.test(trimmedQ)) {
        errs.customQuestionCount = 'Please enter a valid whole number.';
      } else {
        const qNum = Number(trimmedQ);
        if (qNum > 20) {
          errs.customQuestionCount = 'Maximum allowed is 20 questions.';
        } else if (qNum < 1) {
          errs.customQuestionCount = 'Minimum allowed is 1 question.';
        }
      }
    } else if (![5, 10, 15, 20].includes(Number(selectedQuestionCount))) {
      errs.customQuestionCount = 'Please select a valid question count.';
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      if (errs.resume && step1Ref.current) {
        step1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if ((errs.targetRole || errs.customRole) && step2Ref.current) {
        step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errs.jobDescription && step3Ref.current) {
        step3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (
        (errs.company || errs.customCompany || errs.customQuestionCount) &&
        step4Ref.current
      ) {
        step4Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toastError('Please complete all 4 preparation steps before starting.');
      return;
    }

    const finalCompany =
      selectedCompany === 'Other' ? customCompany.trim() : formData.company.trim();

    const finalQuestionCount =
      selectedQuestionCount === 'Other'
        ? Number(customQuestionCount)
        : Number(selectedQuestionCount);

    if (!finalCompany || finalCompany.toLowerCase() === 'other') {
      toastError('Please enter a valid company name.');
      return;
    }

    if (isNaN(finalQuestionCount) || finalQuestionCount < 1 || finalQuestionCount > 20) {
      toastError('Number of questions must be between 1 and 20.');
      return;
    }

    setIsSubmitting(true);
    setPipelineModalOpen(true);
    setPipelineStep(0);
    setPipelineError(null);

    let createdSessionId = null;

    try {
      // Step A: Prepare payload
      let payload;
      if (useExistingResume && existingResume) {
        payload = {
          targetRole: formData.targetRole,
          customRole: formData.customRole,
          company: finalCompany,
          jobDescription: formData.jobDescription,
          experienceLevel: 'Fresher', // Defaults gracefully
          resumeId: existingResume._id,
          questionCount: finalQuestionCount,
          difficulty: effectiveDifficulty,
          difficultyReason: aiDifficultyReason,
          difficultyOverride: formData.difficultyOverride,
        };
      } else {
        payload = new FormData();
        payload.append('targetRole', formData.targetRole);
        payload.append('customRole', formData.customRole);
        payload.append('company', finalCompany);
        payload.append('jobDescription', formData.jobDescription);
        payload.append('experienceLevel', 'Fresher');
        payload.append('resume', uploadedFile);
        payload.append('questionCount', finalQuestionCount);
        payload.append('difficulty', effectiveDifficulty);
        payload.append('difficultyReason', aiDifficultyReason);
        if (formData.difficultyOverride) {
          payload.append('difficultyOverride', formData.difficultyOverride);
        }
      }

      // Step B: Create session
      setPipelineStep(1); // Resume & role parsing
      const res = await preparationService.createPreparation(payload);

      if (!res.success || !res.session) {
        throw new Error(res.message || 'Failed to initialize preparation session.');
      }

      createdSessionId = res.session._id;

      // Step C: Trigger automated AI Agent Pipeline
      setPipelineStep(2); // Analyzing requirements & skill gaps
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPipelineStep(3); // Building interview roadmap
      try {
        await preparationService.runAutoOrchestrator(createdSessionId);
      } catch (agentErr) {
        console.warn('Agent orchestrator returned:', agentErr);
        // Continue gracefully even if an agent has partial output
      }

      setPipelineStep(4); // Preparing mock interview
      await new Promise((resolve) => setTimeout(resolve, 600));

      toastSuccess('Setup complete! Starting resume analysis...');
      navigate(`/preparation/${createdSessionId}/resume-analysis`);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]) ||
        err.message ||
        'Failed to start preparation workflow.';
      setPipelineError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Title & Description */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Let's Set Up Your Interview Preparation
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Tell us about the opportunity you're preparing for so PrepAgent AI can personalize your
          interview preparation.
        </p>

        {/* 4-Step Stepper Roadmap */}
        <div className="mt-6 flex items-center justify-center overflow-x-auto flex-nowrap scrollbar-none pb-2 gap-1.5 sm:gap-3 text-xs font-semibold">
          {/* Step 1: Resume */}
          <div
            onClick={() => step1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0 ${
              isStep1Done
                ? 'bg-royal-100 text-royal-800 border border-royal-300 font-bold'
                : 'bg-royal-600 text-white shadow-sm'
            }`}
          >
            {isStep1Done ? (
              <Check className="w-3.5 h-3.5 text-royal-700" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
            <span>1. Resume</span>
          </div>

          <span className="text-slate-300 flex-shrink-0">→</span>

          {/* Step 2: Target Role */}
          <div
            onClick={() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0 ${
              isStep2Done
                ? 'bg-royal-100 text-royal-800 border border-royal-300 font-bold'
                : !isStep1Done
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-royal-600 text-white shadow-sm'
            }`}
          >
            {isStep2Done ? (
              <Check className="w-3.5 h-3.5 text-royal-700" />
            ) : isStep1Done && !isStep2Done ? (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            ) : null}
            <span>2. Target Role</span>
          </div>

          <span className="text-slate-300 flex-shrink-0">→</span>

          {/* Step 3: Job Description */}
          <div
            onClick={() => step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0 ${
              isStep3Done
                ? 'bg-royal-100 text-royal-800 border border-royal-300 font-bold'
                : !isStep2Done
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-royal-600 text-white shadow-sm'
            }`}
          >
            {isStep3Done ? (
              <Check className="w-3.5 h-3.5 text-royal-700" />
            ) : isStep2Done && !isStep3Done ? (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            ) : null}
            <span>3. Job Description</span>
          </div>

          <span className="text-slate-300 flex-shrink-0">→</span>

          {/* Step 4: Mock Interview */}
          <div
            onClick={() => step4Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0 ${
              isStep4Done
                ? 'bg-royal-100 text-royal-800 border border-royal-300 font-bold'
                : !isStep3Done
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-royal-600 text-white shadow-sm'
            }`}
          >
            {isStep4Done ? (
              <Check className="w-3.5 h-3.5 text-royal-700" />
            ) : isStep3Done && !isStep4Done ? (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            ) : null}
            <span>4. Mock Interview</span>
          </div>
        </div>
      </div>

      {/* Main Setup Form */}
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* STEP 1: RESUME */}
        <div ref={step1Ref}>
          <Card padding="p-5 sm:p-7" className="border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Resume</h2>
                <p className="text-xs text-slate-500">
                  Upload your latest resume or reuse an existing one.
                </p>
              </div>
            </div>

            <ResumeSelector
              existingResume={existingResume}
              uploadedFile={uploadedFile}
              useExisting={useExistingResume}
              onToggleUseExisting={(val) => {
                setUseExistingResume(val);
                if (errors.resume) setErrors((prev) => ({ ...prev, resume: null }));
              }}
              onFileSelect={(file) => {
                setUploadedFile(file);
                setUseExistingResume(false);
                if (errors.resume) setErrors((prev) => ({ ...prev, resume: null }));
              }}
              onFileRemove={() => {
                setUploadedFile(null);
              }}
              error={errors.resume}
            />
          </Card>
        </div>

        {/* STEP 2: TARGET ROLE */}
        <div ref={step2Ref}>
          <Card padding="p-5 sm:p-7" className="border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Target Role</h2>
                <p className="text-xs text-slate-500">
                  Tell us which role you're preparing to interview for.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Select
                label="Target Job Role"
                name="targetRole"
                value={formData.targetRole}
                onChange={(e) => {
                  userExplicitRoleSelectedRef.current = true;
                  handleChange(e);
                }}
                options={TARGET_ROLES}
                placeholder="Select or enter target role"
                error={errors.targetRole}
                icon={Briefcase}
                required
              />

              {/* Custom Role input when 'Other / Custom Role' is selected */}
              {formData.targetRole === 'Other / Custom Role' && (
                <div className="pt-1">
                  <Input
                    label="Enter custom role"
                    name="customRole"
                    placeholder="e.g. Generative AI Engineer, Blockchain Developer, Software Engineer Intern..."
                    value={formData.customRole}
                    onChange={(e) => {
                      userExplicitRoleSelectedRef.current = true;
                      handleChange(e);
                    }}
                    error={errors.customRole}
                    required
                    helperText="Enter any custom role title. PrepAgent AI personalizes interviews for any specialization."
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* STEP 3: JOB DESCRIPTION */}
        <div ref={step3Ref}>
          <Card padding="p-5 sm:p-7" className="border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Job Description</h2>
                <p className="text-xs text-slate-500">
                  Paste the job description for the role you're targeting so PrepAgent AI can understand the requirements.
                </p>
              </div>
            </div>

            <Textarea
              name="jobDescription"
              rows={8}
              placeholder="Paste the job description here..."
              value={formData.jobDescription}
              onChange={handleChange}
              error={errors.jobDescription}
              required
              helperText="The JD technical requirements, tools, and responsibilities will directly shape your interview questions and skill gap evaluation."
            />
          </Card>
        </div>

        {/* STEP 4: MOCK INTERVIEW */}
        <div ref={step4Ref}>
          <Card padding="p-5 sm:p-7" className="border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Mock Interview</h2>
                <p className="text-xs text-slate-500">
                  Personalize your simulated AI interview session.
                </p>
              </div>
            </div>

            {/* 1. Company Name & 2. Target Role (Desktop: 2 columns, Mobile: stacked) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Searchable Company Combobox */}
              <div>
                <CompanyCombobox
                  label="Company Name"
                  name="company"
                  value={selectedCompany}
                  onChange={handleCompanySelect}
                  error={errors.company}
                  placeholder="Search or select company..."
                  required
                  helperText="Search, select, or enter any custom company name."
                />

                {/* Custom Company input when 'Other' is selected */}
                {selectedCompany === 'Other' && (
                  <div className="pt-3">
                    <Input
                      label="Custom Company Name"
                      name="customCompany"
                      placeholder="Enter company name..."
                      value={customCompany}
                      onChange={handleCustomCompanyChange}
                      error={errors.customCompany}
                      required
                    />
                  </div>
                )}
              </div>

              {/* 2. Target Role (Auto-populated from earlier in flow, read-only display) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Role
                </label>
                <div className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 flex items-center text-slate-800 min-h-[42px]">
                  <div className="flex items-center gap-2 truncate">
                    <Briefcase className="w-4 h-4 text-royal-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">
                      {displayRole || (
                        <span className="text-slate-400 font-normal italic">
                          Automatically populated target role
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Number of Questions Dropdown */}
            <div>
              <Select
                label="Number of Questions"
                name="questionCount"
                value={selectedQuestionCount}
                onChange={handleQuestionCountSelect}
                options={QUESTION_COUNT_OPTIONS}
                required
              />

              {/* Custom Number of Questions input when 'Other' is selected */}
              {selectedQuestionCount === 'Other' && (
                <div className="pt-3">
                  <Input
                    label="Custom Number of Questions"
                    name="customQuestionCount"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    placeholder="Enter number (1-20)..."
                    value={customQuestionCount}
                    onChange={handleCustomQuestionChange}
                    onKeyDown={(e) => {
                      if (['.', 'e', 'E', '-', '+'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    error={errors.customQuestionCount}
                    required
                  />
                </div>
              )}
            </div>

            {/* Difficulty Level Dropdown */}
            <div>
              <Select
                label="Difficulty Level"
                name="difficulty"
                value={effectiveDifficulty}
                onChange={handleDifficultyChange}
                disabled={isAiDifficultyLoading}
                options={[
                  { value: 'Easy', label: 'Easy' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Medium-Hard', label: 'Medium-Hard' },
                  { value: 'Hard', label: 'Hard' },
                ]}
                required
              />

              {/* AI Recommendation Indicator & Details */}
              <div className="mt-2 text-xs">
                {isAiDifficultyLoading ? (
                  <div className="flex items-center gap-1.5 text-royal-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-royal-600" />
                    <span>AI is determining the recommended difficulty...</span>
                  </div>
                ) : isAiDifficultyGenerated ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-royal-600">
                      <Sparkles className="w-3.5 h-3.5 text-royal-600 flex-shrink-0" />
                      <span>✨ AI Recommended</span>
                      {formData.difficultyOverride && (
                        <span className="text-slate-400 font-normal">
                          (Manually adjusted; AI recommended: {aiDifficulty})
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      {aiDifficultyReason ||
                        'Based on your company, role, job description, resume and skill gap.'}
                    </p>
                  </div>
                ) : aiDifficultyFailed ? (
                  <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>AI recommendation unavailable. You can choose the difficulty manually.</span>
                  </div>
                ) : (
                  <p className="text-slate-500">
                    Based on your company, role, job description, resume and skill gap.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>


        {/* Start AI Preparation CTA */}
        <div className="text-center pt-2 pb-12">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            icon={ArrowRight}
            iconPosition="right"
            className="w-full sm:w-80 shadow-xl shadow-royal-600/25 py-4 text-base font-bold transition-all"
          >
            Start AI Preparation →
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            Automated multi-agent analysis will personalize your interview in real-time.
          </p>
        </div>
      </form>

      {/* Automated AI Agent Pipeline Loading Modal */}
      {pipelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 text-center relative overflow-hidden">
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-royal-600 via-indigo-500 to-royal-700" />

            <div className="w-12 h-12 rounded-2xl bg-royal-50 text-royal-600 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <Sparkles className="w-6 h-6 animate-spin duration-1000" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Preparing your personalized interview...
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              PrepAgent AI is analyzing your context and orchestrating agents.
            </p>

            {/* Live Pipeline Steps */}
            <div className="space-y-3 text-left bg-slate-50/80 rounded-xl p-4 border border-slate-100 text-xs">
              <div className="flex items-center gap-2.5">
                {pipelineStep > 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                ) : pipelineStep === 1 ? (
                  <Loader2 className="w-4 h-4 text-royal-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span
                  className={
                    pipelineStep >= 1 ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }
                >
                  Resume analyzed
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {pipelineStep > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                ) : pipelineStep === 2 ? (
                  <Loader2 className="w-4 h-4 text-royal-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span
                  className={
                    pipelineStep >= 2 ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }
                >
                  Role requirements analyzed
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {pipelineStep > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                ) : pipelineStep === 3 ? (
                  <Loader2 className="w-4 h-4 text-royal-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span
                  className={
                    pipelineStep >= 3 ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }
                >
                  Skill gaps identified
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {pipelineStep >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                ) : pipelineStep === 3 ? (
                  <Loader2 className="w-4 h-4 text-royal-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span
                  className={
                    pipelineStep >= 4 ? 'font-semibold text-slate-800' : 'text-slate-400'
                  }
                >
                  Building your interview plan...
                </span>
              </div>
            </div>

            {/* Error view */}
            {pipelineError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-left">
                <div className="flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Preparation setup note</div>
                    <div className="mt-0.5">{pipelineError}</div>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPipelineModalOpen(false)}
                    className="text-xs"
                  >
                    Close & Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationSetup;
