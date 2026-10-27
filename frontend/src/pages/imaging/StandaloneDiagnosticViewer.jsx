import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DiagnosticViewerModal from './DiagnosticViewerModal';

/**
 * StandaloneDiagnosticViewer
 * Full-screen dedicated workstation route for detachable PACS / radiology viewing.
 * Designed for dual-monitor setups, high-resolution diagnostic review, and external share tokens.
 */
export default function StandaloneDiagnosticViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const studyId = searchParams.get('studyId');
  const archiveId = searchParams.get('archiveId');
  const shareToken = searchParams.get('token') || searchParams.get('shareToken');
  const patientId = searchParams.get('patientId');

  const archiveItem = useMemo(() => {
    if (archiveId) {
      return { id: parseInt(archiveId, 10) || archiveId, patient_id: patientId };
    }
    return null;
  }, [archiveId, patientId]);

  const handleClose = () => {
    // If opened via window.open() in a separate window/tab, close it cleanly
    if (window.opener) {
      window.close();
    } else {
      navigate('/imaging?tab=archive');
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-950 overflow-hidden select-none z-50">
      <DiagnosticViewerModal
        isOpen={true}
        onClose={handleClose}
        studyId={studyId}
        archiveItem={archiveItem}
        shareToken={shareToken}
        isStandalone={true}
      />
    </div>
  );
}
