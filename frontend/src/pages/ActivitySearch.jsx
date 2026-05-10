import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Clock, DollarSign } from 'lucide-react';

export default function ActivitySearch() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => { api.get('/cities').then((d) => setCities(d.cities)).catch(console.error); }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (category) params.set('category', category);
    api.get(`/activities?${params}`).then((d) => { setActivities(d.activities); setCategories(d.categories); }).catch(console.error);
  }, [cityId, category]);

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">Browse Activities</h1><p className="page-subtitle">Find things to do at your destinations</p></div></div>
      <div className="content-area">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 220 }} value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.country}</option>)}
          </select>
          <select className="form-select" style={{ width: 180 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="grid grid-3">
          {activities.map((act) => (
            <div className="card" key={act.id}>
              {act.image_url && <img className="card-image" src={act.image_url} alt={act.name} loading="lazy" />}
              <h3 className="card-title">{act.name}</h3>
              <p className="card-text">{act.description}</p>
              <div className="card-meta">
                <span className="badge badge-teal">{act.category}</span>
                <span><DollarSign size={13} /> ${act.cost}</span>
                <span><Clock size={13} /> {act.duration_hours}h</span>
                {act.city_name && <span>{act.city_name}</span>}
              </div>
            </div>
          ))}
        </div>
        {activities.length === 0 && <div className="empty-state"><h3>No activities found</h3><p>Adjust filters to see results</p></div>}
      </div>
    </>
  );
}
