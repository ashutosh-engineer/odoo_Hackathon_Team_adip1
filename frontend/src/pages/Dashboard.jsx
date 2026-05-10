import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  MapPin, Calendar, PlusCircle, Sparkles, TrendingUp,
  ArrowRight, Globe, Plane, BarChart3, Clock, ChevronRight,
} from 'lucide-react';
import PageLoader from '../components/layout/PageLoader';
import '../dashboard.css';

/* ── Traveloop logo SVG ── */
function TravelloopLogo({ size = 24 }) {
  return (
    <svg width={size} height={Math.round(size * 46 / 48)} viewBox="0 0 48 46"
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#febd69" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937
        a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788
        l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237
        c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894
        c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377
        c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
    </svg>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, icon: Icon, variant = 'blue', trend }) {
  return (
    <div className="sd-stat-card">
      <div className="sd-stat-card__header">
        <span className="sd-stat-card__label">{label}</span>
        <div className={`sd-stat-card__icon sd-stat-card__icon--${variant}`}>
          <Icon size={18} aria-hidden />
        </div>
      </div>
      <div className="sd-stat-card__value">{value}</div>
      {trend && <div className="sd-stat-card__trend">{trend}</div>}
    </div>
  );
}

/* ── Trip card ── */
function TripCard({ trip }) {
  return (
    <Link to={`/trips/${trip.id}`} className="sd-trip-card">
      {trip.cover_image
        ? <img className="sd-trip-card__img" src={`/static/${trip.cover_image}`} alt="" loading="lazy" />
        : (
          <div className="sd-trip-card__img-placeholder">
            <Plane size={28} />
          </div>
        )
      }
      <div className="sd-trip-card__body">
        <h3 className="sd-trip-card__title">{trip.name}</h3>
        <p className="sd-trip-card__desc">
          {trip.description || 'No description yet — open the trip to add one.'}
        </p>
        <div className="sd-trip-card__meta">
          {trip.start_date && (
            <span className="sd-trip-card__meta-item">
              <Calendar size={11} aria-hidden /> {trip.start_date}
            </span>
          )}
          <span className="sd-trip-card__meta-item">
            <MapPin size={11} aria-hidden /> {trip.stop_count} stop{trip.stop_count !== 1 ? 's' : ''}
          </span>
          {trip.duration_days && (
            <span className="sd-trip-card__meta-item">
              <Clock size={11} aria-hidden /> {trip.duration_days}d
            </span>
          )}
        </div>
      </div>
      <div className="sd-trip-card__footer">
        <div className="sd-trip-card__cta">
          Open trip <ArrowRight size={13} />
        </div>
        <span className="sd-badge sd-badge--outline">View</span>
      </div>
    </Link>
  );
}

/* ── City card ── */
function CityCard({ city }) {
  const costVariant = city.cost_index < 40 ? 'green' : city.cost_index < 70 ? 'amber' : 'red';
  return (
    <article className="sd-city-card">
      {city.image_url && (
        <img className="sd-city-card__img" src={city.image_url} alt="" loading="lazy" />
      )}
      <div className="sd-city-card__body">
        <div className="sd-city-card__name">{city.name}</div>
        <div className="sd-city-card__meta">
          <span>{city.country}</span>
          <span className={`sd-badge sd-badge--${costVariant}`}>{city.cost_label}</span>
        </div>
      </div>
    </article>
  );
}

