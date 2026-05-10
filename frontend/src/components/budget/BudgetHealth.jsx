/**
 * BudgetHealth — Smart Budget Analytics widget.
 *
 * Shows a 0-100 health score with colour band, anomaly alerts, and tips.
 * Polls the backend until the Celery task completes.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw, Lightbulb } from 'lucide-react';

const BAND_META = {
  healthy:  { label: 'Healthy',  color: '#067d62', bg: '#e6f4f1', Icon: ShieldCheck },
  caution:  { label: 'Caution',  color: '#c45e00', bg: '#fef3e2', Icon: AlertTriangle },
  at_risk:  { label: 'At Risk',  color: '#cc0c39', bg: '#fce8ec', Icon: XCircle },
};

export default function BudgetHealth({ tripId }) {
  const [report,   setReport]   = useState(null);
  const [status,   setStatus]   = useState('idle');   // idle | computing | ready | error
  const [polling,  setPolling]  = useState(false);

  const fetchHealth = useCallback(async (force = false) => {
    setStatus('computing');
    try {
      if (force) {
        await api.post(`/trips/${tripId}/budget/health/refresh`, {});
      }
      const data = await api.get(`/trips/${tripId}/budget/health`);
      if (data.status === 'ready') {
        setReport(data.report);
        setStatus('ready');
        setPolling(false);
      } else {
        // Still computing — poll
        setStatus('computing');
        setPolling(true);
      }
    } catch {
      setStatus('error');
    }
  }, [tripId]);

  // Initial load
  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Poll every 3 s while computing
  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(() => fetchHealth(), 3000);
    return () => clearTimeout(t);
  }, [polling, fetchHealth]);

  if (status === 'idle' || status === 'computing') {
    return (
      <div className="budget-health budget-health--loading">
        <span className="budget-health__spinner" aria-hidden="true" />
        <span>Analysing budget…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="budget-health budget-health--error">
        <AlertTriangle size={16} />
        <span>Could not load budget health.</span>
        <button className="btn btn-ghost btn-sm" onClick={() => fetchHealth()}>Retry</button>
      </div>
    );
  }

  if (!report) return null;

  const { label, color, bg, Icon } = BAND_META[report.band] ?? BAND_META.caution;
  const pct = report.score;

  return (
    <div className="budget-health" style={{ '--bh-color': color, '--bh-bg': bg }}>
      {/* Header */}
      <div className="budget-health__header">
        <div className="budget-health__title-row">
          <Icon size={18} style={{ color }} aria-hidden />
          <h3 className="budget-health__title">Budget Health</h3>
          <span className="budget-health__band" style={{ background: bg, color }}>
            {label}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fetchHealth(true)}
          title="Refresh analysis"
          aria-label="Refresh budget health"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Score ring */}
      <div className="budget-health__score-row">
        <div className="budget-health__ring" aria-label={`Score: ${pct} out of 100`}>
          <svg viewBox="0 0 44 44" className="budget-health__ring-svg" aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#eaeded" strokeWidth="4" />
            <circle
              cx="22" cy="22" r="18" fill="none"
              stroke={color} strokeWidth="4"
              strokeDasharray={`${(pct / 100) * 113.1} 113.1`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
          </svg>
          <span className="budget-health__score-num" style={{ color }}>{pct}</span>
        </div>

        <div className="budget-health__stats">
          <div className="budget-health__stat">
            <span className="budget-health__stat-label">Daily rate</span>
            <span className="budget-health__stat-val">${report.daily_rate}/day</span>
          </div>
          {report.recommended_daily && (
            <div className="budget-health__stat">
              <span className="budget-health__stat-label">Recommended</span>
              <span className="budget-health__stat-val">${report.recommended_daily}/day</span>
            </div>
          )}
          <div className="budget-health__stat">
            <span className="budget-health__stat-label">Projected total</span>
            <span className="budget-health__stat-val">${report.estimated_total}</span>
          </div>
          {report.budget_limit && (
            <div className="budget-health__stat">
              <span className="budget-health__stat-label">Budget limit</span>
              <span className="budget-health__stat-val">${report.budget_limit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Anomalies */}
      {report.anomalies?.length > 0 && (
        <div className="budget-health__anomalies">
          {report.anomalies.map((msg, i) => (
            <div key={i} className="budget-health__anomaly">
              <AlertTriangle size={13} style={{ color, flexShrink: 0 }} aria-hidden />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {report.tips?.length > 0 && (
        <div className="budget-health__tips">
          {report.tips.map((tip, i) => (
            <div key={i} className="budget-health__tip">
              <Lightbulb size={13} style={{ color: '#007185', flexShrink: 0 }} aria-hidden />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
