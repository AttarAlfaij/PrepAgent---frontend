import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, X, AlertCircle } from 'lucide-react';

export const COMMON_COMPANIES = [
  'Google',
  'Microsoft',
  'Amazon',
  'Apple',
  'Meta',
  'NVIDIA',
  'IBM',
  'Oracle',
  'Adobe',
  'Salesforce',
  'OpenAI',
  'Accenture',
  'Deloitte',
  'TCS',
  'Infosys',
  'Wipro',
  'HCLTech',
  'Cognizant',
  'Capgemini',
  'Tech Mahindra',
  'LTIMindtree',
  'Zoho',
];

const CompanyCombobox = ({
  label = 'Company Name',
  name = 'company',
  value = '',
  onChange,
  error,
  helperText,
  required = false,
  placeholder = 'Search or select company...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Filter predefined companies
  const trimmedQuery = (query || '').trim();
  const filteredCompanies = COMMON_COMPANIES.filter((c) =>
    c.toLowerCase().includes(trimmedQuery.toLowerCase())
  );

  // Build selectable items list: filtered predefined companies + ALWAYS "Other"
  const items = filteredCompanies.map((c) => ({ type: 'predefined', label: c }));
  items.push({ type: 'other', label: 'Other' });

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [value]);

  const selectCompany = (companyName) => {
    setQuery(companyName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onChange) {
      onChange({
        target: {
          name,
          value: companyName,
        },
      });
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery('');
    selectCompany('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          selectCompany(items[highlightedIndex].label);
        } else if (items.length > 0) {
          selectCompany(items[0].label);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-[#172B4D] mb-1.5">
          {label} {required && <span className="text-[#E5484D]">*</span>}
        </label>
      )}

      <div className="relative rounded-xl">
        {/* Left icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
          <Building2 className="w-4 h-4" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="text"
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            setHighlightedIndex(0);
            if (val === '') {
              if (onChange) {
                onChange({
                  target: {
                    name,
                    value: '',
                  },
                });
              }
            } else if (val.trim().toLowerCase() === 'other') {
              if (onChange) {
                onChange({
                  target: {
                    name,
                    value: 'Other',
                  },
                });
              }
            } else {
              const exactMatch = COMMON_COMPANIES.find(
                (c) => c.toLowerCase() === val.trim().toLowerCase()
              );
              if (exactMatch && onChange) {
                onChange({
                  target: {
                    name,
                    value: exactMatch,
                  },
                });
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full text-sm rounded-xl border transition-all duration-200 bg-white placeholder:text-[#94A3B8] text-[#172B4D] focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-[#94A3B8] pl-10 pr-16 py-2.5 ${
            error
              ? 'border-[#E5484D] text-[#E5484D] focus:ring-[#E5484D]/20 focus:border-[#E5484D]'
              : 'border-[#E2E8F0] hover:border-[#CBD5E1] focus:ring-[#315BEA]/20 focus:border-[#315BEA] shadow-xs'
          }`}
        />

        {/* Right actions: Clear & Caret */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF] transition-colors"
              title="Clear company"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded-md text-[#64748B] hover:text-[#172B4D] transition-colors"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto text-[#172B4D]"
          role="listbox"
        >
          <div className="py-1">
            {items.map((item, idx) => {
              const isSelected = value?.toLowerCase() === item.label.toLowerCase();
              const isHighlighted = highlightedIndex === idx;

              return (
                <div
                  key={item.label}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCompany(item.label);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    item.type === 'other' ? 'border-t border-slate-100 font-medium' : ''
                  } ${
                    isHighlighted
                      ? 'bg-[#EEF4FF] text-[#315BEA] font-medium'
                      : isSelected
                      ? 'bg-[#EEF4FF] text-[#315BEA] font-bold'
                      : 'text-[#172B4D] hover:bg-[#EEF4FF]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1] flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#315BEA] flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#E5484D]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-[#64748B]">{helperText}</p>
      )}
    </div>
  );
};

export default CompanyCombobox;
