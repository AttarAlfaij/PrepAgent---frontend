import React, { useState } from 'react';
import {
  Download,
  FileText,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Check,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

const ResumePreview = ({
  content,
  onDownloadPdf,
  onDownloadDocx,
  downloadingPdf = false,
  downloadingDocx = false,
}) => {
  const [template, setTemplate] = useState('Modern');

  const p = content?.personalInfo || {};
  const s = content?.skills || {};
  const projects = Array.isArray(content?.projects) ? content.projects : [];
  const experience = Array.isArray(content?.experience) ? content.experience : [];
  const education = Array.isArray(content?.education) ? content.education : [];
  const certifications = Array.isArray(content?.certifications) ? content.certifications : [];
  const achievements = Array.isArray(content?.achievements) ? content.achievements : [];
  const additionalSections = Array.isArray(content?.additionalSections) ? content.additionalSections : [];

  const contacts = [
    p.location,
    p.phone,
    p.email,
    p.linkedin,
    p.github,
    p.portfolio,
  ].filter(Boolean);

  return (
    <Card padding="p-3.5 sm:p-4" className="border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
      <div>
        {/* Toolbar Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">Resume Preview</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Template Selector */}
            <div className="relative">
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-1 pl-2.5 pr-6 rounded-lg focus:outline-none focus:ring-1 focus:ring-royal-500 cursor-pointer text-[11px]"
              >
                <option value="Modern">Modern ▾</option>
                <option value="Classic">Classic</option>
                <option value="Minimalist">Minimalist</option>
              </select>
            </div>

            {/* Download PDF / Resume */}
            <Button
              size="xs"
              variant="primary"
              icon={Download}
              onClick={onDownloadPdf}
              disabled={downloadingPdf}
              className="text-xs px-2.5 py-1 shadow-xs font-semibold"
            >
              {downloadingPdf ? 'Downloading...' : 'Download Resume'}
            </Button>

            {/* Download DOCX */}
            {onDownloadDocx && (
              <Button
                size="xs"
                variant="outline"
                icon={FileText}
                onClick={onDownloadDocx}
                disabled={downloadingDocx}
                className="text-xs px-2.5 py-1 shadow-xs font-semibold"
              >
                {downloadingDocx ? '...' : 'DOCX'}
              </Button>
            )}
          </div>
        </div>

        {/* Live Resume Canvas (White sheet with clean borders and selectable text) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs max-h-[580px] overflow-y-auto select-text font-sans text-slate-800 leading-normal scrollbar-thin">
          {/* Header */}
          <div className="text-center pb-2.5 border-b border-slate-200">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
              {p.name || 'Candidate Name'}
            </h1>
            {p.title && (
              <p className="text-[11px] font-bold text-royal-600 mt-0.5 tracking-wide">
                {p.title}
              </p>
            )}

            {/* Contacts line */}
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600 mt-2 font-medium">
              {contacts.map((item, i) => (
                <React.Fragment key={i}>
                  <span>{item}</span>
                  {i < contacts.length - 1 && <span className="text-slate-300">|</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-4 pt-4 text-xs">
            {/* 1. Summary */}
            {content?.professionalSummary && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-1.5">
                  Professional Summary
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {content.professionalSummary}
                </p>
              </div>
            )}

            {/* 2. Skills */}
            {(s.technicalSkills?.length > 0 || s.tools?.length > 0 || s.languages?.length > 0 || s.frameworks?.length > 0 || s.databases?.length > 0 || s.softSkills?.length > 0) && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-2">
                  Skills
                </h2>
                <div className="space-y-1.5">
                  {s.technicalSkills?.length > 0 && (
                    <>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Technical Skills
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.technicalSkills.filter(Boolean).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/70 text-[11px] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {s.languages?.length > 0 && (
                    <div className="text-xs text-slate-700 pt-1">
                      <span className="font-bold">Languages: </span>
                      <span>{s.languages.filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {s.frameworks?.length > 0 && (
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">Frameworks & Libraries: </span>
                      <span>{s.frameworks.filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {s.tools?.length > 0 && (
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">Tools & Cloud: </span>
                      <span>{s.tools.filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {s.databases?.length > 0 && (
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">Databases: </span>
                      <span>{s.databases.filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {s.softSkills?.length > 0 && (
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">Soft Skills: </span>
                      <span>{s.softSkills.filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Projects */}
            {projects.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-2">
                  Projects
                </h2>
                <div className="space-y-3">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs">{proj.name}</span>
                        {proj.technologies?.length > 0 && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            [{proj.technologies.join(', ')}]
                          </span>
                        )}
                      </div>

                      {proj.role && (
                        <p className="text-[11px] italic text-slate-500 font-medium">
                          Role: {proj.role}
                        </p>
                      )}

                      {proj.description && (
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {proj.description}
                        </p>
                      )}

                      {Array.isArray(proj.responsibilities) && proj.responsibilities.length > 0 && (
                        <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                          {proj.responsibilities.map((resp, rIdx) => (
                            <li key={rIdx}>{resp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Experience */}
            {experience.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-2">
                  Work Experience
                </h2>
                <div className="space-y-3">
                  {experience.map((exp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs">
                          {exp.role || 'Position'} | {exp.company}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {exp.startDate ? `${exp.startDate} - ${exp.endDate || 'Present'}` : ''}
                        </span>
                      </div>

                      {Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                        <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                          {exp.responsibilities.map((resp, rIdx) => (
                            <li key={rIdx}>{resp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Education */}
            {education.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-2">
                  Education
                </h2>
                <div className="space-y-2">
                  {education.map((edu, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-1">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{edu.degree}</div>
                        <div className="text-[11px] text-slate-600">{edu.institution}</div>
                      </div>
                      <div className="text-right text-[11px]">
                        <div className="font-medium text-slate-500">
                          {edu.endYear ? `${edu.startYear ? `${edu.startYear} - ` : ''}${edu.endYear}` : ''}
                        </div>
                        {edu.percentageOrCGPA && (
                          <div className="font-bold text-slate-700">{edu.percentageOrCGPA}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Certifications */}
            {certifications.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-1.5">
                  Certifications
                </h2>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                  {certifications.map((c, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{c.name}</span>
                      {c.issuer ? ` — ${c.issuer}` : ''}
                      {c.date ? ` (${c.date})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 7. Achievements */}
            {achievements.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-1.5">
                  Achievements & Honors
                </h2>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                  {achievements.map((ach, idx) => (
                    <li key={idx}>{ach}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 8. Additional Sections */}
            {additionalSections.length > 0 && (
              <div className="space-y-3">
                {additionalSections.map((sec, idx) => (
                  sec.title && (
                    <div key={idx}>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200 mb-1.5">
                        {sec.title}
                      </h2>
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-xs text-slate-700">
                        {(sec.items || []).map((item, iIdx) => (
                          <li key={iIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResumePreview;
