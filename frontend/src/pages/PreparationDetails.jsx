import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

/**
 * PreparationDetails — Redirects to consolidated Resume Analysis page.
 * As per design requirements, the separate top preparation session card,
 * attached resume card, and experience card have been consolidated directly
 * into the main Resume Analysis page (/preparation/:sessionId/resume-analysis).
 */
const PreparationDetails = () => {
  const { sessionId } = useParams();
  return <Navigate to={`/preparation/${sessionId}/resume-analysis`} replace />;
};

export default PreparationDetails;
