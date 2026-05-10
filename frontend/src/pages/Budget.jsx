import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { DollarSign, Trash2, Plus, PieChart } from 'lucide-react';

const CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'other'];

export default function Budget() {
  const { id } = useParams();
  const [budget, setBudget] = useState(null);
  const [newExpense, setNewExpense] = useState({ category: 'other', description: '', amount: '' });

  function loadBudget() { api.get(`/trips/${id}/budget`).then(setBudget).catch(console.error); }
  useEffect(() => { loadBudget(); }, [id]);

  async function addExpense(e) {
    e.preventDefault();
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    await api.post(`/trips/${id}/expenses`, { ...newExpense, amount: parseFloat(newExpense.amount) });
    setNewExpense({ category: 'other', description: '', amount: '' });
    loadBudget();
  }

  async function removeExpense(eid) {
    await api.del(`/trips/${id}/expenses/${eid}`);
    loadBudget();
  }

  if (!budget) return <div className="page-loader">Loading budget...</div>;

  const categoryColors = { transport: '#3b82f6', accommodation: '#8b5cf6', food: '#f59e0b', activities: '#0d9488', other: '#64748b' };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Budget Breakdown</h1><p className="page-subtitle">{budget.trip_name}</p></div>
        <Link to={`/trips/${id}`} className="btn btn-outline">← Back</Link>
      </div>

      <div className="content-area">
        {/* Summary cards */}
        <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon teal"><DollarSign size={22} /></div>
            <div><div className="stat-value">${budget.grand_total}</div><div className="stat-label">Total Budget</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><PieChart size={22} /></div>
            <div><div className="stat-value">${budget.activity_costs.total}</div><div className="stat-label">From Activities</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><DollarSign size={22} /></div>
            <div><div className="stat-value">${budget.avg_per_day}</div><div className="stat-label">Avg / Day</div></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Category breakdown */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>By Category</h3>
            {Object.entries(budget.category_totals).map(([cat, amount]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: categoryColors[cat] || '#94a3b8' }} />
                <span style={{ flex: 1, fontSize: '0.9rem', textTransform: 'capitalize' }}>{cat}</span>
                <span style={{ fontWeight: 600 }}>${Number(amount).toFixed(2)}</span>
                <div className="progress-bar" style={{ width: 80 }}>
                  <div className="progress-fill" style={{ width: `${budget.grand_total ? (amount / budget.grand_total * 100) : 0}%`, background: categoryColors[cat] || '#94a3b8' }} />
                </div>
              </div>
            ))}
            {Object.keys(budget.category_totals).length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No expenses yet</p>}
          </div>

          {/* Add expense form + list */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add Expense</h3>
              <form onSubmit={addExpense}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <select className="form-select" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" className="form-input" placeholder="Amount" step="0.01" min="0" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} required />
                </div>
                <input type="text" className="form-input" placeholder="Description (optional)" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} style={{ marginBottom: '0.75rem' }} />
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}><Plus size={14} /> Add Expense</button>
              </form>
            </div>

            {budget.expenses.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Manual Expenses</h3>
                {budget.expenses.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{e.category}</span>
                    <span style={{ flex: 1, fontSize: '0.88rem' }}>{e.description || '—'}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>${e.amount}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeExpense(e.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
