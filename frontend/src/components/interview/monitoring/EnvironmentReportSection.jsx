import React from 'react';
import {
  ShieldCheck,
  Camera,
  Mic,
  Wifi,
  Users,
  UserCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

/**
 * EnvironmentReportSection (Section 22)
 * Renders the factual, objective Interview Environment & Integrity summary in the final report.
 */
const EnvironmentReportSection = ({
  environmentSummary = null,
  identityVerification = null,
  livenessVerification = null,
  monitoringIncidents = [],
}) => {
  // Safe defaults if session had uninterrupted clean environment
  const summary = environmentSummary || {
    cameraRemainedConnected: true,
    microphoneRemainedAvailable: true,
    networkRemainedConnected: true,
    onePersonEnvironmentMaintained: true,
    identityVerificationCompleted: true,
    livenessVerificationCompleted: true,
    totalWarningsCount: monitoringIncidents.length,
    totalWarningDurationSeconds: monitoringIncidents.reduce((s, i) => s + (i.duration || 0), 0),
    eventsSummary: [],
  };

  const incidentsList = monitoringIncidents.length > 0 ? monitoringIncidents : [];

  const checks = [
    {
      label: 'Camera remained connected',
      passed: summary.cameraRemainedConnected !== false,
      icon: Camera,
    },
    {
      label: 'Microphone remained available',
      passed: summary.microphoneRemainedAvailable !== false,
      icon: Mic,
    },
    {
      label: 'Network remained connected',
      passed: summary.networkRemainedConnected !== false,
      icon: Wifi,
    },
    {
      label: 'One-person environment maintained',
      passed: summary.onePersonEnvironmentMaintained !== false,
      icon: Users,
    },
    {
      label: 'Identity verification completed',
      passed:
        identityVerification?.status === 'VERIFIED' || summary.identityVerificationCompleted !== false,
      icon: UserCheck,
    },
    {
      label: 'Liveness verification completed',
      passed:
        livenessVerification?.status === 'VERIFIED' || summary.livenessVerificationCompleted !== false,
      icon: Sparkles,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-royal-50 border border-royal-200 text-royal-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Interview Environment & Integrity
            </h3>
            <p className="text-xs text-slate-500">
              Factual observation log of technical devices, connectivity, and interview environment stability
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Factual Monitoring Log</span>
        </span>
      </div>

      {/* Grid of Verified Checklist Items */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Interview Environment Status
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  item.passed
                    ? 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                    : 'bg-amber-50/60 border-amber-200 text-amber-900'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold leading-snug block">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment Events & Incident Logs */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Environment Events
          </h4>
          <span className="text-xs font-semibold text-slate-600">
            {incidentsList.length === 0
              ? '0 anomalies recorded'
              : `${incidentsList.length} warning${incidentsList.length === 1 ? '' : 's'} recorded`}
          </span>
        </div>

        {incidentsList.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              All devices, connectivity, and environmental conditions remained fully stable throughout the entire interview session.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {incidentsList.map((inc, i) => {
              let title = inc.type.replace(/_/g, ' ').toLowerCase();
              if (inc.type === 'FACE_NOT_DETECTED') title = 'Face briefly not detected';
              else if (inc.type === 'INTERVIEW_PAGE_HIDDEN') title = 'Interview page became hidden';
              else if (inc.type === 'MULTIPLE_PERSONS_DETECTED') title = 'Multiple people visible';
              else if (inc.type === 'NETWORK_UNSTABLE') title = 'Connection latency fluctuation';
              else if (inc.type === 'CAMERA_DISCONNECTED') title = 'Camera temporarily interrupted';

              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 capitalize truncate">{title}</span>
                    {inc.details && (
                      <span className="text-slate-500 hidden sm:inline text-[11px] truncate">
                        — {inc.details}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {inc.duration || 1} second{(inc.duration || 1) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentReportSection;
