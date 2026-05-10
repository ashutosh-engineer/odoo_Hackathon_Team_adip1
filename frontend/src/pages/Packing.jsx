import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'medical', 'general'];

export default function Packing() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', category: 'general' });

  function load() { api.get(`/trips/${id}/packing`).then(setItems).catch(console.error); }
  useEffect(() => { load(); }, [id]);

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

  // Group by category
  const grouped = items.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const packed = items.filter((i) => i.is_packed).length;
  const total = items.length;
  const pct = total ? Math.round((packed / total) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Packing Checklist</h1><p className="page-subtitle">{packed}/{total} items packed ({pct}%)</p></div>
        <Link to={`/trips/${id}`} className="btn btn-outline">← Back</Link>
      </div>

      <div className="content-area">
        {/* Progress */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            <span>{packed} packed</span><span>{total - packed} remaining</span>
          </div>
        </div>

        {/* Add item form */}
        <form onSubmit={addItem} className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Item name</label>
            <input type="text" className="form-input" placeholder="e.g. Sunscreen" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select className="form-select" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
              {PACKING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 42 }}><Plus size={16} /> Add</button>
        </form>

        {/* Items grouped by category */}
        {Object.keys(grouped).length === 0 ? (
          <div className="empty-state"><h3>Nothing packed yet</h3><p>Start adding items to your packing list</p></div>
        ) : Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>{cat}</h3>
            <div className="card" style={{ padding: '0.5rem 1rem' }}>
              {catItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} onClick={() => toggleItem(item.id)}>
                  {item.is_packed ? <CheckSquare size={18} style={{ color: 'var(--success)' }} /> : <Square size={18} style={{ color: 'var(--gray-300)' }} />}
                  <span style={{ flex: 1, fontSize: '0.9rem', textDecoration: item.is_packed ? 'line-through' : 'none', color: item.is_packed ? 'var(--gray-400)' : 'var(--gray-800)' }}>{item.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
