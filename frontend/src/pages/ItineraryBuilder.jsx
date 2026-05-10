import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, Clock, DollarSign, ChevronDown, ChevronUp, MapPin, Wand2, Lock, Users } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import TripWorkflowNav from '../components/layout/TripWorkflowNav';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';
import PresenceBar from '../components/collaboration/PresenceBar';
import { usePresence } from '../hooks/usePresence';
import { useAuth } from '../context/AuthContext';

export default function ItineraryBuilder() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [cities, setCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [expandedStop, setExpandedStop] = useState(null);
  const [cityActivities, setCityActivities] = useState([]);
  const [magicFillBusy, setMagicFillBusy] = useState({});   // stopId → bool
  const [magicFillMsg,  setMagicFillMsg]  = useState({});   // stopId → msg

  // ── Feature 1: Presence + locking ───────────────────────────────────
  const { users: presentUsers, locks, lockStop, unlockStop } = usePresence(id ? parseInt(id) : null);

  useEffect(() => {
    api.get(`/trips/${id}`).then(setTrip).catch(console.error);
    api.get('/cities').then((d) => setCities(d.cities)).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (expandedStop !== null && trip) {
      const stop = trip.stops.find((s) => s.id === expandedStop);
      if (stop?.city) {
        api.get(`/activities?city_id=${stop.city.id}`).then((d) => setCityActivities(d.activities)).catch(console.error);
      }
    }
  }, [expandedStop, trip]);

  async function addStop(cityId) {
    try {
      await api.post(`/trips/${id}/stops`, { city_id: cityId });
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeStop(stopId) {
    if (!window.confirm('Remove this stop from your trip?')) return;
    try {
      await api.del(`/trips/${id}/stops/${stopId}`);
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
      if (expandedStop === stopId) setExpandedStop(null);
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Feature 1: acquire lock before expanding a stop ──────────────────
  async function handleExpandStop(stopId) {
    if (expandedStop === stopId) {
      // Collapsing — release lock
      await unlockStop(stopId);
      setExpandedStop(null);
      return;
    }
    const granted = await lockStop(stopId);
    if (!granted) {
      const holderUid = locks[String(stopId)];
      const holder = presentUsers.find((u) => u.user_id === holderUid);
      alert(`This stop is currently being edited by ${holder?.name ?? 'another user'}. Try again in a moment.`);
      return;
    }
    setExpandedStop(stopId);
  }

  async function addActivityToStop(stopId, activityId) {
    try {
      await api.post(`/stops/${stopId}/activities`, { activity_id: activityId, day_number: 1 });
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeStopActivity(stopId, saId) {
    try {
      await api.del(`/stops/${stopId}/activities/${saId}`);
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Feature 3: Magic Fill ─────────────────────────────────────────────
  async function magicFill(stopId, cityName) {
    setMagicFillBusy((p) => ({ ...p, [stopId]: true }));
    setMagicFillMsg((p) => ({ ...p, [stopId]: '' }));
    try {
      const res = await api.post(`/trips/${id}/stops/${stopId}/magic-fill`, { days: 3, max_per_day: 2 });
      const n = res?.data?.total_added ?? 0;
      setMagicFillMsg((p) => ({ ...p, [stopId]: `✓ Added ${n} activities` }));
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) {
      setMagicFillMsg((p) => ({ ...p, [stopId]: `✗ ${err.message}` }));
    } finally {
      setMagicFillBusy((p) => ({ ...p, [stopId]: false }));
      setTimeout(() => setMagicFillMsg((p) => ({ ...p, [stopId]: '' })), 4000);
    }
  }

  if (!trip) return <PageLoader label="Loading itinerary…" />;

  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.country.toLowerCase().includes(citySearch.toLowerCase()));

  const stopCount = trip.stops?.length || 0;

  return (
    <PageShell
      title="Itinerary"
      subtitle={trip.name}
      contentClassName="content-area--wide"
      ribbon={<TripWorkflowNav />}
      actions={
        <div className="page-header-actions">
          {/* Feature 1: Who's online */}
          <PresenceBar users={presentUsers} currentUserId={user?.id} />
          <Link to={`/trips/${id}`} className="btn btn-ghost btn-sm">Trip overview</Link>
        </div>
      }
    >
      <div className="hero-strip">
        <div>
          <h2>Shape your route</h2>
          <p>Add cities on the right, expand each stop to preview local activities and attach them.</p>
        </div>
        <span className="badge badge-teal">{stopCount} stops</span>
      </div>

      <div className="studio-layout">
        {/* Left: stops list */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Your stops</h2>
          </div>

          {(!trip.stops || trip.stops.length === 0) ? (
            <EmptyState
              icon={<MapPin size={22} />}
              title="Your map is blank"
              description="Search the catalog on the right and tap Add to anchor your first city."
              action={null}
            />
          ) : (
            trip.stops.map((stop, idx) => {
              const isLocked   = locks[String(stop.id)] !== undefined;
              const lockedByMe = locks[String(stop.id)] === user?.id;
              const locker     = isLocked && !lockedByMe
                ? presentUsers.find((u) => u.user_id === locks[String(stop.id)])
                : null;

              return (
                <div className="card card--quiet" key={stop.id} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-teal">{idx + 1}</span>
                    {stop.city?.image_url && (
                      <img src={stop.city.image_url} alt="" className="stop-row-media" />
                    )}
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{stop.city?.name}</h3>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{stop.city?.country}</span>
                    </div>

                    {/* Lock indicator */}
                    {isLocked && !lockedByMe && (
                      <span className="stop-lock-badge" title={`Locked by ${locker?.name ?? 'another user'}`}>
                        <Lock size={12} /> {locker?.name ?? 'Locked'}
                      </span>
                    )}

                    <div className="toolbar toolbar--end" style={{ gap: '0.25rem', marginLeft: 'auto', marginTop: 0 }}>
                      {/* Feature 3: Magic Fill button */}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => magicFill(stop.id, stop.city?.name)}
                        disabled={magicFillBusy[stop.id] || (isLocked && !lockedByMe)}
                        title={`Auto-fill activities for ${stop.city?.name}`}
                      >
                        <Wand2 size={14} />
                        {magicFillBusy[stop.id] ? 'Filling…' : 'Magic Fill'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleExpandStop(stop.id)}
                        disabled={isLocked && !lockedByMe}
                      >
                        {expandedStop === stop.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Activities
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeStop(stop.id)}
                        style={{ color: 'var(--error)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Magic fill feedback */}
                  {magicFillMsg[stop.id] && (
                    <div
                      className={`flash ${magicFillMsg[stop.id].startsWith('✓') ? 'flash-success' : 'flash-error'}`}
                      style={{ marginTop: '0.5rem', marginBottom: 0 }}
                    >
                      {magicFillMsg[stop.id]}
                    </div>
                  )}

                  {expandedStop === stop.id && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                      {lockedByMe && (
                        <div className="stop-editing-badge">
                          <Lock size={12} /> You are editing this stop
                        </div>
                      )}

                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.65rem' }}>
                        Scheduled
                      </h4>
                      {stop.activities?.length > 0 ? (
                        stop.activities.map((sa) => (
                          <div key={sa.id} className="itinerary-activity-row">
                            <span className="itinerary-activity-row__name">{sa.activity?.name}</span>
                            <span className="badge badge-amber"><DollarSign size={12} /> ${sa.activity?.cost}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                              <Clock size={12} /> {sa.activity?.duration_hours}h
                            </span>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStopActivity(stop.id, sa.id)} style={{ color: 'var(--error)' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No activities yet — pick from the list below or use Magic Fill.</p>
                      )}

                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
                        Add in {stop.city?.name}
                      </h4>
                      <div className="list-scroll">
                        {cityActivities.map((act) => (
                          <div key={act.id} className="city-pick-row">
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{act.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                                ${act.cost} · {act.duration_hours}h
                              </div>
                            </div>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => addActivityToStop(stop.id, act.id)}>
                              <Plus size={14} /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: city catalog */}
        <div>
          <div className="studio-panel studio-panel--sticky">
            <h3 className="studio-panel__title">Destinations catalog</h3>
            <input
              type="search"
              className="form-input"
              placeholder="Search city or country"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <div className="list-scroll">
              {filteredCities.map((city) => (
                <div key={city.id} className="city-pick-row city-pick-row--hover">
                  {city.image_url && <img src={city.image_url} alt="" className="city-pick-row__thumb" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{city.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{city.country}</div>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => addStop(city.id)}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