/* ── Quick actions panel ── */
function QuickActions() {
  const actions = [
    { label: 'New trip',        to: '/trips/new',    icon: PlusCircle, desc: 'Start planning' },
    { label: 'Explore cities',  to: '/cities',       icon: Globe,      desc: 'Browse destinations' },
    { label: 'My trips',        to: '/trips',        icon: Plane,      desc: 'View all trips' },
    { label: 'Activities',      to: '/activities',   icon: Sparkles,   desc: 'Find things to do' },
  ];
  return (
    <div className="sd-card">
      <div className="sd-card-header">
        <div className="sd-card-title">Quick actions</div>
        <div className="sd-card-description">Jump to any section</div>
      </div>
      <div className="sd-card-content" style={{ paddingTop: '0.75rem' }}>
        {actions.map((a) => (
          <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
            <div className="sd-activity-item" style={{ cursor: 'pointer' }}>
              <div className="sd-activity-item__icon">
                <a.icon size={16} aria-hidden />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sd-activity-item__name">{a.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{a.desc}</div>
              </div>
              <ChevronRight size={14} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <PageLoader label="Gathering trips…" />;

  return (
    <div className="sd-page">
      {/* ── Top header ── */}
      <header className="sd-header">
        <div className="sd-header__left">
          <TravelloopLogo size={26} />
          <span className="sd-header__title">Hi, {data.user_name} 👋</span>
          <span className="sd-header__subtitle">Your travel workspace</span>
        </div>
        <div className="sd-header__actions">
          <Link to="/cities" className="sd-btn sd-btn--secondary sd-btn--sm">
            <Sparkles size={13} /> Browse cities
          </Link>
          <Link to="/trips/new" className="sd-btn sd-btn--brand sd-btn--sm">
            <PlusCircle size={13} /> New trip
          </Link>
        </div>
      </header>

      <div className="sd-content">

        {/* ── Welcome banner ── */}
        <div className="sd-welcome">
          <div className="sd-welcome__left">
            <div className="sd-welcome__logo">
              <TravelloopLogo size={32} />
            </div>
            <div>
              <h2 className="sd-welcome__heading">Plan the whole journey</h2>
              <p className="sd-welcome__sub">
                Itineraries, budgets, packing lists, and shareable links — all in one place.
              </p>
            </div>
          </div>
          <Link to="/trips/new" className="sd-btn sd-btn--brand">
            <PlusCircle size={15} /> Start planning
          </Link>
        </div>

        {/* ── Stat cards ── */}
        <div className="sd-grid-4">
          <StatCard
            label="Total Trips"
            value={data.total_trips}
            icon={Plane}
            variant="brand"
            trend={data.total_trips > 0 ? `${data.total_trips} trip${data.total_trips !== 1 ? 's' : ''} created` : 'No trips yet'}
          />
          <StatCard
            label="Recently Edited"
            value={data.recent_trips.length}
            icon={Clock}
            variant="blue"
            trend="Last 6 trips"
          />
          <StatCard
            label="Destinations"
            value={data.popular_cities.length}
            icon={Globe}
            variant="green"
            trend="Curated catalog"
          />
          <StatCard
            label="Trending"
            value={data.popular_cities[0]?.name ?? '—'}
            icon={TrendingUp}
            variant="amber"
            trend="Most popular city"
          />
        </div>

        {/* ── Main content: trips + sidebar ── */}
        <div className="sd-grid-2-1">

          {/* Left: recent trips */}
          <div>
            <div className="sd-section-header">
              <h2 className="sd-section-title">Recent trips</h2>
              <Link to="/trips" className="sd-btn sd-btn--ghost sd-btn--sm">
                See all <ChevronRight size={13} />
              </Link>
            </div>

            {data.recent_trips.length === 0 ? (
              <div className="sd-card">
                <div className="sd-card-content">
                  <div className="sd-empty">
                    <div className="sd-empty__icon"><Calendar size={22} /></div>
                    <div className="sd-empty__title">Build your first trip timeline</div>
                    <p className="sd-empty__desc">
                      Create a trip to turn your ideas into a complete timeline with destinations, dates, activities, budgets, packing, and notes all organized in one place.
                    </p>
                    <Link to="/trips/new" className="sd-btn sd-btn--primary">
                      <PlusCircle size={14} /> Create a trip
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sd-grid-3">
                {data.recent_trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>

          {/* Right: quick actions */}
          <QuickActions />
        </div>

        {/* ── Popular destinations ── */}
        <div className="sd-section-header" style={{ marginTop: '0.5rem' }}>
          <h2 className="sd-section-title">Popular destinations</h2>
          <Link to="/cities" className="sd-btn sd-btn--ghost sd-btn--sm">
            Open explorer <ChevronRight size={13} />
          </Link>
        </div>
        <div className="sd-grid-4">
          {data.popular_cities.map((city) => (
            <CityCard key={city.id} city={city} />
          ))}
        </div>

      </div>
    </div>
  );
}
