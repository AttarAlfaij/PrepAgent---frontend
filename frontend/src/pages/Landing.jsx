import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  FileSearch,
  Building2,
  Cpu,
  CalendarCheck,
  Bot,
  Award,
  CheckCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Button from '../components/common/Button';

const Landing = () => {
  const workflowSteps = [
    {
      title: 'Resume Analysis',
      desc: 'Parses your resume, extracts core competencies and projects.',
      icon: FileSearch,
      stage: 'Stage 1',
    },
    {
      title: 'Company & Role Analysis',
      desc: 'Deeply analyzes target company culture and specific JD requirements.',
      icon: Building2,
      stage: 'Stage 2',
    },
    {
      title: 'Skill Gap Detection',
      desc: 'Identifies missing skills, weak points, and priority focus areas.',
      icon: Cpu,
      stage: 'Stage 3',
    },
    {
      title: 'Interview Planning',
      desc: 'Formulates a personalized, phased preparation roadmap.',
      icon: CalendarCheck,
      stage: 'Stage 4',
    },
    {
      title: 'Mock Interview Agent',
      desc: 'Conducts interactive adaptive technical and behavioral interviews.',
      icon: Bot,
      stage: 'Stage 5',
    },
    {
      title: 'Evaluation & Feedback',
      desc: 'Provides granular scoring, actionable critiques, and mistakes review.',
      icon: Award,
      stage: 'Stage 6',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-royal-600 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-royal-600/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-royal-700 to-brand-700 bg-clip-text text-transparent">
                PrepAgent
              </span>
              <span className="text-xs ml-1.5 font-bold text-royal-600 bg-royal-50 border border-royal-200 px-2 py-0.5 rounded-md">
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" size="md">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-royal-50/40 via-white to-white">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-royal-400/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-royal-100/80 border border-royal-200 text-royal-700 text-xs sm:text-sm font-semibold mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-royal-600" />
            <span>Next-Generation Agentic Interview Preparation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.1]">
            Prep Smarter.{' '}
            <span className="bg-gradient-to-r from-royal-600 to-brand-600 bg-clip-text text-transparent">
              Interview Better.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            PrepAgent AI is an agentic AI-powered interview preparation platform that analyzes your
            profile, identifies skill gaps, creates personalized preparation plans, and adapts your
            interview practice to any company and role.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="w-full text-base shadow-xl shadow-royal-600/25 py-3.5 px-8"
              >
                Get Started Free
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full text-base py-3.5 px-8">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Quick value props */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Isolated Preparation Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Target Role & Verbatim JD Precision</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Future Multi-Agent Architecture</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Preview Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-royal-600 bg-royal-100/60 px-3 py-1 rounded-full">
              Future Agentic Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 mb-4 tracking-tight">
              From Resume to Job Offer — The Agentic Pipeline
            </h2>
            <p className="text-base text-slate-600">
              Each preparation session acts as the centralized context for an autonomous orchestrator
              and specialized AI agents.
            </p>
          </div>

          {/* Flow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={step.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-royal-300 transition-all duration-200 relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-royal-50 group-hover:bg-royal-100 text-royal-600 flex items-center justify-center transition-colors">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {step.stage}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-royal-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div className="mt-16 bg-gradient-to-r from-royal-900 via-navy-900 to-brand-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden text-center">
            <div className="max-w-2xl mx-auto relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to accelerate your interview readiness?
              </h3>
              <p className="text-slate-300 text-sm sm:text-base mb-8">
                Create an account in under 30 seconds and configure your first preparation session.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-white text-royal-900 hover:bg-slate-100 shadow-lg font-bold"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Create Your Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">PrepAgent AI</span>
            <span>— Autonomous Agentic Interview Preparation</span>
          </div>
          <p>© {new Date().getFullYear()} PrepAgent AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
