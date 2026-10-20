import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Brain,
  Code2,
  User,
  Settings,
  X,
  Sparkles,
  Check,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Handle body scroll locking and Escape key for mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Preparations', path: '/preparations', icon: Layers },
    { name: 'Aptitude Preparation', path: '/aptitude-prep', icon: Brain },
    { name: 'Coding Preparation', path: '/coding-prep', icon: Code2 },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Mutually exclusive active primary navigation calculation
  const getActiveNav = (pathname) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.includes('/aptitude-prep') || pathname.includes('/aptitude-preparation')) return 'Aptitude Preparation';
    if (pathname.includes('/coding-prep') || pathname.includes('/coding-preparation')) return 'Coding Preparation';
    if (pathname === '/preparations' || pathname.startsWith('/preparation')) return 'Preparations';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/settings') return 'Settings';
    return null;
  };

  const activeNav = getActiveNav(location.pathname);

  // Extract session ID if current path is under /preparation/:sessionId
  const sessionMatch = location.pathname.match(/\/preparation\/([a-f0-9]+)/i);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  // Check if user is currently inside an active preparation session or setup
  const isInsidePreparation =
    location.pathname.startsWith('/preparation/') || location.pathname === '/preparation/setup';

  // Determine active stage for progress tracking (0-indexed for workflow steps)
  const getActiveWorkflowStepIndex = (pathname) => {
    if (!isInsidePreparation) {
      return -1;
    }
    if (pathname.includes('/mistake-progress') || pathname.includes('/evaluation') || pathname.includes('/interview-report')) return 8;
    if (pathname.includes('/mock-interview')) return 7;
    if (pathname.includes('/job-readiness-twin') || pathname.includes('/readiness-twin')) return 6;
    if (pathname.includes('/job-preparation-plan') || pathname.includes('/preparation-plan')) return 5;
    if (pathname.includes('/tailored-resume')) return 4;
    if (pathname.includes('/skill-gap')) return 3;
    if (pathname.includes('/company-role-analysis')) return 2;
    if (pathname.includes('/resume-analysis')) return 1;
    if (pathname === '/preparation/setup' || pathname.match(/^\/preparation\/[^\/]+$/)) return 0;
    return 0;
  };

  const activeWorkflowStepIndex = getActiveWorkflowStepIndex(location.pathname);

  const WORKFLOW_STEPS_CONFIG = [
    { id: 'setup', number: 1, label: 'Setup', subpath: '' },
    { id: 'resume-analysis', number: 2, label: 'Resume Analysis', subpath: 'resume-analysis' },
    { id: 'company-role-analysis', number: 3, label: 'Company & Role Analysis', subpath: 'company-role-analysis' },
    { id: 'skill-gap', number: 4, label: 'Skill Gap Analysis', subpath: 'skill-gap' },
    { id: 'resume-tailoring', number: 5, label: 'Improve Your Resume', subpath: 'tailored-resume' },
    { id: 'job-preparation-plan', number: 6, label: 'Job Preparation Plan', subpath: 'job-preparation-plan' },
    { id: 'job-readiness-twin', number: 7, label: 'AI Job Readiness Twin', subpath: 'job-readiness-twin' },
    { id: 'mock-interview', number: 8, label: 'Mock Interview', subpath: 'mock-interview' },
    { id: 'evaluation', number: 9, label: 'Evaluation', subpath: 'evaluation' },
  ];

  const progressPhases = WORKFLOW_STEPS_CONFIG.map((step, index) => {
    if (activeWorkflowStepIndex === -1) {
      // Outside of an active preparation: step 1 neutral, remaining locked
      return {
        ...step,
        status: index === 0 ? 'neutral' : 'locked',
        path: '#',
      };
    }

    if (index < activeWorkflowStepIndex) {
      const stepPath = step.subpath
        ? (sessionId ? `/preparation/${sessionId}/${step.subpath}` : '#')
        : (sessionId ? `/preparation/${sessionId}` : '/preparation/setup');
      return {
        ...step,
        status: 'completed',
        path: stepPath,
      };
    }

    if (index === activeWorkflowStepIndex) {
      return {
        ...step,
        status: 'current',
        path: '#',
      };
    }

    return {
      ...step,
      status: 'locked',
      path: '#',
    };
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0] select-none text-xs text-[#64748B]">
      {/* Brand Header matching reference mockup */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5 group" onClick={onClose}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#315BEA] to-[#5B4CE2] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-[#172B4D] leading-tight">
              PrepAgent <span className="text-[#5B4CE2]">AI</span>
            </div>
            <p className="text-[10px] text-[#64748B] font-medium leading-none mt-0.5">
              Prepare Smarter. Achieve Better.
            </p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 text-[#64748B] hover:text-[#172B4D] rounded-xl hover:bg-[#EEF4FF] min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="px-3 pt-3 pb-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeNav === item.name;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#EEF4FF] text-[#315BEA] font-bold shadow-xs border border-[#C7D7FE]'
                  : 'text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF]/50'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#315BEA]' : 'text-[#64748B]'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Preparation Workflow Section */}
      <div className="flex-1 px-3 py-3 overflow-y-auto border-t border-[#E2E8F0]">
        <div className="px-2 mb-2">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
            Preparation Workflow
          </span>
        </div>

        <div className="space-y-1">
          {progressPhases.map((phase) => {
            const isCurrent = phase.status === 'current';
            const isCompleted = phase.status === 'completed';
            const isLocked = phase.status === 'locked';
            const isNeutral = phase.status === 'neutral';

            const itemContent = (
              <div
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-[#EEF4FF] text-[#315BEA] font-bold border border-[#C7D7FE] shadow-xs'
                    : isCompleted
                    ? 'text-[#172B4D] hover:bg-[#EEF4FF]/40 font-medium cursor-pointer'
                    : isNeutral
                    ? 'text-[#64748B] font-medium'
                    : 'text-[#94A3B8] cursor-not-allowed opacity-60'
                }`}
              >
                {/* Status Indicator */}
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-[#315BEA] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-xs">
                    {phase.number}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center font-semibold text-[11px] flex-shrink-0">
                    {phase.number}
                  </div>
                )}

                {/* Label */}
                <span className={`text-xs truncate flex-1 ${isCurrent ? 'text-[#315BEA] font-bold' : ''}`}>
                  {phase.label}
                </span>

                {/* Lock icon for future/locked phases */}
                {isLocked && <Lock className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />}
              </div>
            );

            if (isCompleted && phase.path !== '#') {
              return (
                <Link key={phase.id} to={phase.path} onClick={onClose} className="block">
                  {itemContent}
                </Link>
              );
            }

            return <div key={phase.id}>{itemContent}</div>;
          })}
        </div>
      </div>

      {/* User Card Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-white">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#EEF4FF]/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-[#315BEA] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#172B4D] truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[calc(100vw-48px)] z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
