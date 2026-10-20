import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { preparationService } from '../services/preparationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PreparationCard from '../components/preparation/PreparationCard';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isPreparationsRoute = location.pathname === '/preparations';

  const fetchSessions = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await preparationService.getPreparations();
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (err) {
      toastError('Failed to load preparation sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          {isPreparationsRoute ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] tracking-tight flex items-center gap-2.5">
                <span>Interview Preparations</span>
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                Manage and continue your active interview preparation sessions.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] tracking-tight flex items-center gap-2.5">
                <span>Welcome, {user?.name || 'Explorer'}</span>
                <span className="text-xl">👋</span>
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                Track and manage your target interview preparations.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSessions(true)}
            isLoading={refreshing}
            icon={RefreshCw}
            className="text-[#64748B] hover:text-[#172B4D]"
            title="Refresh sessions"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={PlusCircle}
            onClick={() => navigate('/preparation/setup')}
            className="shadow-sm"
          >
            + New Preparation
          </Button>
        </div>
      </div>

      {/* Preparations Section */}
      <div id="preparations">
        {sessions.length === 0 ? (
          <EmptyState
            title="Your interview journey starts here."
            description="Create your first preparation session to begin personalized interview preparation."
            buttonText="Start Your First Preparation"
            onAction={() => navigate('/preparation/setup')}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#172B4D]">My Preparations</h2>
                <span className="text-xs font-semibold bg-[#EEF4FF] text-[#315BEA] border border-[#C7D7FE] px-2.5 py-0.5 rounded-full">
                  {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
                </span>
              </div>
            </div>

            {/* Grid of preparation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <PreparationCard key={session._id} session={session} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
