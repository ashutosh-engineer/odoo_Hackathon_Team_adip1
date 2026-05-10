import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, DollarSign, Luggage, FileText, Share2, Loader2 } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import TripWorkflowNav from '../components/layout/TripWorkflowNav';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';
import PresenceBar from '../components/collaboration/PresenceBar';
import PdfExportButton from '../components/export/PdfExportButton';
import { usePresence } from '../hooks/usePresence';
import { useAuth } from '../context/AuthContext';

export default function TripView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareNote, setShareNote] = useState('');

  // ── Feature 1: Presence ──────────────────────────────────────────────
  const { users: presentUsers } = usePresence(id ? parseInt(id) : null);

  useEffect(() => {
    api.get(`/trips/${id}`).then(setTrip).catch(console.error);
  }, [id]);

  async function copyShareLink() {
    if (!trip) return;
    setShareBusy(true);
    setShareNote('');
    try {
      let token = trip.share_token;
      if (!token) {
        const res = await api.post(`/trips/${id}/share`);
        token = res.data.token;
        setTrip((t) => ({ ...t, share_token: token }));
      }
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
      setShareNote('ok:Public link copied to clipboard.');
    } catch (e) {
      setShareNote(`err:${e.message || 'Could not create link.'}`);
    } finally {
      setShareBusy(false);
      window.setTimeout(() => setShareNote(''), 4000);
    }
  }

  if (!trip) return <PageLoader label="Opening trip…" />;

  return (
    <PageShell
      title={trip.name}
      subtitle={trip.description || 'Overview, itinerary, budget, packing, and notes live in one place.'}
      contentClassName="content-area--wide"
      ribbon={<TripWorkflowNav />}
      actions={(
        <div className="page-header-actions">
          {/* Feature 1: Who's online */}
          <PresenceBar users={presentUsers} currentUserId={user?.id} />

          <button type="button" className="btn btn-outline btn-sm" disabled={shareBusy} onClick={copyShareLink}>
            {shareBusy ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
            Share
          </button>

          {/* Feature 4: PDF export */}
          <PdfExportButton tripId={id} tripName={trip.name} />

          <Link to={`/trips/${id}/itinerary`} className="btn btn-primary btn-sm">Plan itinerary</Link>
          <Link to={`/trips/${id}/budget`} className="btn btn-outline btn-sm"><DollarSign size={16} /> Budget</Link>
        </div>
      )}
    >
      {shareNote ? (
        <div
          role="status"
          className={shareNote.startsWith('err:') ? 'flash flash-error' : 'flash flash-success'}
          style={{ marginBottom: '1rem' }}
        >
          {shareNote.replace(/^(ok|err):/, '')}
        </div>
      ) : null}

      <div className="grid grid-4" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon teal"><Calendar size={20} /></div>
          <div>
            <div className="stat-value">{trip.duration_days ?? '—'}</div>
            <div className="stat-label">Days planned</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><MapPin size={20} /></div>
          <div>
            <div className="stat-value">{trip.stop_count}</div>
            <div className="stat-label">Stops</div>
          </div>
        </div>
        <Link to={`/trips/${id}/packing`} className="stat-card card--quiet" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon blue"><Luggage size={20} /></div>
          <div>
            <div className="stat-label" style={{ fontWeight: 600 }}>Packing checklist</div>
          </div>
        </Link>
        <Link to={`/trips/${id}/notes`} className="stat-card card--quiet" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon teal"><FileText size={20} /></div>
          <div>
            <div className="stat-label" style={{ fontWeight: 600 }}>Trip journal</div>
          </div>
        </Link>
      </div>

      {trip.start_date && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
          <Calendar size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem' }}>
            <strong>{trip.start_date}</strong>
            <span style={{ color: 'var(--gray-400)', margin: '0 0.35rem' }}>→</span>
            <strong>{trip.end_date || 'Flexible end date'}</strong>
          </span>
        </div>
      )}

      <div className="section-header">
        <h2 className="section-title">Itinerary stops</h2>
        <Link to={`/trips/${id}/itinerary`} className="btn btn-ghost btn-sm">Manage stops</Link>
      </div>

      {(!trip.stops || trip.stops.length === 0) ? (
        <EmptyState
          icon={<MapPin size={22} />}
          title="No stops yet"
          description="Add cities to shape your route, then attach activities when you dive into the itinerary workspace."
          action={<Link to={`/trips/${id}/itinerary`} className="btn btn-primary">Open itinerary builder</Link>}
        />
      ) : (
        <div className="grid grid-2">
          {trip.stops.map((stop, idx) => (
            <div className="card card--quiet" key={stop.id}>
              {stop.city?.image_url && (
                <img className="card-cover" src={stop.city.image_url} alt={stop.city.name} loading="lazy" />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span className="badge badge-teal">Stop {idx + 1}</span>
                <h3 className="card-title" style={{ marginBottom: 0 }}>{stop.city?.name}</h3>
              </div>
              <p className="card-text">{stop.city?.country}</p>
              <div className="card-meta">
                {stop.start_date && (
                  <span><Calendar size={13} aria-hidden /> {stop.start_date} → {stop.end_date}</span>
                )}
                <span>{stop.activities?.length || 0} activities</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
