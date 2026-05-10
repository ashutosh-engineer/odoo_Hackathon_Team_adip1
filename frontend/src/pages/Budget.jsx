import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { DollarSign, Trash2, Plus, PieChart } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import TripWorkflowNav from '../components/layout/TripWorkflowNav';
import PageLoader from '../components/layout/PageLoader';
import BudgetHealth from '../components/budget/BudgetHealth';

const CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'other'];

export default function Budget() {
  const { id } = useParams();
  const [budget, setBudget] = useState(null);
  const [newExpense, setNewExpense] = useState({ category: 'other', description: '', amount: '' });

  function loadBudget() {
    api.get(`/trips/${id}/budget`).then(setBudget).catch(console.error);
  }

  useEffect(() => {
    loadBudget();
  }, [id]);

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

  if (!budget) return <PageLoader label="Crunching numbers…" />;

  const categoryColors = {
    transport: '#3b82f6',
    accommodation: '#8b5cf6',
    food: '#f59e0b',
    activities: '#0d9488',
    other: '#64748b',
  };

  return (
    <PageShell
      title="Budget"
      subtitle={budget.trip_name}
      contentClassName="content-area--wide"
      ribbon={<TripWorkflowNav />}
      actions={<Link to={`/trips/${id}`} className="btn btn-ghost btn-sm">Overview</Link>}
    >
      <div className="grid grid-3" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon teal"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">${budget.grand_total}</div>
            <div className="stat-label">Trip total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><PieChart size={22} /></div>
          <div>
            <div className="stat-value">${budget.activity_costs.total}</div>
            <div className="stat-label">From activities</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">${budget.avg_per_day}</div>
            <div className="stat-label">Per day average</div>
          </div>
        </div>
      </div>

      <div className="studio-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 1fr)' }}>
        <div className="studio-panel">
          <h3 className="studio-panel__title">By category</h3>          {Object.keys(budget.category_totals).length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Add expenses or schedule activities to see the split.</p>
          ) : (
            Object.entries(budget.category_totals).map(([cat, amount]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColors[cat] || '#94a3b8' }} aria-hidden />
                <span style={{ flex: 1, fontSize: '0.88rem', textTransform: 'capitalize' }}>{cat}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Number(amount).toFixed(2)}</span>
                <div className="progress-bar" style={{ width: 72 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${budget.grand_total ? (amount / budget.grand_total) * 100 : 0}%`,
                      background: categoryColors[cat] || '#94a3b8',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <form onSubmit={addExpense} className="studio-panel" style={{ marginBottom: '1rem' }}>
            <h3 className="studio-panel__title">Add expense</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <select
                className="form-select"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                placeholder="Amount"
                step="0.01"
                min="0"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                required
              />
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Description (optional)"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              style={{ marginBottom: '0.75rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} /> Add expense
            </button>
          </form>

          {budget.expenses.length > 0 && (
            <div className="studio-panel">
              <h3 className="studio-panel__title">Manual entries</h3>
              {budget.expenses.map((e) => (
                <div key={e.id} className="itinerary-activity-row">
                  <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{e.category}</span>
                  <span className="itinerary-activity-row__name">{e.description || '—'}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>${e.amount}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExpense(e.id)} style={{ color: 'var(--error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Feature 2: Budget Health Score */}
          <BudgetHealth tripId={id} />
        </div>
      </div>
    </PageShell>
  );
}
