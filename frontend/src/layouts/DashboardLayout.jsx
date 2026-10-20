import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import Navbar from '../components/navigation/Navbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Determine navbar title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/preparations') return 'Preparations';
    if (path.startsWith('/profile')) return 'Account Profile';
    if (path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/preparation/setup')) return 'Preparation Setup';
    if (path.startsWith('/preparation')) return 'Preparation Details';
    return 'PrepAgent AI';
  };

  const isFocusedInterviewScreen = location.pathname.includes('/mock-interview');

  if (isFocusedInterviewScreen) {
    return (
      <div className="h-full w-full min-h-screen bg-[#0A0F1F] text-white flex flex-col">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B4D] flex">
      {/* Sidebar for desktop & mobile drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0 w-full">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} title={getPageTitle()} />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
