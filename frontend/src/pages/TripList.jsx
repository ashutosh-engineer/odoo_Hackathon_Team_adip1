import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, Trash2, PlusCircle, Eye } from 'lucide-react';

export default function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trips').then(setTrips).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleDelete(tripId, tripName) {
    if (!window.confirm(`Delete "${tripName}"? This cannot be undone.`)) return;
    try {
      await api.del(`/trips/${tripId}`);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="page-loader">Loading trips...</div>;

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">My Trips</h1><p className="page-subtitle">{trips.length} trip{trips.length !== 1 ? 's' : ''} planned</p></div>
        <Link to="/trips/new" className="btn btn-primary"><PlusCircle size={16} /> New Trip</Link>
      </div>

      <div className="content-area">
        {trips.length === 0 ? (
          <div className="empty-state">
            <h3>No trips yet</h3>
            <p>Your adventures start here — create a trip to begin planning</p>
            <Link to="/trips/new" className="btn btn-primary btn-lg">Create Your First Trip</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {trips.map((trip) => (
              <div className="card" key={trip.id} style={{ position: 'relative' }}>
                {trip.cover_image && <img className="card-image" src={`/static/${trip.cover_image}`} alt={trip.name} />}
                <h3 className="card-title">{trip.name}</h3>
                <p className="card-text">{trip.description || 'No description yet'}</p>
                <div className="card-meta">
                  {trip.start_date && <span><Calendar size={14} /> {trip.start_date}</span>}
                  <span><MapPin size={14} /> {trip.stop_count} stop{trip.stop_count !== 1 ? 's' : ''}</span>
                  {trip.duration_days && <span>{trip.duration_days}d</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <Link to={`/trips/${trip.id}`} className="btn btn-outline btn-sm"><Eye size={14} /> View</Link>
                  <Link to={`/trips/${trip.id}/itinerary`} className="btn btn-primary btn-sm">Build Itinerary</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(trip.id, trip.name)} style={{ marginLeft: 'auto', color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
