/**
 * PdfExportButton — triggers PDF generation and downloads the result.
 *
 * Flow:
 *   1. POST /trips/:id/export/pdf  → 202 (generating) or 200 (cached)
 *   2. Poll GET /trips/:id/export/pdf/status every 2 s until ready
 *   3. Redirect browser to /trips/:id/export/pdf/download
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { FileDown, Loader2, CheckCircle } from 'lucide-react';

export default function PdfExportButton({ tripId, tripName }) {
  const [phase, setPhase] = useState('idle');   // idle | generating | ready | error
  const [polling, setPolling] = useState(false);

  const requestPdf = useCallback(async () => {
    setPhase('generating');
    try {
      const data = await api.post(`/trips/${tripId}/export/pdf`, {});
      if (data?.status === 'ready') {
        setPhase('ready');
      } else {
        setPolling(true);
      }
    } catch (err) {
      setPhase('error');
    }
  }, [tripId]);

  // Poll until ready
  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(async () => {
      try {
        // Re-POST is idempotent — returns 'ready' if cached
        const data = await api.post(`/trips/${tripId}/export/pdf`, {});
        if (data?.status === 'ready') {
          setPhase('ready');
          setPolling(false);
        }
        // else keep polling
      } catch {
        setPhase('error');
        setPolling(false);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [polling, tripId]);

  function download() {
    window.open(`/api/trips/${tripId}/export/pdf/download`, '_blank');
    setPhase('idle');
  }

  if (phase === 'idle') {
    return (
      <button className="btn btn-outline btn-sm" onClick={requestPdf}>
        <FileDown size={15} /> Download PDF
      </button>
    );
  }

  if (phase === 'generating') {
    return (
      <button className="btn btn-outline btn-sm" disabled>
        <Loader2 size={15} className="spin" /> Generating…
      </button>
    );
  }

  if (phase === 'ready') {
    return (
      <button className="btn btn-primary btn-sm" onClick={download}>
        <CheckCircle size={15} /> Download ready
      </button>
    );
  }

  // error
  return (
    <button className="btn btn-outline btn-sm" onClick={requestPdf} title="PDF generation failed — retry">
      <FileDown size={15} /> Retry PDF
    </button>
  );
}
