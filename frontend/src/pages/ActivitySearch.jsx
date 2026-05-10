import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Compass, Clock, DollarSign } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';

export default function ActivitySearch() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState('');
  const [category, setCategory] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    api.get('/cities').then((d) => setCities(d.cities)).catch(console.error).finally(() => setCatalogReady(true));
  }, []);

  useEffect(() => {
    if (!catalogReady) return;
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (category) params.set('category', category);
    api.get(`/activities?${params}`).then((d) => {
      setActivities(d.activities);
      setCategories(d.categories);
    }).catch(console.error);
  }, [cityId, category, catalogReady]);

  if (!catalogReady) return <PageLoader label="Loading activities…" />;

  return (
    <PageShell
      title="Activities"
      subtitle="Preview experiences by city — add them permanently from the itinerary drawer."
      contentClassName="content-area--wide"
    >
      <div className="filter-toolbar">
        <select className="form-select filter-toolbar__half" value={cityId} onChange={(e) => setCityId(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
          ))}
        </select>
        <select className="form-select filter-toolbar__half" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="No activities for this combo"
          description="Pick another city/category pair — seeded catalog updates instantly from the API."
          action={null}
        />
      ) : (
        <div className="grid grid-3">
          {activities.map((act) => (
            <article className="card card--quiet" key={act.id}>
              {act.image_url && <img className="card-cover" src={act.image_url} alt="" loading="lazy" />}
              <h3 className="card-title">{act.name}</h3>
              <p className="card-text">{act.description}</p>
              <div className="card-meta">
                <span className="badge badge-teal">{act.category}</span>
                <span><DollarSign size={13} aria-hidden /> ${act.cost}</span>
                <span><Clock size={13} aria-hidden /> {act.duration_hours}h</span>
                {act.city_name ? <span>{act.city_name}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
