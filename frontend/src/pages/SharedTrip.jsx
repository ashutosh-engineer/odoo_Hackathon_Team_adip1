import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, Clock, DollarSign } from 'lucide-react';

/*
 * SharedTrip — Public read-only trip view (no login needed).
 * Anyone with the share link can see the itinerary.
 */
export default function SharedTrip() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/shared/${token}`)
      .then(setTrip)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--primary-50)' }}>
      <div className="card" style={{ maxWidth: 400, textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Trip Not Found</h2>
        <p style={{ color: 'var(--gray-500)' }}>This link may have expired or the trip is no longer shared.</p>
      </div>
    </div>
  );

  if (!trip) return <div className="page-loader">Loading shared trip...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✈</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem' }}>Traveloop</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{trip.name}</h1>
        <p style={{ color: 'var(--gray-500)' }}>Shared by <strong>{trip.owner_name}</strong></p>
        {trip.description && <p style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{trip.description}</p>}
        {trip.start_date && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--gray-500)' }}><Calendar size={14} style={{ verticalAlign: 'middle' }} /> {trip.start_date} → {trip.end_date || 'Open-ended'}</p>}
      </div>

      {trip.stops?.map((stop, idx) => (
        <div className="card" key={stop.id} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="badge badge-teal">Stop {idx + 1}</span>
            {stop.city?.image_url && <img src={stop.city.image_url} alt={stop.city.name} style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stop.city?.name}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}><MapPin size={13} /> {stop.city?.country}</span>
            </div>
          </div>
          {stop.activities?.length > 0 && (
            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '0.75rem' }}>
              {stop.activities.map((sa) => (
                <div key={sa.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.9rem', flex: 1 }}>{sa.activity?.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}><DollarSign size={12} />${sa.activity?.cost}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}><Clock size={12} /> {sa.activity?.duration_hours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
