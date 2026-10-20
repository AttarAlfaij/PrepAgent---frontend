import React from 'react';

const Badge = ({ children, variant = 'neutral', size = 'sm', className = '' }) => {
  const variants = {
    primary: 'bg-[#EEF4FF] text-[#315BEA] border-[#C7D7FE]',
    indigo: 'bg-[#F1EFFF] text-[#5B4CE2] border-[#D9D2FF]',
    purple: 'bg-[#F1EFFF] text-[#5B4CE2] border-[#D9D2FF]',
    ai: 'bg-[#F1EFFF] text-[#5B4CE2] border-[#D9D2FF]',
    success: 'bg-[#EFF6FF] text-[#2563EB] border-[#C7D7FE]',
    warning: 'bg-[#FFF8E7] text-[#D97706] border-[#FDE68A]',
    danger: 'bg-[#FFF1F2] text-[#E5484D] border-[#FECDD3]',
    neutral: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
