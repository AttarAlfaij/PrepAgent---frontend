import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#315BEA]/20 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl';

  const variants = {
    primary:
      'bg-[#315BEA] hover:bg-[#2648C7] text-white shadow-sm focus:ring-[#315BEA] border border-transparent active:scale-[0.98]',
    secondary:
      'bg-[#EEF4FF] text-[#315BEA] hover:bg-[#DBEAFE] focus:ring-[#315BEA] border border-[#C7D7FE] active:scale-[0.98]',
    outline:
      'border border-[#E2E8F0] bg-white text-[#172B4D] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus:ring-[#315BEA] active:scale-[0.98]',
    ghost:
      'text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF] focus:ring-[#315BEA] border border-transparent',
    danger:
      'bg-[#E5484D] hover:bg-[#C93B40] text-white shadow-sm focus:ring-rose-500 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
        </>
      )}
    </button>
  );
};

export default Button;
