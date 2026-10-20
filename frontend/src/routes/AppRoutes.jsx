import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import PreparationSetup from '../pages/PreparationSetup';
import PreparationDetails from '../pages/PreparationDetails';
import ResumeAnalysis from '../pages/ResumeAnalysis';
import CompanyRoleAnalysis from '../pages/CompanyRoleAnalysis';
import SkillGapAnalysis from '../pages/SkillGapAnalysis';
import TailoredResumeEditorPage from '../pages/TailoredResumeEditorPage';
import JobPreparationPlan from '../pages/JobPreparationPlan';
import JobReadinessTwin from '../pages/JobReadinessTwin';
import CodingPreparation from '../pages/CodingPreparation';
import AptitudePreparation from '../pages/AptitudePreparation';
import MockInterview from '../pages/MockInterview';
import InterviewReport from '../pages/InterviewReport';
import Profile from '../pages/Profile';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          !loading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />
        }
      />
      <Route
        path="/login"
        element={
          !loading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route
        path="/signup"
        element={
          !loading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
        }
      />

      {/* Protected Routes nested in DashboardLayout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/preparations" element={<Dashboard />} />
        <Route path="/preparation/setup" element={<PreparationSetup />} />
        <Route path="/preparation/:sessionId" element={<PreparationDetails />} />
        <Route path="/preparation/:sessionId/resume-analysis" element={<ResumeAnalysis />} />
        <Route path="/preparation/:sessionId/company-role-analysis" element={<CompanyRoleAnalysis />} />
        <Route path="/preparation/:sessionId/skill-gap" element={<SkillGapAnalysis />} />
        <Route path="/preparation/:sessionId/tailored-resume" element={<TailoredResumeEditorPage />} />
        <Route path="/preparation/:sessionId/job-preparation-plan" element={<JobPreparationPlan />} />
        <Route path="/preparation/:sessionId/preparation-plan" element={<JobPreparationPlan />} />
        <Route path="/preparation/:sessionId/job-readiness-twin" element={<JobReadinessTwin />} />
        <Route path="/preparation/:sessionId/readiness-twin" element={<JobReadinessTwin />} />
        <Route path="/preparation/:sessionId/coding-prep" element={<CodingPreparation />} />
        <Route path="/preparation/:sessionId/coding-prep/:problemId" element={<CodingPreparation />} />
        <Route path="/preparation/:sessionId/coding-preparation" element={<CodingPreparation />} />
        <Route path="/coding-prep" element={<CodingPreparation />} />
        <Route path="/preparation/:sessionId/aptitude-prep" element={<AptitudePreparation />} />
        <Route path="/preparation/:sessionId/aptitude-prep/:testId" element={<AptitudePreparation />} />
        <Route path="/preparation/:sessionId/aptitude-preparation" element={<AptitudePreparation />} />
        <Route path="/aptitude-prep" element={<AptitudePreparation />} />
        <Route path="/preparation/:sessionId/mock-interview" element={<MockInterview />} />
        <Route path="/preparation/:sessionId/interview-report" element={<InterviewReport />} />
        <Route path="/preparation/:sessionId/evaluation" element={<InterviewReport />} />
        <Route path="/preparation/:sessionId/mistake-progress" element={<InterviewReport />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Profile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
