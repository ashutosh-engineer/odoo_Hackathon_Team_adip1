import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, CheckSquare, Square, Luggage } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import TripWorkflowNav from '../components/layout/TripWorkflowNav';
import EmptyState from '../components/layout/EmptyState';

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'medical', 'general'];

export default function Packing() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'general' });

  function load() {
    api.get(`/trips/${id}/packing`).then(setItems).catch(console.error);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    await api.post(`/trips/${id}/packing`, newItem);
    setNewItem({ name: '', category: 'general' });
    load();
  }

  async function toggleItem(itemId) {
    await api.post(`/trips/${id}/packing/${itemId}/toggle`);
    load();
  }

  async function deleteItem(itemId) {
    await api.del(`/trips/${id}/packing/${itemId}`);
    load();
  }

  const grouped = items.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const packed = items.filter((i) => i.is_packed).length;
  const total = items.length;
  const pct = total ? Math.round((packed / total) * 100) : 0;

  return (
    <PageShell
      title="Packing"
      subtitle={`${packed} of ${total} packed · ${pct}%`}
      ribbon={<TripWorkflowNav />}
      actions={<Link to={`/trips/${id}`} className="btn btn-ghost btn-sm">Overview</Link>}
    >
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.1rem 1.35rem' }}>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
          <span>{packed} ready</span>
          <span>{total - packed} left</span>
        </div>
      </div>

      <form onSubmit={addItem} className="card card--quiet" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div className="packing-add-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="pack-name">Item</label>
            <input
              id="pack-name"
              type="text"
              className="form-input"
              placeholder="Noise-cancelling headphones"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="pack-cat">Category</label>
            <select
              id="pack-cat"
              className="form-select"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              {PACKING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 42 }}>
            <Plus size={16} /> Add
          </button>
        </div>
      </form>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={<Luggage size={22} />}
          title="Nothing on the list"
          description="Add essentials by category — tap a row anytime to toggle packed status."
          action={null}
        />
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: '1.35rem' }}>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--gray-500)',
              marginBottom: '0.5rem',
            }}
            >
              {cat}
            </h3>
            <div className="card" style={{ padding: '0.35rem 1rem 0.15rem' }}>
              {catItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className="packing-row"
                  onClick={() => toggleItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleItem(item.id);
                    }
                  }}
                >
                  {item.is_packed ? (
                    <CheckSquare size={20} style={{ color: 'var(--success)', flexShrink: 0 }} aria-hidden />
                  ) : (
                    <Square size={20} style={{ color: 'var(--gray-300)', flexShrink: 0 }} aria-hidden />
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.9rem',
                      textDecoration: item.is_packed ? 'line-through' : 'none',
                      color: item.is_packed ? 'var(--gray-400)' : 'var(--gray-800)',
                    }}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </PageShell>
  );
}
