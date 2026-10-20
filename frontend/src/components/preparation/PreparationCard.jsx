import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Clock, FileText } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';

const PreparationCard = ({ session }) => {
  const navigate = useNavigate();

  const displayRole =
    session.targetRole === 'Other / Custom Role' && session.customRole
      ? session.customRole
      : session.targetRole;

  const handleContinue = () => {
    navigate(`/preparation/${session._id}`);
  };

  const statusVariant =
    session.status === 'completed'
      ? 'success'
      : session.status === 'active'
      ? 'primary'
      : 'primary';

  return (
    <Card hoverEffect padding="p-6" className="flex flex-col justify-between h-full group bg-white border-[#E2E8F0]">
      <div>
        {/* Header: Company and Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] border border-[#C7D7FE] flex items-center justify-center text-[#315BEA] font-bold text-lg shadow-xs">
              <Building2 className="w-6 h-6 text-[#315BEA]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#172B4D] group-hover:text-[#315BEA] transition-colors line-clamp-1">
                {session.company}
              </h3>
              <p className="text-sm font-medium text-[#64748B] line-clamp-1">
                {displayRole}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant} size="sm" className="capitalize">
            {session.status || 'Active'}
          </Badge>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="neutral" size="sm">
            {session.experienceLevel}
          </Badge>
          {session.resumeAnalysis?.status === 'completed' ? (
            <Badge variant="success" size="sm">
              Resume Analyzed ✓
            </Badge>
          ) : (
            <Badge variant="primary" size="sm">
              Resume Analysis
            </Badge>
          )}
          {session.resumeSnapshot?.originalName && (
            <span className="inline-flex items-center gap-1 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-full truncate max-w-[180px]">
              <FileText className="w-3 h-3 flex-shrink-0 text-[#94A3B8]" />
              <span className="truncate">{session.resumeSnapshot.originalName}</span>
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <ProgressBar progress={session.progress || 0} size="md" />
        </div>
      </div>

      {/* Footer: Date and Continue Button */}
      <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs text-[#64748B]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {new Date(session.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <Button
          onClick={handleContinue}
          size="sm"
          variant="primary"
          icon={ArrowRight}
          iconPosition="right"
          className="shadow-sm group-hover:shadow"
        >
          Continue
        </Button>
      </div>
    </Card>
  );
};

export default PreparationCard;
