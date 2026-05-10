import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function TripCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) { setForm((p) => ({ ...p, [field]: value })); }

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
    <>
      <div className="page-header"><div><h1 className="page-title">Create a New Trip</h1><p className="page-subtitle">Name your adventure and set the dates</p></div></div>
      <div className="content-area" style={{ maxWidth: 600 }}>
        {error && <div className="flash flash-error">{error}</div>}
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="trip-name">Trip Name *</label>
            <input type="text" className="form-input" id="trip-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. European Summer Adventure" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="trip-desc">Description</label>
            <textarea className="form-textarea" id="trip-desc" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What's this trip about?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="start-date">Start Date</label>
              <input type="date" className="form-input" id="start-date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="end-date">End Date</label>
              <input type="date" className="form-input" id="end-date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Trip & Add Destinations'}
          </button>
        </form>
      </div>
    </>
  );
}
