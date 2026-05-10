import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Globe, MapPin } from 'lucide-react';

export default function CitySearch() {
  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (region) params.set('region', region);
    api.get(`/cities?${params}`).then((d) => { setCities(d.cities); setRegions(d.regions); }).catch(console.error);
  }, [query, region]);

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">Explore Cities</h1><p className="page-subtitle">Discover destinations for your next trip</p></div></div>
      <div className="content-area">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input type="text" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Search by city or country..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 200 }} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="grid grid-3">
          {cities.map((city) => (
            <div className="card" key={city.id}>
              {city.image_url && <img className="card-image" src={city.image_url} alt={city.name} loading="lazy" />}
              <h3 className="card-title">{city.name}</h3>
              <p className="card-text">{city.description}</p>
              <div className="card-meta">
                <span><MapPin size={13} /> {city.country}</span>
                <span><Globe size={13} /> {city.region}</span>
                <span className={`badge badge-${city.cost_index < 40 ? 'green' : city.cost_index < 70 ? 'amber' : 'red'}`}>{city.cost_label}</span>
              </div>
            </div>
          ))}
        </div>
        {cities.length === 0 && <div className="empty-state"><h3>No cities found</h3><p>Try a different search or filter</p></div>}
      </div>
    </>
  );
}
