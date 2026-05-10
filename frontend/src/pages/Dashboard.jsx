import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, PlusCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-loader">Loading dashboard...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {data.user_name} 👋</h1>
          <p className="page-subtitle">Here&apos;s an overview of your travel plans</p>
        </div>
        <Link to="/trips/new" className="btn btn-primary"><PlusCircle size={16} /> New Trip</Link>
      </div>

      <div className="content-area">
        {/* Stats row */}
        <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon teal"><MapPin size={22} /></div>
            <div><div className="stat-value">{data.total_trips}</div><div className="stat-label">Total Trips</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Calendar size={22} /></div>
            <div><div className="stat-value">{data.recent_trips.length}</div><div className="stat-label">Recent Plans</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><TrendingUp size={22} /></div>
            <div><div className="stat-value">{data.popular_cities.length}</div><div className="stat-label">Destinations Available</div></div>
          </div>
        </div>

        {/* Recent trips */}
        <div className="section-header">
          <h2 className="section-title">Recent Trips</h2>
          <Link to="/trips" className="btn btn-ghost btn-sm">View all</Link>
        </div>

        {data.recent_trips.length === 0 ? (
          <div className="empty-state">
            <h3>No trips yet</h3>
            <p>Create your first trip and start exploring the world</p>
            <Link to="/trips/new" className="btn btn-primary">Plan Your First Trip</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {data.recent_trips.map((trip) => (
              <Link to={`/trips/${trip.id}`} key={trip.id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                {trip.cover_image && <img className="card-image" src={`/static/${trip.cover_image}`} alt={trip.name} />}
                <h3 className="card-title">{trip.name}</h3>
                <p className="card-text">{trip.description || 'No description'}</p>
                <div className="card-meta">
                  {trip.start_date && <span><Calendar size={14} /> {trip.start_date}</span>}
                  <span><MapPin size={14} /> {trip.stop_count} stops</span>
                  {trip.duration_days && <span>{trip.duration_days} days</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Popular destinations */}
        <div className="section-header" style={{ marginTop: '2.5rem' }}>
          <h2 className="section-title">Popular Destinations</h2>
          <Link to="/cities" className="btn btn-ghost btn-sm">Explore all</Link>
        </div>
        <div className="grid grid-4">
          {data.popular_cities.map((city) => (
            <div className="card" key={city.id}>
              {city.image_url && <img className="card-image" src={city.image_url} alt={city.name} loading="lazy" />}
              <h3 className="card-title">{city.name}</h3>
              <div className="card-meta">
                <span>{city.country}</span>
                <span className={`badge badge-${city.cost_index < 40 ? 'green' : city.cost_index < 70 ? 'amber' : 'red'}`}>{city.cost_label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
