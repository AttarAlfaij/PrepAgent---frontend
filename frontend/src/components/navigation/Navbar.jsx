import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ onOpenSidebar, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF] rounded-xl md:hidden transition-colors flex-shrink-0"
          title="Open menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && !location.pathname.includes('/preparation/') && (
          <h1 className="text-base font-bold text-[#172B4D] tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center flex-shrink-0">
        {/* User Profile / Account Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-[#EEF4FF]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#315BEA]/20"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-[#315BEA] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-[#172B4D] max-w-[130px] truncate">
              {user?.name || 'User'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 hidden sm:inline ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Account Dropdown Card */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Info Section */}
              <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#172B4D] truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                  {user?.email || ''}
                </p>
              </div>

              {/* Navigation Options */}
              <div className="p-1 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF] transition-colors"
                >
                  <User className="w-4 h-4 text-[#64748B]" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#172B4D] hover:bg-[#EEF4FF] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#64748B]" />
                  <span>Settings</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E2E8F0] my-1" />

              {/* Sign Out Action */}
              <div className="p-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#E5484D] hover:bg-[#FFF1F2] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-[#E5484D]" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
