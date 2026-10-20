import React, { useState, useMemo } from 'react';
import {
  User,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  Sparkles,
  Search,
  CheckCircle2,
  ArrowRight,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

const ResumeUnderstandingMap = ({ mapData, candidateProfile, candidateName = 'Candidate' }) => {
  const [activeView, setActiveView] = useState('skills'); // 'skills' | 'projects'
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const relationships = useMemo(() => mapData?.relationships || [], [mapData]);
  const nodes = useMemo(() => mapData?.nodes || [], [mapData]);

  // Build mapping: Skill -> Projects
  const skillToProjects = useMemo(() => {
    const mapping = {};

    // First from mapData relationships
    relationships
      .filter((r) => r.relationship === 'used_in')
      .forEach((r) => {
        if (!mapping[r.source]) mapping[r.source] = new Set();
        mapping[r.source].add(r.target);
      });

    // Also enrich from candidateProfile.projects if available
    if (candidateProfile?.projects) {
      candidateProfile.projects.forEach((proj) => {
        if (proj.name && Array.isArray(proj.technologies)) {
          proj.technologies.forEach((tech) => {
            if (!mapping[tech]) mapping[tech] = new Set();
            mapping[tech].add(proj.name);
          });
        }
      });
    }

    const result = {};
    Object.keys(mapping)
      .sort((a, b) => a.localeCompare(b))
      .forEach((skill) => {
        result[skill] = Array.from(mapping[skill]);
      });
    return result;
  }, [relationships, candidateProfile]);

  // Build mapping: Project -> Technologies
  const projectToSkills = useMemo(() => {
    const mapping = {};

    // From candidateProfile.projects
    if (candidateProfile?.projects) {
      candidateProfile.projects.forEach((proj) => {
        if (proj.name) {
          mapping[proj.name] = {
            technologies: proj.technologies || [],
            description: proj.description || '',
            role: proj.role || '',
          };
        }
      });
    }

    // Also enrich from relationships
    relationships
      .filter((r) => r.relationship === 'used_in')
      .forEach((r) => {
        if (!mapping[r.target]) {
          mapping[r.target] = { technologies: [], description: '', role: '' };
        }
        if (!mapping[r.target].technologies.includes(r.source)) {
          mapping[r.target].technologies.push(r.source);
        }
      });

    return mapping;
  }, [relationships, candidateProfile]);

  // Filter skills by search query
  const filteredSkills = useMemo(() => {
    const skills = Object.keys(skillToProjects);
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(
      (s) => s.toLowerCase().includes(q) || skillToProjects[s].some((p) => p.toLowerCase().includes(q))
    );
  }, [skillToProjects, searchQuery]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const projects = Object.keys(projectToSkills);
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.toLowerCase().includes(q) ||
        projectToSkills[p].technologies.some((t) => t.toLowerCase().includes(q))
    );
  }, [projectToSkills, searchQuery]);

  // Count summaries
  const skillCount = Object.keys(skillToProjects).length;
  const projectCount = Object.keys(projectToSkills).length;
  const educationCount = candidateProfile?.education?.length || 0;
  const experienceCount = candidateProfile?.experience?.length || 0;

  // Selected item details
  const activeDetail = useMemo(() => {
    if (!selectedItem) {
      // Default to first skill or project
      const firstSkill = filteredSkills[0];
      if (firstSkill && activeView === 'skills') {
        return {
          type: 'skill',
          name: firstSkill,
          connected: skillToProjects[firstSkill] || [],
          source: 'Resume → Projects',
        };
      }
      const firstProj = filteredProjects[0];
      if (firstProj && activeView === 'projects') {
        return {
          type: 'project',
          name: firstProj,
          connected: projectToSkills[firstProj]?.technologies || [],
          description: projectToSkills[firstProj]?.description,
          role: projectToSkills[firstProj]?.role,
          source: 'Resume → Projects',
        };
      }
      return null;
    }

    if (selectedItem.type === 'skill') {
      return {
        type: 'skill',
        name: selectedItem.name,
        connected: skillToProjects[selectedItem.name] || [],
        source: 'Resume → Projects',
      };
    }

    if (selectedItem.type === 'project') {
      const pData = projectToSkills[selectedItem.name];
      return {
        type: 'project',
        name: selectedItem.name,
        connected: pData?.technologies || [],
        description: pData?.description,
        role: pData?.role,
        source: 'Resume → Projects',
      };
    }

    return null;
  }, [selectedItem, activeView, filteredSkills, filteredProjects, skillToProjects, projectToSkills]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 bg-gradient-to-r from-royal-50 via-white to-brand-50/40 rounded-2xl border border-royal-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-royal-100 text-royal-700 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-royal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">AI Resume Understanding Map</h3>
                <span className="text-[11px] font-bold text-royal-700 bg-royal-100/70 px-2 py-0.5 rounded-md">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                See how information found in your resume is connected. Select any skill or project to inspect verified connections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Relationship Architecture Diagram (Skills ── Candidate ── Projects / Experience / Education) */}
      <Card padding="p-5 sm:p-6" className="border-slate-200 bg-white shadow-2xs">
        <div className="text-center max-w-xl mx-auto mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Resume Entity Hierarchy
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            All extracted entities are anchored to your verified candidate profile.
          </p>
        </div>

        {/* Visual Map Layout */}
        <div className="relative max-w-2xl mx-auto py-4">
          {/* Top Node: Skills */}
          <div className="flex justify-center mb-3">
            <button
              onClick={() => {
                setActiveView('skills');
                setSelectedItem(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'skills'
                  ? 'bg-royal-600 text-white shadow-md shadow-royal-600/25 ring-2 ring-royal-400'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Skills ({skillCount}+ found)</span>
            </button>
          </div>

          {/* Vertical Connector Top */}
          <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

          {/* Middle Row: Projects ── Candidate ── Experience */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 my-1">
            {/* Left Node: Projects */}
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => {
                  setActiveView('projects');
                  setSelectedItem(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeView === 'projects'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Projects ({projectCount})</span>
              </button>
            </div>

            {/* Horizontal Line Left */}
            <div className="w-6 sm:w-12 h-0.5 bg-slate-300" />

            {/* Center Candidate Node */}
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-royal-600 to-brand-600 text-white shadow-md shadow-royal-600/20 text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-1.5 font-extrabold text-sm">
                <User className="w-4 h-4" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{candidateName}</span>
              </div>
              <p className="text-[10px] text-royal-100 font-medium mt-0.5">Candidate Profile</p>
            </div>

            {/* Horizontal Line Right */}
            <div className="w-6 sm:w-12 h-0.5 bg-slate-300" />

            {/* Right Node: Experience */}
            <div className="flex-1 flex justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
                <Briefcase className="w-4 h-4 text-amber-600" />
                <span>Experience ({experienceCount})</span>
              </div>
            </div>
          </div>

          {/* Vertical Connector Bottom */}
          <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

          {/* Bottom Node: Education */}
          <div className="flex justify-center mt-1">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Education ({educationCount})</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Interactive Relationship Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Explorer Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => {
                  setActiveView('skills');
                  setSelectedItem(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'skills'
                    ? 'bg-white text-royal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Technology ({skillCount})
              </button>
              <button
                onClick={() => {
                  setActiveView('projects');
                  setSelectedItem(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'projects'
                    ? 'bg-white text-royal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Project ({projectCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${activeView}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/20 focus:border-royal-500"
              />
            </div>
          </div>

          {/* Cards List with vertical scrolling */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {activeView === 'skills' && filteredSkills.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching technologies found.
              </div>
            )}

            {activeView === 'skills' &&
              filteredSkills.map((tech) => {
                const projects = skillToProjects[tech] || [];
                const isSelected = activeDetail?.name === tech;

                return (
                  <div
                    key={tech}
                    onClick={() => setSelectedItem({ type: 'skill', name: tech })}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-royal-500 bg-royal-50/70 shadow-xs ring-1 ring-royal-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-royal-600 text-white' : 'bg-royal-50 text-royal-600'
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{tech}</p>
                          <p className="text-[11px] text-slate-500">
                            Found in {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-royal-600">
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Chips preview of connected projects */}
                    {projects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                        {projects.map((proj) => (
                          <span
                            key={proj}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                          >
                            ✓ {proj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {activeView === 'projects' && filteredProjects.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching projects found.
              </div>
            )}

            {activeView === 'projects' &&
              filteredProjects.map((proj) => {
                const pData = projectToSkills[proj];
                const techList = pData?.technologies || [];
                const isSelected = activeDetail?.name === proj;

                return (
                  <div
                    key={proj}
                    onClick={() => setSelectedItem({ type: 'project', name: proj })}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <FolderGit2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{proj}</p>
                          <p className="text-[11px] text-slate-500">
                            {techList.length} technologies documented
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Chips preview of technologies */}
                    {techList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                        {techList.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                          >
                            {t}
                          </span>
                        ))}
                        {techList.length > 5 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-slate-400">
                            +{techList.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: Connection Detail Inspector (5 cols) */}
        <div className="lg:col-span-5">
          <Card padding="p-5 sm:p-6" className="border-slate-200 sticky top-24 shadow-xs">
            {activeDetail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Connection Inspector
                    </span>
                  </div>
                  <Badge
                    variant={activeDetail.type === 'skill' ? 'primary' : 'success'}
                    size="sm"
                  >
                    {activeDetail.type === 'skill' ? 'Technology' : 'Project'}
                  </Badge>
                </div>

                {/* Entity Name */}
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{activeDetail.name}</h4>
                  {activeDetail.role && (
                    <p className="text-xs font-semibold text-royal-600 mt-0.5">
                      Role: {activeDetail.role}
                    </p>
                  )}
                  {activeDetail.description && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {activeDetail.description}
                    </p>
                  )}
                </div>

                {/* Connected Entities */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    {activeDetail.type === 'skill' ? 'Used in:' : 'Technologies:'}
                  </p>

                  {activeDetail.connected.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No direct connections recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeDetail.connected.map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                        >
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            {activeDetail.type === 'skill' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-royal-600 flex-shrink-0" />
                            )}
                            <span>{item}</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">
                            {activeDetail.type === 'skill' ? 'Project' : 'Skill'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Provenance Source */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <span className="text-slate-400 font-medium">Source: </span>
                  <span className="font-semibold text-slate-700">{activeDetail.source}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Select an entity to inspect its verified resume connections.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResumeUnderstandingMap;
