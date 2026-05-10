import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function ItineraryBuilder() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [cities, setCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [expandedStop, setExpandedStop] = useState(null);
  const [cityActivities, setCityActivities] = useState([]);

  useEffect(() => {
    api.get(`/trips/${id}`).then(setTrip).catch(console.error);
    api.get('/cities').then((d) => setCities(d.cities)).catch(console.error);
  }, [id]);

  // When a stop is expanded, load activities for its city
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
    } catch (err) { alert(err.message); }
  }

  async function removeStop(stopId) {
    if (!window.confirm('Remove this stop?')) return;
    try {
      await api.del(`/trips/${id}/stops/${stopId}`);
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
      if (expandedStop === stopId) setExpandedStop(null);
    } catch (err) { alert(err.message); }
  }

  async function addActivityToStop(stopId, activityId) {
    try {
      await api.post(`/stops/${stopId}/activities`, { activity_id: activityId, day_number: 1 });
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) { alert(err.message); }
  }

  async function removeStopActivity(stopId, saId) {
    try {
      await api.del(`/stops/${stopId}/activities/${saId}`);
      const updated = await api.get(`/trips/${id}`);
      setTrip(updated);
    } catch (err) { alert(err.message); }
  }

  if (!trip) return <div className="page-loader">Loading itinerary...</div>;

  // Filter cities by search query
  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Build Itinerary</h1><p className="page-subtitle">{trip.name}</p></div>
        <Link to={`/trips/${id}`} className="btn btn-outline">← Back to Trip</Link>
      </div>

      <div className="content-area">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>

          {/* Left: Current stops */}
          <div>
            <div className="section-header"><h2 className="section-title">Your Stops ({trip.stops?.length || 0})</h2></div>
            {(!trip.stops || trip.stops.length === 0) ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--gray-400)' }}>No stops yet — add cities from the right panel →</p>
              </div>
            ) : (
              trip.stops.map((stop, idx) => (
                <div className="card" key={stop.id} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="badge badge-teal">#{idx + 1}</span>
                    {stop.city?.image_url && <img src={stop.city.image_url} alt={stop.city.name} style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{stop.city?.name}</h3>
                      <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{stop.city?.country}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}>
                      {expandedStop === stop.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeStop(stop.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                  </div>

                  {/* Expanded: show activities */}
                  {expandedStop === stop.id && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Scheduled Activities</h4>
                      {stop.activities?.length > 0 ? (
                        stop.activities.map((sa) => (
                          <div key={sa.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                            <span style={{ flex: 1, fontSize: '0.88rem' }}>{sa.activity?.name}</span>
                            <span className="badge badge-amber"><DollarSign size={12} />${sa.activity?.cost}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}><Clock size={12} /> {sa.activity?.duration_hours}h</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeStopActivity(stop.id, sa.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                          </div>
                        ))
                      ) : <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No activities scheduled</p>}

                      {/* Add activity options */}
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Add Activities in {stop.city?.name}</h4>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {cityActivities.map((act) => (
                          <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-50)' }}>
                            <span style={{ flex: 1, fontSize: '0.85rem' }}>{act.name}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>${act.cost} · {act.duration_hours}h</span>
                            <button className="btn btn-primary btn-sm" onClick={() => addActivityToStop(stop.id, act.id)} style={{ padding: '0.25rem 0.5rem' }}><Plus size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Right: City search panel */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add a Destination</h3>
              <input type="text" className="form-input" placeholder="Search cities..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} style={{ marginBottom: '1rem' }} />
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredCities.map((city) => (
                  <div key={city.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}>
                    {city.image_url && <img src={city.image_url} alt={city.name} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{city.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{city.country}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => addStop(city.id)}><Plus size={14} /> Add</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
