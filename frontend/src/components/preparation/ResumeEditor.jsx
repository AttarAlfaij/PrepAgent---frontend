import React, { useState } from 'react';
import {
  User,
  FileText,
  Code2,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Award,
  Trophy,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

const ResumeEditor = ({
  content,
  onChange,
  onSave,
  saving = false,
  savedSuccess = false,
  onDownloadResume = null,
  downloadingResume = false,
}) => {
  const [activeSection, setActiveSection] = useState('personal');

  const p = content?.personalInfo || {};
  const s = content?.skills || {};
  const projects = Array.isArray(content?.projects) ? content.projects : [];
  const experience = Array.isArray(content?.experience) ? content.experience : [];
  const education = Array.isArray(content?.education) ? content.education : [];
  const certifications = Array.isArray(content?.certifications) ? content.certifications : [];
  const achievements = Array.isArray(content?.achievements) ? content.achievements : [];
  const additionalSections = Array.isArray(content?.additionalSections) ? content.additionalSections : [];

  const updatePersonalInfo = (field, val) => {
    onChange({
      ...content,
      personalInfo: { ...p, [field]: val },
    });
  };

  const updateSummary = (val) => {
    onChange({
      ...content,
      professionalSummary: val,
    });
  };

  const updateSkillsList = (field, valString) => {
    const list = valString.split(',').map((x) => x.trimStart());
    onChange({
      ...content,
      skills: { ...s, [field]: list },
    });
  };

  const updateExperienceItem = (idx, field, val) => {
    const updated = experience.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange({ ...content, experience: updated });
  };

  const updateProjectItem = (idx, field, val) => {
    const updated = projects.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange({ ...content, projects: updated });
  };

  const updateEducationItem = (idx, field, val) => {
    const updated = education.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange({ ...content, education: updated });
  };

  const updateCertificationItem = (idx, field, val) => {
    const updated = certifications.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange({ ...content, certifications: updated });
  };

  const updateAdditionalItem = (idx, field, val) => {
    const updated = additionalSections.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    );
    onChange({ ...content, additionalSections: updated });
  };

  // Section tabs
  const sections = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'summary', label: 'Professional Summary', icon: FileText },
    { id: 'skills', label: 'Skills', icon: Code2 },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'additional', label: 'Additional Sections', icon: Layers },
  ];

  return (
    <Card padding="p-3.5 sm:p-4" className="border-slate-200/90 shadow-xs h-full w-full flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="pb-2.5 mb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm leading-tight">Edit Resume</h3>
        </div>

        {/* Section Navigation & Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-1 gap-3 flex-1 min-h-0">
          {/* Left Tab List (Col Span 4) */}
          <div className="md:col-span-4 space-y-0.5 border-r md:border-slate-100 pr-2 overflow-y-auto min-h-0 scrollbar-thin">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-royal-50 text-royal-700 font-bold border border-royal-200/70 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-royal-600' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Form Fields (Col Span 8) */}
          <div className="md:col-span-8 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
            {/* 1. Personal Information */}
            {activeSection === 'personal' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={p.name || ''}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={p.title || ''}
                    onChange={(e) => updatePersonalInfo('title', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={p.email || ''}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={p.phone || ''}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Location</label>
                  <input
                    type="text"
                    value={p.location || ''}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">LinkedIn</label>
                    <input
                      type="text"
                      value={p.linkedin || ''}
                      onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">GitHub</label>
                    <input
                      type="text"
                      value={p.github || ''}
                      onChange={(e) => updatePersonalInfo('github', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Portfolio Website</label>
                  <input
                    type="text"
                    value={p.portfolio || ''}
                    onChange={(e) => updatePersonalInfo('portfolio', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 2. Professional Summary */}
            {activeSection === 'summary' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tailored Professional Summary
                  </label>
                  <textarea
                    rows={7}
                    value={content?.professionalSummary || ''}
                    onChange={(e) => updateSummary(e.target.value)}
                    placeholder="Write a concise career summary tailored to your target job..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3. Skills */}
            {activeSection === 'skills' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Technical Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={(s.technicalSkills || []).join(', ')}
                    onChange={(e) => updateSkillsList('technicalSkills', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Programming Languages
                  </label>
                  <input
                    type="text"
                    value={(s.languages || []).join(', ')}
                    onChange={(e) => updateSkillsList('languages', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tools & Technologies
                  </label>
                  <input
                    type="text"
                    value={(s.tools || []).join(', ')}
                    onChange={(e) => updateSkillsList('tools', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Frameworks & Libraries
                  </label>
                  <input
                    type="text"
                    value={(s.frameworks || []).join(', ')}
                    onChange={(e) => updateSkillsList('frameworks', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Databases</label>
                  <input
                    type="text"
                    value={(s.databases || []).join(', ')}
                    onChange={(e) => updateSkillsList('databases', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Soft Skills & Competencies
                  </label>
                  <input
                    type="text"
                    value={(s.softSkills || []).join(', ')}
                    onChange={(e) => updateSkillsList('softSkills', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 4. Experience */}
            {activeSection === 'experience' && (
              <div className="space-y-4 text-xs">
                {experience.map((exp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Role #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const updated = experience.filter((_, i) => i !== idx);
                          onChange({ ...content, experience: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateExperienceItem(idx, 'company', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Role / Title"
                        value={exp.role || ''}
                        onChange={(e) => updateExperienceItem(idx, 'role', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Location"
                        value={exp.location || ''}
                        onChange={(e) => updateExperienceItem(idx, 'location', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Start Date"
                        value={exp.startDate || ''}
                        onChange={(e) => updateExperienceItem(idx, 'startDate', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="End Date"
                        value={exp.endDate || ''}
                        onChange={(e) => updateExperienceItem(idx, 'endDate', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>

                    <textarea
                      placeholder="Responsibilities (one per line)"
                      rows={3}
                      value={(exp.responsibilities || []).join('\n')}
                      onChange={(e) => {
                        const list = e.target.value.split('\n');
                        updateExperienceItem(idx, 'responsibilities', list);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                ))}

                <Button
                  size="xs"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    const updated = [
                      ...experience,
                      { company: '', role: '', location: '', startDate: '', endDate: '', responsibilities: [] },
                    ];
                    onChange({ ...content, experience: updated });
                  }}
                >
                  Add Experience Entry
                </Button>
              </div>
            )}

            {/* 5. Projects */}
            {activeSection === 'projects' && (
              <div className="space-y-4 text-xs">
                {projects.map((proj, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Project #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const updated = projects.filter((_, i) => i !== idx);
                          onChange({ ...content, projects: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Project Name"
                        value={proj.name || ''}
                        onChange={(e) => updateProjectItem(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Lead Developer)"
                        value={proj.role || ''}
                        onChange={(e) => updateProjectItem(idx, 'role', e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Technologies (comma separated)"
                      value={(proj.technologies || []).join(', ')}
                      onChange={(e) => {
                        const list = e.target.value.split(',').map((x) => x.trimStart());
                        updateProjectItem(idx, 'technologies', list);
                      }}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Short Project Description"
                      value={proj.description || ''}
                      onChange={(e) => updateProjectItem(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />

                    <textarea
                      placeholder="Accomplishment bullet points (one per line)"
                      rows={3}
                      value={(proj.responsibilities || []).join('\n')}
                      onChange={(e) => {
                        const list = e.target.value.split('\n');
                        updateProjectItem(idx, 'responsibilities', list);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                ))}

                <Button
                  size="xs"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    const updated = [
                      ...projects,
                      { name: '', role: '', description: '', technologies: [], responsibilities: [] },
                    ];
                    onChange({ ...content, projects: updated });
                  }}
                >
                  Add Project Entry
                </Button>
              </div>
            )}

            {/* 6. Education */}
            {activeSection === 'education' && (
              <div className="space-y-4 text-xs">
                {education.map((edu, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Education #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const updated = education.filter((_, i) => i !== idx);
                          onChange({ ...content, education: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Degree / Qualification"
                      value={edu.degree || ''}
                      onChange={(e) => updateEducationItem(idx, 'degree', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                    />

                    <input
                      type="text"
                      placeholder="Institution / College"
                      value={edu.institution || ''}
                      onChange={(e) => updateEducationItem(idx, 'institution', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Start Year"
                        value={edu.startYear || ''}
                        onChange={(e) => updateEducationItem(idx, 'startYear', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="End Year"
                        value={edu.endYear || ''}
                        onChange={(e) => updateEducationItem(idx, 'endYear', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Score / CGPA"
                        value={edu.percentageOrCGPA || ''}
                        onChange={(e) => updateEducationItem(idx, 'percentageOrCGPA', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  size="xs"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    const updated = [
                      ...education,
                      { degree: '', institution: '', percentageOrCGPA: '', startYear: '', endYear: '' },
                    ];
                    onChange({ ...content, education: updated });
                  }}
                >
                  Add Education Entry
                </Button>
              </div>
            )}

            {/* 7. Certifications */}
            {activeSection === 'certifications' && (
              <div className="space-y-4 text-xs">
                {certifications.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Certification #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const updated = certifications.filter((_, i) => i !== idx);
                          onChange({ ...content, certifications: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Certificate Name"
                      value={c.name || ''}
                      onChange={(e) => updateCertificationItem(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Issuer Organization"
                        value={c.issuer || ''}
                        onChange={(e) => updateCertificationItem(idx, 'issuer', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Date"
                        value={c.date || ''}
                        onChange={(e) => updateCertificationItem(idx, 'date', e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  size="xs"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    const updated = [...certifications, { name: '', issuer: '', date: '' }];
                    onChange({ ...content, certifications: updated });
                  }}
                >
                  Add Certification Entry
                </Button>
              </div>
            )}

            {/* 8. Achievements */}
            {activeSection === 'achievements' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Key Achievements & Honors (One per line)
                  </label>
                  <textarea
                    rows={6}
                    value={achievements.join('\n')}
                    onChange={(e) => {
                      const updated = e.target.value.split('\n');
                      onChange({ ...content, achievements: updated });
                    }}
                    placeholder="University Ranker, Hackathon Winner, Competition runner-up..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:ring-1 focus:ring-royal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 9. Additional Sections */}
            {activeSection === 'additional' && (
              <div className="space-y-4 text-xs">
                {additionalSections.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="Section Title (e.g. Languages Known)"
                        value={sec.title || ''}
                        onChange={(e) => updateAdditionalItem(idx, 'title', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded font-bold text-xs"
                      />
                      <button
                        onClick={() => {
                          const updated = additionalSections.filter((_, i) => i !== idx);
                          onChange({ ...content, additionalSections: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      placeholder="Items (one per line)"
                      rows={2}
                      value={(sec.items || []).join('\n')}
                      onChange={(e) => {
                        const list = e.target.value.split('\n');
                        updateAdditionalItem(idx, 'items', list);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                ))}

                <Button
                  size="xs"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    const updated = [...additionalSections, { title: '', items: [] }];
                    onChange({ ...content, additionalSections: updated });
                  }}
                >
                  Add Custom Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResumeEditor;
