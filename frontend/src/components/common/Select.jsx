import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-[#172B4D] mb-1.5">
          {label} {required && <span className="text-[#E5484D]">*</span>}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none text-sm rounded-xl border transition-all duration-200 bg-white text-[#172B4D] focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-[#94A3B8] ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-10 py-2.5 cursor-pointer ${
            error
              ? 'border-[#E5484D] text-[#E5484D] focus:ring-[#E5484D]/20 focus:border-[#E5484D]'
              : 'border-[#E2E8F0] hover:border-[#CBD5E1] focus:ring-[#315BEA]/20 focus:border-[#315BEA] shadow-xs'
          } ${className}`}
        >
          {placeholder && (
            <option value="" disabled className="text-[#94A3B8]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={val} value={val} className="text-[#172B4D]">
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#64748B]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#E5484D]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-[#64748B]">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
