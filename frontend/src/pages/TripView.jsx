import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, DollarSign, Luggage, FileText, Share2, Map } from 'lucide-react';

export default function TripView() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => { api.get(`/trips/${id}`).then(setTrip).catch(console.error); }, [id]);

  if (!trip) return <div className="page-loader">Loading trip...</div>;

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">{trip.name}</h1><p className="page-subtitle">{trip.description || 'No description'}</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/trips/${id}/itinerary`} className="btn btn-primary"><Map size={16} /> Build Itinerary</Link>
          <Link to={`/trips/${id}/budget`} className="btn btn-outline"><DollarSign size={16} /> Budget</Link>
        </div>
      </div>

      <div className="content-area">
        {/* Trip info cards */}
        <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon teal"><Calendar size={20} /></div>
            <div><div className="stat-value">{trip.duration_days || '—'}</div><div className="stat-label">Days</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><MapPin size={20} /></div>
            <div><div className="stat-value">{trip.stop_count}</div><div className="stat-label">Stops</div></div>
          </div>
          <Link to={`/trips/${id}/packing`} className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon blue"><Luggage size={20} /></div>
            <div><div className="stat-label">Packing List</div></div>
          </Link>
          <Link to={`/trips/${id}/notes`} className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon teal"><FileText size={20} /></div>
            <div><div className="stat-label">Trip Notes</div></div>
          </Link>
        </div>

        {/* Date info */}
        {trip.start_date && (
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span><strong>{trip.start_date}</strong> → <strong>{trip.end_date || 'Open-ended'}</strong></span>
          </div>
        )}

        {/* Stops list */}
        <div className="section-header"><h2 className="section-title">Itinerary Stops</h2></div>
        {(!trip.stops || trip.stops.length === 0) ? (
          <div className="empty-state">
            <h3>No stops added yet</h3>
            <p>Start building your itinerary by adding cities</p>
            <Link to={`/trips/${id}/itinerary`} className="btn btn-primary">Add Destinations</Link>
          </div>
        ) : (
          <div className="grid grid-2">
            {trip.stops.map((stop, idx) => (
              <div className="card" key={stop.id}>
                {stop.city?.image_url && <img className="card-image" src={stop.city.image_url} alt={stop.city.name} loading="lazy" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-teal">Stop {idx + 1}</span>
                  <h3 className="card-title" style={{ marginBottom: 0 }}>{stop.city?.name}</h3>
                </div>
                <p className="card-text">{stop.city?.country}</p>
                <div className="card-meta">
                  {stop.start_date && <span><Calendar size={13} /> {stop.start_date} → {stop.end_date}</span>}
                  <span>{stop.activities?.length || 0} activities planned</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
