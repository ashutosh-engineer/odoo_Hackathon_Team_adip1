import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';

export default function TripCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/trips', form);
      navigate(`/trips/${data.data.id}/itinerary`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="New trip"
      subtitle="Give it a name and optional dates — you will land in the itinerary builder next."
      contentClassName="content-area--narrow"
    >
      {error ? <div className="flash flash-error" style={{ marginBottom: '1rem' }}>{error}</div> : null}
      <form onSubmit={handleSubmit} className="card card--quiet" style={{ padding: '1.75rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="trip-name">Trip name</label>
          <input
            type="text"
            className="form-input"
            id="trip-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Northern lights weekend"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="trip-desc">Description</label>
          <textarea
            className="form-textarea"
            id="trip-desc"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Optional vibe, goals, companions…"
          />
        </div>
        <div className="form-row-dates">
          <div className="form-group">
            <label className="form-label" htmlFor="start-date">Start</label>
            <input
              type="date"
              className="form-input"
              id="start-date"
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="end-date">End</label>
            <input
              type="date"
              className="form-input"
              id="end-date"
              value={form.end_date}
              onChange={(e) => update('end_date', e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.35rem' }} disabled={loading}>
          {loading ? 'Creating…' : (<><ArrowRight size={17} /> Create & plan stops</>)}
        </button>
      </form>
    </PageShell>
  );
}
