import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Search, Globe, MapPin } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/layout/EmptyState';
import PageLoader from '../components/layout/PageLoader';

export default function CitySearch() {
  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [bootLoading, setBootLoading] = useState(true);

  /* Only full-screen loader on first paint; filtering stays in-page to avoid flashing while typing */
  const firstFetch = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (region) params.set('region', region);
    if (firstFetch.current) setBootLoading(true);
    api.get(`/cities?${params}`).then((d) => {
      setCities(d.cities);
      setRegions(d.regions);
    }).catch(console.error).finally(() => {
      firstFetch.current = false;
      setBootLoading(false);
    });
  }, [query, region]);

  if (bootLoading) return <PageLoader label="Loading destinations…" />;

  return (
    <PageShell
      title="Cities"
      subtitle="Survey cost bands, regions, and inspiration before you freeze an itinerary."
      contentClassName="content-area--wide"
    >
      <div className="filter-toolbar">
        <label className="filter-toolbar__search">
          <Search size={17} aria-hidden />
          <input
            type="search"
            className="form-input"
            placeholder="Search city or country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select className="form-select filter-toolbar__region" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {cities.length === 0 ? (
        <EmptyState
          icon={<Globe size={22} />}
          title="No matches"
          description="Loosen filters or search for another spelling — catalogs sync with backend seed data."
          action={null}
        />
      ) : (
        <div className="grid grid-3">
          {cities.map((city) => (
            <article className="card card--quiet" key={city.id}>
              {city.image_url && <img className="card-cover" src={city.image_url} alt="" loading="lazy" />}
              <h3 className="card-title">{city.name}</h3>
              <p className="card-text">{city.description || 'Open itinerary builder inside a trip to attach this destination.'}</p>
              <div className="card-meta">
                <span><MapPin size={13} aria-hidden /> {city.country}</span>
                <span><Globe size={13} aria-hidden /> {city.region}</span>
                <span className={`badge badge-${city.cost_index < 40 ? 'green' : city.cost_index < 70 ? 'amber' : 'red'}`}>{city.cost_label}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
