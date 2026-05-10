import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, Clock, DollarSign } from 'lucide-react';
import PageLoader from '../components/layout/PageLoader';

/* Traveloop logo — #febd69 Amazon yellow, consistent with all other pages */
function TravelloopLogo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        fill="#febd69"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937
           a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788
           l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237
           c-.92 0-1.456-1.04-.92-1.788L10.013.474
           c.214-.297.556-.474.92-.474h28.894
           c.92 0 1.456 1.04.92 1.788l-7.48 10.471
           c-1.07 1.498 0 3.579 1.842 3.579h11.377
           c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  );
}

export default function SharedTrip() {
  const { token } = useParams();
  const [trip, setTrip]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/shared/${token}`)
      .then(setTrip)
      .catch((err) => setError(err.message));
  }, [token]);

  /* ── Error state ── */
  if (error) {
    return (
      <div className="public-trip">
        <div className="public-trip__inner">
          <header className="public-trip-brand" style={{ marginBottom: '1.5rem' }}>
            <div className="brand-mark">
              <TravelloopLogo size={22} />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>
              Traveloop
            </span>
          </header>
          <div className="card card--quiet" style={{ textAlign: 'center', padding: '2.5rem 1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Link unavailable</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              This share link may have been revoked or is incorrect.
            </p>
            <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) return <PageLoader label="Opening shared itinerary…" />;

  /* ── Trip view ── */
  return (
    <div className="public-trip">
      <div className="public-trip__inner">

        {/* Brand header */}
        <header className="public-trip-brand" style={{ marginBottom: '1.5rem' }}>
          <div className="brand-mark" style={{ background: '#131921', borderRadius: 4, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TravelloopLogo size={22} />
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>
            Traveloop · Shared itinerary
          </span>
        </header>

        {/* Trip hero */}
        <section className="card card--quiet" style={{ padding: '1.75rem', marginBottom: '1rem', borderLeft: '4px solid #febd69' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>
            {trip.name}
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Shared by <strong style={{ color: 'var(--gray-800)' }}>{trip.owner_name}</strong>
          </p>
          {trip.description && (
            <p style={{ marginTop: '0.85rem', color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {trip.description}
            </p>
          )}
          {trip.start_date && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} aria-hidden />
              {trip.start_date} → {trip.end_date || 'Open-ended'}
            </p>
          )}
        </section>

        {/* Stops */}
        {trip.stops?.map((stop, idx) => (
          <div className="card card--quiet" key={stop.id} style={{ marginBottom: '1rem', padding: '1.25rem 1.35rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: stop.activities?.length ? '0.85rem' : 0, flexWrap: 'wrap' }}>
              <span className="badge badge-teal">Stop {idx + 1}</span>
              {stop.city?.image_url && (
                <img
                  src={stop.city.image_url}
                  alt=""
                  style={{ width: 52, height: 52, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{stop.city?.name}</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} aria-hidden /> {stop.city?.country}
                </span>
              </div>
            </div>

            {stop.activities?.length > 0 && (
              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '0.65rem' }}>
                {stop.activities.map((sa) => (
                  <div key={sa.id} className="itinerary-activity-row">
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{sa.activity?.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <DollarSign size={11} /> ${sa.activity?.cost}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={11} /> {sa.activity?.duration_hours}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
          Created with <strong style={{ color: '#e47911' }}>Traveloop</strong> · Plan smarter. Travel better.
        </p>
      </div>
    </div>
  );
}
