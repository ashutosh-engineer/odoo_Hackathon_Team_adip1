import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { MapPin, Calendar, Trash2, PlusCircle, Eye, Route } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';

export default function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trips')
      .then((data) => setTrips(data.trips ?? data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(tripId, tripName) {
    if (!window.confirm(`Delete “${tripName}”? You can’t undo this.`)) return;
    try {
      await api.del(`/trips/${tripId}`);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <PageLoader label="Fetching trips…" />;

  return (
    <PageShell
      title="Trips"
      subtitle={trips.length ? `${trips.length} adventure${trips.length !== 1 ? 's' : ''} saved` : 'Your archive of upcoming and past plans'}
      contentClassName="content-area--wide"
      actions={<Link to="/trips/new" className="btn btn-primary"><PlusCircle size={17} /> New trip</Link>}
    >
      {trips.length === 0 ? (
        <EmptyState
          icon={<Route size={22} />}
          title="No itineraries yet"
          description="Traveloop keeps itineraries, budgets, packing, and notes bundled per trip — start with one name and dates."
          action={<Link to="/trips/new" className="btn btn-primary btn-lg">Create trip</Link>}
        />
      ) : (
        <div className="grid grid-3">
          {trips.map((trip) => (
            <div className="card card--quiet" key={trip.id}>
              {trip.cover_image && (
                <img className="card-cover" src={`/static/${trip.cover_image}`} alt="" />
              )}
              <h3 className="card-title">{trip.name}</h3>
              <p className="card-text">{trip.description || 'Add a short memo from the overview page anytime.'}</p>
              <div className="card-meta">
                {trip.start_date && <span><Calendar size={14} aria-hidden /> {trip.start_date}</span>}
                <span><MapPin size={14} aria-hidden /> {trip.stop_count} stop{trip.stop_count !== 1 ? 's' : ''}</span>
                {trip.duration_days ? <span>{trip.duration_days}d</span> : null}
              </div>
              <div className="trip-card-toolbar">
                <Link to={`/trips/${trip.id}`} className="btn btn-outline btn-sm"><Eye size={14} /> View</Link>
                <Link to={`/trips/${trip.id}/itinerary`} className="btn btn-primary btn-sm">Itinerary</Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm trip-card-delete"
                  onClick={() => handleDelete(trip.id, trip.name)}
                  aria-label={`Delete ${trip.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
