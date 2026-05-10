import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, PlusCircle, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';

/* ── Shared Traveloop logo — #febd69 Amazon yellow ── */
function TravelloopLogo({ size = 24 }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <PageLoader label="Gathering trips…" />;

  return (
    <PageShell
      title={`Hi, ${data.user_name} 👋`}
      subtitle="Your travel workspace"
      contentClassName="content-area--wide"
      actions={
        <Link to="/trips/new" className="btn btn-primary">
          <PlusCircle size={15} /> New trip
        </Link>
      }
    >
      {/* ── Welcome banner ── */}
      <div className="dash-welcome">
        <div className="dash-welcome__left">
          <div className="dash-welcome__logo-wrap">
            <TravelloopLogo size={40} />
          </div>
          <div>
            <h2 className="dash-welcome__heading">Plan the whole journey</h2>
            <p className="dash-welcome__sub">
              Itineraries, budgets, packing lists, and shareable links — all in one place.
            </p>
          </div>
        </div>
        <Link to="/cities" className="btn btn-outline btn-sm">
          <Sparkles size={14} /> Browse cities
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#1a2535' }}>
            <TravelloopLogo size={22} />
          </div>
          <div>
            <div className="stat-value">{data.total_trips}</div>
            <div className="stat-label">Total Trips</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">
            <Calendar size={20} />
          </div>
          <div>
            <div className="stat-value">{data.recent_trips.length}</div>
            <div className="stat-label">Recently Edited</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-value">{data.popular_cities.length}</div>
            <div className="stat-label">Curated Destinations</div>
          </div>
        </div>
      </div>

      {/* ── Recent trips ── */}
      <div className="section-header">
        <h2 className="section-title">Recent trips</h2>
        <Link to="/trips" className="btn btn-ghost btn-sm">See all ›</Link>
      </div>

      {data.recent_trips.length === 0 ? (
        <EmptyState
          icon={<Calendar size={20} />}
          title="Your timeline is quiet"
          description="Spin up your first itinerary — destinations, budgets, packing, and notes follow automatically."
          action={<Link to="/trips/new" className="btn btn-primary">Create a trip</Link>}
        />
      ) : (
        <div className="grid grid-3" style={{ marginBottom: '1.75rem' }}>
          {data.recent_trips.map((trip) => (
            <Link
              to={`/trips/${trip.id}`}
              key={trip.id}
              className="card card--quiet dash-trip-card"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              {trip.cover_image && (
                <img className="card-cover" src={`/static/${trip.cover_image}`} alt="" />
              )}
              <h3 className="card-title">{trip.name}</h3>
              <p className="card-text">
                {trip.description || 'No notes yet · open the trip to personalize.'}
              </p>
              <div className="card-meta">
                {trip.start_date && (
                  <span><Calendar size={12} aria-hidden /> {trip.start_date}</span>
                )}
                <span><MapPin size={12} aria-hidden /> {trip.stop_count} stops</span>
                {trip.duration_days ? <span>{trip.duration_days} days</span> : null}
              </div>
              <div className="dash-trip-card__cta">
                <span>Open trip</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Popular destinations ── */}
      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Popular destinations</h2>
        <Link to="/cities" className="btn btn-ghost btn-sm">Open explorer ›</Link>
      </div>
      <div className="grid grid-4">
        {data.popular_cities.map((city) => (
          <article className="card card--quiet" key={city.id}>
            {city.image_url && (
              <img className="card-cover" src={city.image_url} alt="" loading="lazy" />
            )}
            <h3 className="card-title">{city.name}</h3>
            <div className="card-meta">
              <span>{city.country}</span>
              <span className={`badge badge-${city.cost_index < 40 ? 'green' : city.cost_index < 70 ? 'amber' : 'red'}`}>
                {city.cost_label}
              </span>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
