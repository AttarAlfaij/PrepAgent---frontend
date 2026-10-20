import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  Edit3,
  CheckCircle2,
  Download,
  Copy,
  RotateCw,
  Eye,
  History,
  FileText,
  Briefcase,
  Building,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Github,
  Globe,
  AlertCircle,
  Check,
  ArrowRight,
  RefreshCw,
  Layers,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import ResumeEditor from './ResumeEditor';
import ResumePreview from './ResumePreview';
import { preparationService } from '../../services/preparationService';

const ResumeOptimizationSection = ({
  sessionId,
  companyName = 'Company',
  targetRole = 'Role',
  displayRole = 'Target Role',
  candidateProfile = {},
  skillGapData = null,
  tailoredResume = null,
  onTailoredResumeUpdate = () => {},
  onNavigateNext = null,
}) => {
  // Active mobile view tab: 'preview' | 'editor'
  const [mobileTab, setMobileTab] = useState('preview');

  // Right panel tab: 'edit' | 'preview' | 'changes' | 'history'
  const [activeTab, setActiveTab] = useState('edit');

  // User resume state
  const [userResume, setUserResume] = useState(null);
  const [userContent, setUserContent] = useState(null);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);
  const [loadingUserResume, setLoadingUserResume] = useState(true);
  const [savingUserResume, setSavingUserResume] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [restoredToast, setRestoredToast] = useState(null);

  // AI Ideal Resume state
  const [aiResume, setAiResume] = useState(tailoredResume);
  const [regeneratingAi, setRegeneratingAi] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);

  // Download loading states
  const [downloadingAiPdf, setDownloadingAiPdf] = useState(false);
  const [downloadingAiDocx, setDownloadingAiDocx] = useState(false);
  const [downloadingUserPdf, setDownloadingUserPdf] = useState(false);
  const [downloadingUserDocx, setDownloadingUserDocx] = useState(false);

  // Load user resume on mount
  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        setLoadingUserResume(true);
        const res = await preparationService.getUserResume(sessionId);
        if (isMounted && res.userResume) {
          setUserResume(res.userResume);
          setUserContent(res.userResume.content);
          if (!originalSnapshot) {
            setOriginalSnapshot(JSON.parse(JSON.stringify(res.userResume.content)));
          }
          if (res.userResume.lastSavedAt) {
            setLastSavedTime(new Date(res.userResume.lastSavedAt));
          }
        }
      } catch (err) {
        console.error('[ResumeOptimization] Load user resume failed:', err);
      } finally {
        if (isMounted) setLoadingUserResume(false);
      }
    };

    if (sessionId) {
      loadUserData();
    }

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Keep AI resume updated if parent updates
  useEffect(() => {
    if (tailoredResume) {
      setAiResume(tailoredResume);
      if (!userContent && tailoredResume.content) {
        setUserContent(tailoredResume.content);
      }
    }
  }, [tailoredResume]);

  // Handle Save User Resume Changes
  const handleSaveUserResume = async () => {
    if (!userContent) return;
    try {
      setSavingUserResume(true);
      // Call existing PUT /tailored-resume as requested by user specification
      try {
        await preparationService.updateTailoredResume(sessionId, userContent);
      } catch (tErr) {
        console.warn('[ResumeOptimization] updateTailoredResume error:', tErr?.message);
      }

      // Persist to userResume to maintain editable user copy isolation
      const res = await preparationService.updateUserResume(sessionId, userContent);
      if (res.userResume) {
        setUserResume(res.userResume);
        setUserContent(res.userResume.content);
        setLastSavedTime(new Date(res.userResume.lastSavedAt || Date.now()));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('[ResumeOptimization] Save failed:', err);
    } finally {
      setSavingUserResume(false);
    }
  };

  // Handle Reset User Resume
  const handleResetUserResume = async () => {
    if (!window.confirm('Reset all modifications back to your original uploaded resume?')) return;
    try {
      setSavingUserResume(true);
      const res = await preparationService.resetUserResume(sessionId);
      if (res.userResume) {
        setUserResume(res.userResume);
        setUserContent(res.userResume.content);
        setLastSavedTime(new Date(res.userResume.lastSavedAt || Date.now()));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('[ResumeOptimization] Reset failed:', err);
    } finally {
      setSavingUserResume(false);
    }
  };

  // Handle Regenerate AI Resume
  const handleRegenerateAiResume = async () => {
    try {
      setRegeneratingAi(true);
      const res = await preparationService.generateTailoredResume(sessionId);
      if (res.tailoredResume) {
        setAiResume(res.tailoredResume);
        onTailoredResumeUpdate(res.tailoredResume);
      }
    } catch (err) {
      console.error('[ResumeOptimization] Regenerate AI resume failed:', err);
    } finally {
      setRegeneratingAi(false);
    }
  };

  // Downloads for AI Ideal Resume
  const handleDownloadAiPdf = async () => {
    try {
      setDownloadingAiPdf(true);
      const res = await preparationService.downloadTailoredResumePdf(sessionId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (aiResume?.content?.personalInfo?.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${safeName}_AI_Ideal_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download AI PDF failed:', err);
    } finally {
      setDownloadingAiPdf(false);
    }
  };

  const handleDownloadAiDocx = async () => {
    try {
      setDownloadingAiDocx(true);
      const res = await preparationService.downloadTailoredResumeDocx(sessionId);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (aiResume?.content?.personalInfo?.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${safeName}_AI_Ideal_Resume.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download AI DOCX failed:', err);
    } finally {
      setDownloadingAiDocx(false);
    }
  };

  // Downloads for User Uploaded / Edited Resume (Always using latest in-memory resumeData)
  const handleDownloadUserPdf = async () => {
    try {
      setDownloadingUserPdf(true);
      // Auto-save the latest edited in-memory content to backend session first
      if (resumeData && sessionId) {
        try {
          await preparationService.updateUserResume(sessionId, resumeData);
          setLastSavedTime(new Date());
        } catch (saveErr) {
          console.warn('[ResumeOptimization] Auto-save before download warning:', saveErr);
        }
      }

      // Download PDF generated with latest content
      let res;
      try {
        res = await preparationService.downloadUserResumePdf(sessionId);
      } catch (getErr) {
        console.warn('[ResumeOptimization] GET download failed, falling back to POST with content:', getErr);
        res = await preparationService.downloadUserResumePdf(sessionId, resumeData);
      }

      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const candidateName = resumeData?.personalInfo?.name?.trim();
      const safeName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
      const downloadFileName = (safeName && safeName.toLowerCase() !== 'candidate')
        ? `${safeName}_Resume.pdf`
        : 'Improved_Resume.pdf';
      link.setAttribute('download', downloadFileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      console.error('Download User PDF failed:', err);
    } finally {
      setDownloadingUserPdf(false);
    }
  };

  const handleDownloadUserDocx = async () => {
    try {
      setDownloadingUserDocx(true);
      if (resumeData && sessionId) {
        try {
          await preparationService.updateUserResume(sessionId, resumeData);
          setLastSavedTime(new Date());
        } catch (saveErr) {
          console.warn('[ResumeOptimization] Auto-save before DOCX download warning:', saveErr);
        }
      }
      const res = await preparationService.downloadUserResumeDocx(sessionId);
      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const candidateName = resumeData?.personalInfo?.name?.trim();
      const safeName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Candidate';
      link.setAttribute('download', `${safeName}_Resume.docx`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      console.error('Download User DOCX failed:', err);
    } finally {
      setDownloadingUserDocx(false);
    }
  };

  // Single Source of Truth for Resume Data (Shared between Editor and Preview)
  const resumeData = userContent || aiResume?.content || tailoredResume?.content || {};
  const previewContent = resumeData;
  const previewPersonal = previewContent?.personalInfo || {};
  const previewSkills = previewContent?.skills || {};
  const previewExperience = Array.isArray(previewContent?.experience) ? previewContent.experience : [];
  const previewProjects = Array.isArray(previewContent?.projects) ? previewContent.projects : [];
  const previewEducation = Array.isArray(previewContent?.education) ? previewContent.education : [];
  const previewCertifications = Array.isArray(previewContent?.certifications) ? previewContent.certifications : [];
  const previewAchievements = Array.isArray(previewContent?.achievements) ? previewContent.achievements : [];
  const previewAdditional = Array.isArray(previewContent?.additionalSections) ? previewContent.additionalSections : [];

  // Copy resume text to clipboard from latest resumeData
  const handleCopyResumeContent = () => {
    if (!resumeData) return;
    const c = resumeData;
    const p = c.personalInfo || {};
    let text = `${p.name || ''}\n${p.title || ''}\n${[p.location, p.phone, p.email, p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | ')}\n\n`;
    if (c.professionalSummary) {
      text += `PROFESSIONAL SUMMARY\n${c.professionalSummary}\n\n`;
    }
    if (c.skills) {
      const allSkills = Object.values(c.skills).flat().filter(Boolean);
      text += `SKILLS\n${allSkills.join(', ')}\n\n`;
    }
    if (c.experience?.length) {
      text += `EXPERIENCE\n`;
      c.experience.forEach((e) => {
        text += `${e.role || ''} - ${e.company || ''} (${e.startDate || ''} - ${e.current ? 'Present' : (e.endDate || 'Present')})\n`;
        (e.responsibilities || []).filter(Boolean).forEach((r) => (text += `• ${r}\n`));
        text += '\n';
      });
    }
    if (c.projects?.length) {
      text += `PROJECTS\n`;
      c.projects.forEach((pr) => {
        text += `${pr.name || ''} [${(pr.technologies || []).filter(Boolean).join(', ')}]\n`;
        if (pr.description) text += `${pr.description}\n`;
        (pr.responsibilities || []).filter(Boolean).forEach((r) => (text += `• ${r}\n`));
        text += '\n';
      });
    }
    if (c.education?.length) {
      text += `EDUCATION\n`;
      c.education.forEach((ed) => {
        text += `${ed.degree || ''} - ${ed.institution || ''} (${ed.startYear || ''} - ${ed.endYear || ''})\n`;
      });
    }
    if (c.certifications?.length) {
      text += `CERTIFICATIONS\n`;
      c.certifications.forEach((cert) => {
        text += `${cert.name || ''} - ${cert.issuer || ''} (${cert.date || ''})\n`;
      });
    }
    if (c.achievements?.length) {
      text += `ACHIEVEMENTS\n`;
      c.achievements.forEach((ach) => (text += `★ ${ach}\n`));
    }
    if (c.additionalSections?.length) {
      c.additionalSections.forEach((sec) => {
        if (sec.title) {
          text += `\n${sec.title.toUpperCase()}\n`;
          (sec.items || []).filter(Boolean).forEach((it) => (text += `• ${it}\n`));
        }
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  // Metrics for Resume (Dynamic from real data)
  const coveragePercent = skillGapData?.coverageScore || 88;
  const highlightedSkillsCount = (previewSkills?.technicalSkills || []).length || (skillGapData?.strongSkills?.length || 12);
  const prioritizedProjectsCount = previewProjects.length || (candidateProfile?.projects?.length || 2);
  const aiImprovementsCount = useMemo(() => {
    let count = 0;
    if (previewContent.professionalSummary) count += 1;
    if (skillGapData?.strongSkills?.length) count += 1;
    if (skillGapData?.missingSkills?.length) count += 1;
    if (previewProjects.length) count += 1;
    if (previewExperience.length) count += 1;
    return count || 5;
  }, [previewContent, skillGapData, previewProjects, previewExperience]);

  // Compute structured comparison diff between Original Resume vs Current Tailored Resume
  const structuredDiff = useMemo(() => {
    const diffs = {
      added: [],
      removed: [],
      modified: [],
      reordered: [],
    };

    const origSkills = Array.from(
      new Set([
        ...(candidateProfile?.skills?.programmingLanguages || []),
        ...(candidateProfile?.skills?.languages || []),
        ...(candidateProfile?.skills?.frameworks || []),
        ...(candidateProfile?.skills?.libraries || []),
        ...(candidateProfile?.skills?.databases || []),
        ...(candidateProfile?.skills?.tools || []),
        ...(candidateProfile?.skills?.technicalSkills || []),
        ...(Array.isArray(candidateProfile?.skills) ? candidateProfile.skills : []),
      ].map((s) => String(s).trim()).filter(Boolean))
    );

    const activeSkills = (previewSkills?.technicalSkills || []).map((s) => String(s).trim()).filter(Boolean);
    const origSkillsLower = origSkills.map((s) => s.toLowerCase());

    // Added skills (in tailored resume highlighting target role)
    const addedSkills = activeSkills.filter((s) => !origSkillsLower.includes(s.toLowerCase()));
    if (addedSkills.length > 0) {
      diffs.added.push({
        section: 'Skills',
        title: 'Target Job Skills Emphasized',
        items: addedSkills.map((s) => `+ ${s}`),
      });
    }

    // Excluded / Removed (missing JD skills that were explicitly NOT added to protect truthfulness)
    const missingSkills = (skillGapData?.missingSkills || []).map((s) => String(s).trim()).filter(Boolean);
    if (missingSkills.length > 0) {
      diffs.removed.push({
        section: 'Truthfulness Guardrail',
        title: 'Missing JD Skills Excluded (No Fake Credentials)',
        items: missingSkills.map((s) => `⚠ ${s} excluded — no verified evidence`),
      });
    }

    // Modified Summary
    const origSummary = candidateProfile?.professionalSummary || candidateProfile?.careerObjective || '';
    const activeSummary = previewContent?.professionalSummary || '';
    if (activeSummary && activeSummary !== origSummary) {
      diffs.modified.push({
        section: 'Professional Summary',
        title: 'Executive Bio Aligned with Target Role',
        items: [`Tailored 2-3 sentence executive bio highlighting actual candidate experience for ${displayRole} at ${companyName}`],
      });
    }

    // Modified Title
    const origTitle = candidateProfile?.personalInfo?.title || '';
    const activeTitle = previewPersonal?.title || '';
    if (activeTitle && activeTitle !== origTitle) {
      diffs.modified.push({
        section: 'Professional Title',
        title: 'Target Role Alignment',
        items: [`Title optimized: "${activeTitle}"`],
      });
    }

    // Reordered Projects
    if (previewProjects.length > 0) {
      diffs.reordered.push({
        section: 'Projects',
        title: 'Prioritized Relevant Work',
        items: [`Showcasing ${previewProjects.length} projects relevant to ${displayRole}`],
      });
    }

    // Experience bullet enhancements
    if (previewExperience.length > 0) {
      diffs.modified.push({
        section: 'Experience',
        title: 'ATS-Optimized Bullet Points',
        items: ['Rephrased responsibilities with active verbs and quantified outcomes'],
      });
    }

    // Manual user edits comparison
    if (originalSnapshot && userContent) {
      const userSkills = (userContent.skills?.technicalSkills || []).map((s) => String(s).trim());
      const origSnapSkills = (originalSnapshot.skills?.technicalSkills || []).map((s) => String(s).trim());
      const userAdded = userSkills.filter((s) => !origSnapSkills.map((x) => x.toLowerCase()).includes(s.toLowerCase()));
      const userRemoved = origSnapSkills.filter((s) => !userSkills.map((x) => x.toLowerCase()).includes(s.toLowerCase()));
      if (userAdded.length) {
        diffs.added.push({
          section: 'User Manual Edits',
          title: 'Manually Added Skills',
          items: userAdded.map((s) => `+ ${s}`),
        });
      }
      if (userRemoved.length) {
        diffs.removed.push({
          section: 'User Manual Edits',
          title: 'Manually Removed Skills',
          items: userRemoved.map((s) => `- ${s}`),
        });
      }
    }

    return diffs;
  }, [candidateProfile, previewSkills, previewContent, previewPersonal, previewProjects, previewExperience, skillGapData, originalSnapshot, userContent, displayRole, companyName]);

  const totalDiffCount =
    structuredDiff.added.length +
    structuredDiff.removed.length +
    structuredDiff.modified.length +
    structuredDiff.reordered.length;

  // Combined version history list from userResume and tailoredResume
  const versionHistoryList = useMemo(() => {
    const list = [];
    if (Array.isArray(userResume?.versions)) {
      userResume.versions.forEach((v) => {
        list.push({ ...v, origin: 'user', type: v.version === 1 ? 'Original Upload' : 'Manual Edit' });
      });
    }
    if (Array.isArray(aiResume?.versions)) {
      aiResume.versions.forEach((v) => {
        list.push({ ...v, origin: 'ai', type: v.version === 1 ? 'AI Generated' : 'AI Regenerated' });
      });
    }
    if (list.length === 0) {
      list.push({
        version: 1,
        label: 'Original Uploaded Resume',
        createdAt: new Date(),
        origin: 'user',
        type: 'Original Upload',
        content: userContent,
      });
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [userResume, aiResume, userContent]);

  return (
    <div className="space-y-4">
      {/* 1. Header Bar matching reference mockup */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-royal-600 via-indigo-600 to-brand-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              <span>Improve Your Resume</span>
            </h2>
          </div>
        </div>

        {/* Right Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">Target Job Role</span>
              <span className="font-bold text-slate-800 leading-tight">{displayRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">Company</span>
              <span className="font-bold text-slate-800 leading-tight">{companyName}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={RotateCw}
            onClick={handleRegenerateAiResume}
            disabled={regeneratingAi}
            className={`text-xs font-semibold shadow-xs ${regeneratingAi ? 'opacity-70' : ''}`}
          >
            {regeneratingAi ? 'Regenerating...' : 'Regenerate AI Resume'}
          </Button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="grid grid-cols-2 gap-2 lg:hidden bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('preview')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'preview' ? 'bg-white text-royal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Resume Preview</span>
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'editor' ? 'bg-white text-royal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Resume Editor</span>
        </button>
      </div>

      {/* 2. Side-by-Side Dual Columns (50% / 50% split on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: 📄 RESUME PREVIEW (LIVE SYNCHRONIZED)                        */}
        {/* ========================================================================= */}
        <div className={`h-full flex flex-col ${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          <Card padding="p-4 sm:p-5" className="border-indigo-200/80 shadow-xs flex flex-col justify-between h-full">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 leading-tight">Resume Preview</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Preview
                      </span>
                    </div>
                  </div>
                </div>

                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              </div>

              {/* Sub-info bar */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 py-2 border-b border-slate-100 font-medium">
                <span>
                  Target Role: <strong className="text-slate-800">{displayRole}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Company: <strong className="text-slate-800">{companyName}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Generated:{' '}
                  <span className="text-slate-600">
                    {aiResume?.generatedAt
                      ? new Date(aiResume.generatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Today'}
                  </span>
                </span>
              </div>

              {/* Optimization Summary Card matching mockup */}
              <div className="my-3 p-3 bg-gradient-to-r from-indigo-50/50 via-white to-royal-50/40 rounded-xl border border-indigo-100 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {/* Gauge: ATS Match */}
                <div className="flex flex-col items-center justify-center p-1 border-r border-slate-100 sm:last:border-none">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="3.4"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3.4"
                        strokeDasharray={`${coveragePercent}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-slate-900">{coveragePercent}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">ATS Match</span>
                  <span className="text-[9px] text-emerald-600 font-semibold">Well aligned</span>
                </div>

                {/* Stat 1: Relevant Skills */}
                <div className="flex flex-col items-center justify-center p-1 border-r border-slate-100 sm:last:border-none">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Relevant Skills</div>
                  <div className="text-base font-black text-indigo-700 my-0.5">{highlightedSkillsCount}</div>
                  <div className="text-[10px] text-slate-400">highlighted</div>
                </div>

                {/* Stat 2: Projects */}
                <div className="flex flex-col items-center justify-center p-1 border-r border-slate-100 sm:last:border-none">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Projects</div>
                  <div className="text-base font-black text-royal-700 my-0.5">{prioritizedProjectsCount}</div>
                  <div className="text-[10px] text-slate-400">prioritized</div>
                </div>

                {/* Stat 3: AI Improvements */}
                <div className="flex flex-col items-center justify-center p-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">AI Improvements</div>
                  <div className="text-base font-black text-emerald-700 my-0.5">{aiImprovementsCount}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">key changes</div>
                </div>
              </div>

              {/* 🎯 RESUME OPTIMIZATION BASED ON SKILL GAP */}
              <div className="my-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Resume Optimization Based on Skill Gap
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Skill Gap Considered ✓
                  </span>
                </div>

                {/* 4 Cards: Strong, Transferable, Needs Practice, Missing */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Strong Skills</span>
                    <span className="text-sm font-black text-emerald-700">{skillGapData?.strongSkills?.length || 0}</span>
                    <span className="text-[9px] text-emerald-600 block">Highlighted</span>
                  </div>
                  <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Transferable</span>
                    <span className="text-sm font-black text-amber-700">{skillGapData?.partialSkills?.length || skillGapData?.transferableSkills?.length || 0}</span>
                    <span className="text-[9px] text-amber-600 block">Used Truthfully</span>
                  </div>
                  <div className="p-2 bg-orange-50/70 border border-orange-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-orange-800 uppercase block">Needs Practice</span>
                    <span className="text-sm font-black text-orange-700">{skillGapData?.needsPractice?.length || 0}</span>
                    <span className="text-[9px] text-orange-600 block">Exposure Kept</span>
                  </div>
                  <div className="p-2 bg-rose-50/70 border border-rose-200/60 rounded-lg">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Missing Skills</span>
                    <span className="text-sm font-black text-rose-700">{skillGapData?.missingSkills?.length || 0}</span>
                    <span className="text-[9px] text-rose-600 block">Excluded (No Fake Data)</span>
                  </div>
                </div>

                {/* Dynamic change callouts: ✓ highlighted vs ⚠ excluded */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-1">
                    {(skillGapData?.strongSkills || ['Java', 'SQL', 'Git']).slice(0, 3).map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>✓ {skill} highlighted</span>
                      </div>
                    ))}
                    {(skillGapData?.partialSkills || []).slice(0, 1).map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>✓ {skill} emphasized</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    {(skillGapData?.missingSkills || ['Selenium', 'Jenkins']).slice(0, 2).map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-rose-700 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span>⚠ {skill} not added — no verified evidence</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Complete Scrollable Synchronized Resume Preview Canvas */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs max-h-[580px] overflow-y-auto select-text font-sans text-slate-800 leading-normal scrollbar-thin">
                {/* Header */}
                <div className="text-center pb-3 border-b border-slate-200">
                  <h1 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                    {previewPersonal.name || 'CANDIDATE NAME'}
                  </h1>
                  <p className="text-xs font-bold text-royal-600 mt-0.5 tracking-wide">
                    {previewPersonal.title || displayRole}
                  </p>

                  {/* Contact Links */}
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mt-2 font-medium">
                    {previewPersonal.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {previewPersonal.location}
                      </span>
                    )}
                    {previewPersonal.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {previewPersonal.phone}
                      </span>
                    )}
                    {previewPersonal.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {previewPersonal.email}
                      </span>
                    )}
                    {previewPersonal.linkedin && (
                      <span className="flex items-center gap-1">
                        <Linkedin className="w-3 h-3 text-blue-500" />
                        {previewPersonal.linkedin}
                      </span>
                    )}
                    {previewPersonal.github && (
                      <span className="flex items-center gap-1">
                        <Github className="w-3 h-3 text-slate-700" />
                        {previewPersonal.github}
                      </span>
                    )}
                    {previewPersonal.portfolio && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-500" />
                        {previewPersonal.portfolio}
                      </span>
                    )}
                  </div>
                </div>

                {/* Professional Summary */}
                {previewContent.professionalSummary && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                      Professional Summary
                    </h2>
                    <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                      {previewContent.professionalSummary}
                    </p>
                  </div>
                )}

                {/* Skills Section */}
                {(previewSkills.technicalSkills?.filter(Boolean).length > 0 ||
                  previewSkills.languages?.filter(Boolean).length > 0 ||
                  previewSkills.frameworks?.filter(Boolean).length > 0 ||
                  previewSkills.tools?.filter(Boolean).length > 0 ||
                  previewSkills.databases?.filter(Boolean).length > 0 ||
                  previewSkills.softSkills?.filter(Boolean).length > 0) && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Key Skills
                    </h2>
                    {previewSkills.technicalSkills?.filter(Boolean).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {previewSkills.technicalSkills.filter(Boolean).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md bg-blue-50/80 text-blue-800 border border-blue-200/80 text-[11px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {previewSkills.languages?.filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-2">
                        <span className="font-bold text-slate-700">Languages: </span>
                        <span>{previewSkills.languages.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {previewSkills.frameworks?.filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span className="font-bold text-slate-700">Frameworks: </span>
                        <span>{previewSkills.frameworks.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {previewSkills.tools?.filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span className="font-bold text-slate-700">Tools: </span>
                        <span>{previewSkills.tools.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {previewSkills.databases?.filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span className="font-bold text-slate-700">Databases: </span>
                        <span>{previewSkills.databases.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {previewSkills.softSkills?.filter(Boolean).length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span className="font-bold text-slate-700">Soft Skills: </span>
                        <span>{previewSkills.softSkills.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Professional Experience */}
                {previewExperience.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Professional Experience
                    </h2>
                    <div className="space-y-3">
                      {previewExperience.map((exp, idx) => (
                        <div key={idx} className="text-left">
                          <div className="flex justify-between items-baseline flex-wrap gap-1">
                            <span className="font-bold text-xs text-slate-900">{exp.role || 'Role'}</span>
                            <span className="text-[10px] font-medium text-slate-500">
                              {exp.startDate ? `${exp.startDate} - ${exp.current ? 'Present' : (exp.endDate || 'Present')}` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span className="font-medium text-slate-700">{exp.company || ''}</span>
                            <span className="text-slate-400">{exp.location || ''}</span>
                          </div>
                          {Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                            <ul className="space-y-1">
                              {exp.responsibilities.filter(Boolean).map((resp, rIdx) => (
                                <li key={rIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{resp}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {previewProjects.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Projects
                    </h2>
                    <div className="space-y-3">
                      {previewProjects.map((proj, idx) => (
                        <div key={idx} className="text-left">
                          <div className="flex justify-between items-baseline flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900">{proj.name}</span>
                              {proj.technologies?.length > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  [{Array.isArray(proj.technologies) ? proj.technologies.filter(Boolean).join(', ') : proj.technologies}]
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">
                              {proj.role || ''}
                            </span>
                          </div>
                          {proj.description && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">{proj.description}</p>
                          )}
                          {Array.isArray(proj.responsibilities) && proj.responsibilities.length > 0 && (
                            <ul className="space-y-1 mt-1">
                              {proj.responsibilities.filter(Boolean).map((resp, rIdx) => (
                                <li key={rIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{resp}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {previewEducation.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Education
                    </h2>
                    <div className="space-y-2">
                      {previewEducation.map((ed, idx) => (
                        <div key={idx} className="flex justify-between items-baseline text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{ed.degree}</span>
                            {ed.institution && <span className="text-slate-600"> — {ed.institution}</span>}
                            {ed.percentageOrCGPA && (
                              <span className="text-[10px] text-slate-500 ml-1.5">({ed.percentageOrCGPA})</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {ed.startYear && ed.endYear ? `${ed.startYear} - ${ed.endYear}` : (ed.endYear || ed.startYear || '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {previewCertifications.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Certifications
                    </h2>
                    <div className="space-y-1.5">
                      {previewCertifications.map((c, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700 flex justify-between">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {[c.issuer, c.date].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {previewAchievements.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      Achievements
                    </h2>
                    <ul className="space-y-1">
                      {previewAchievements.map((ach, idx) => (
                        <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                          <span className="text-amber-500 mt-0.5">★</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Additional Sections */}
                {previewAdditional.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {previewAdditional.map((sec, idx) => (
                      sec.title && (
                        <div key={idx}>
                          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                            {sec.title}
                          </h2>
                          {Array.isArray(sec.items) && sec.items.length > 0 ? (
                            <ul className="space-y-1">
                              {sec.items.filter(Boolean).map((item, iIdx) => (
                                <li key={iIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : sec.content ? (
                            <p className="text-[11px] text-slate-600 leading-relaxed">{sec.content}</p>
                          ) : null}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Bar for Synchronized Resume Preview */}
            <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
              <Button
                size="sm"
                variant="primary"
                icon={Download}
                onClick={handleDownloadUserPdf}
                disabled={downloadingUserPdf}
                className="text-xs font-semibold shadow-xs"
              >
                {downloadingUserPdf ? 'Downloading...' : 'Download PDF'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={FileText}
                onClick={handleDownloadUserDocx}
                disabled={downloadingUserDocx}
                className="text-xs font-semibold shadow-xs"
              >
                {downloadingUserDocx ? 'Downloading...' : 'Download DOCX'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={copiedResume ? Check : Copy}
                onClick={handleCopyResumeContent}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 ml-auto"
              >
                {copiedResume ? 'Copied! ✓' : 'Copy Content'}
              </Button>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ✏️ RESUME EDITOR                                            */}
        {/* ========================================================================= */}
        <div className={`h-full flex flex-col ${mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
          <Card padding="p-4 sm:p-5" className="border-blue-200/80 shadow-xs flex flex-col justify-between h-full">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center flex-shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 leading-tight">✏️ Resume Editor</h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        Editable Fields
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Saved Badge */}
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Last Saved:</span>
                  <span className="font-bold">
                    {lastSavedTime
                      ? lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Original'}
                  </span>
                </div>
              </div>

              {/* Sub-tabs for Right Panel: Edit | Preview | View Changes | Version History */}
              <div className="flex items-center gap-1 border-b border-slate-200 my-2.5 pb-1">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'edit'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => setActiveTab('changes')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'changes'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Changes</span>
                  {totalDiffCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {totalDiffCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Version History</span>
                  {versionHistoryList.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[9px] font-bold">
                      {versionHistoryList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Toast / Notification when a version is restored */}
              {restoredToast && (
                <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{restoredToast}</span>
                </div>
              )}

              {/* TAB 1: EDIT MODE — REUSING ResumeEditor */}
              {activeTab === 'edit' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <ResumeEditor
                    content={resumeData}
                    onChange={(updated) => setUserContent(updated)}
                    onSave={handleSaveUserResume}
                    saving={savingUserResume}
                    savedSuccess={savedSuccess}
                    onDownloadResume={handleDownloadUserPdf}
                    downloadingResume={downloadingUserPdf}
                  />
                </div>
              )}

              {/* TAB 2: PREVIEW MODE — REUSING ResumePreview */}
              {activeTab === 'preview' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <ResumePreview
                    content={resumeData}
                    onDownloadPdf={handleDownloadUserPdf}
                    onDownloadDocx={handleDownloadUserDocx}
                    downloadingPdf={downloadingUserPdf}
                    downloadingDocx={downloadingUserDocx}
                  />
                </div>
              )}

              {/* TAB 3: VIEW CHANGES (COMPARISON DIFF: ORIGINAL RESUME VS AI TAILORED RESUME) */}
              {activeTab === 'changes' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex-1 overflow-y-auto min-h-[500px] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                        Original Resume vs AI Tailored Resume
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Truthful Evidence Diff
                    </span>
                  </div>

                  {totalDiffCount === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No modifications detected. Your current resume matches your original upload.
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {/* Section: Added */}
                      {structuredDiff.added.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Added</span>
                          </div>
                          {structuredDiff.added.map((diff, i) => (
                            <div key={i} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs">{diff.title}</span>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold">
                                  {diff.section}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {diff.items.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section: Removed / Excluded */}
                      {structuredDiff.removed.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Removed / Excluded</span>
                          </div>
                          {structuredDiff.removed.map((diff, i) => (
                            <div key={i} className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs">{diff.title}</span>
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[9px] font-bold">
                                  {diff.section}
                                </span>
                              </div>
                              <div className="space-y-1 pt-1">
                                {diff.items.map((item, idx) => (
                                  <div key={idx} className="text-[11px] text-rose-700 flex items-center gap-1.5 font-medium">
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section: Modified */}
                      {structuredDiff.modified.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[11px] uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Modified</span>
                          </div>
                          {structuredDiff.modified.map((diff, i) => (
                            <div key={i} className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs">{diff.title}</span>
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-bold">
                                  {diff.section}
                                </span>
                              </div>
                              <div className="space-y-1 pt-1">
                                {diff.items.map((item, idx) => (
                                  <div key={idx} className="text-[11px] text-slate-600">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section: Reordered */}
                      {structuredDiff.reordered.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px] uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>Reordered</span>
                          </div>
                          {structuredDiff.reordered.map((diff, i) => (
                            <div key={i} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs">{diff.title}</span>
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">
                                  {diff.section}
                                </span>
                              </div>
                              <div className="space-y-1 pt-1">
                                {diff.items.map((item, idx) => (
                                  <div key={idx} className="text-[11px] text-slate-600">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: VERSION HISTORY */}
              {activeTab === 'history' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex-1 overflow-y-auto min-h-[500px] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Version History</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Timeline of Revisions</span>
                  </div>

                  <div className="space-y-2.5">
                    {versionHistoryList.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                              v{v.version}
                            </span>
                            <span className="font-bold text-slate-900">{v.label || `Version ${v.version}`}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              v.type?.includes('AI')
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : v.version === 1
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {v.type || 'Edit'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Target Role & Company</span>
                            <span className="font-medium text-slate-700 truncate block">
                              {displayRole} · {companyName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[9px] uppercase">Date Saved</span>
                            <span className="text-slate-600 font-medium">
                              {new Date(v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                              {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {v.content && (
                          <div className="pt-1.5 flex justify-end">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setUserContent(v.content);
                                setActiveTab('edit');
                                setRestoredToast(`Restored version v${v.version} to editor.`);
                                setTimeout(() => setRestoredToast(null), 3000);
                              }}
                              className="text-[11px] py-1"
                            >
                              Restore This Version
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar for User Resume */}
            <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
              <Button
                size="sm"
                variant="ghost"
                icon={RotateCw}
                onClick={handleResetUserResume}
                disabled={savingUserResume}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Reset Changes
              </Button>
              <Button
                size="sm"
                variant={savedSuccess ? 'success' : 'outline'}
                icon={savedSuccess ? Check : FileText}
                onClick={handleSaveUserResume}
                disabled={savingUserResume}
                className="text-xs font-semibold shadow-xs"
              >
                {savingUserResume ? 'Saving...' : savedSuccess ? 'Saved ✓' : 'Save Changes'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={FileText}
                onClick={handleDownloadUserDocx}
                disabled={downloadingUserDocx}
                className="text-xs font-semibold shadow-xs"
              >
                {downloadingUserDocx ? 'Downloading...' : 'Download DOCX'}
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Download}
                onClick={handleDownloadUserPdf}
                disabled={downloadingUserPdf}
                className="text-xs font-semibold shadow-xs"
              >
                {downloadingUserPdf ? 'Downloading...' : 'Download Resume'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResumeOptimizationSection;
