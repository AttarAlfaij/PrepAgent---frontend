import React from 'react';
import Button from './Button';
import { Sparkles, PlusCircle } from 'lucide-react';

const EmptyState = ({
  title = 'Your interview journey starts here.',
  description = 'Create your first preparation session to begin personalized interview preparation.',
  buttonText = 'Start Your First Preparation',
  onAction,
  icon: Icon = Sparkles,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-dashed border-[#E2E8F0] max-w-2xl mx-auto shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#EEF4FF] flex items-center justify-center text-[#315BEA] mb-5 ring-8 ring-[#EEF4FF]/50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-[#172B4D] mb-2.5 tracking-tight">{title}</h3>
      <p className="text-[#64748B] text-sm max-w-md mb-8 leading-relaxed">{description}</p>
      {onAction && (
        <Button
          onClick={onAction}
          size="lg"
          icon={PlusCircle}
          className="shadow-sm"
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
