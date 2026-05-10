import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, FileText } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import TripWorkflowNav from '../components/layout/TripWorkflowNav';
import EmptyState from '../components/layout/EmptyState';

export default function Notes() {
  const { id } = useParams();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');

  function load() {
    api.get(`/trips/${id}/notes`).then(setNotes).catch(console.error);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addNote(e) {
    e.preventDefault();
    if (!content.trim()) return;
    await api.post(`/trips/${id}/notes`, { content });
    setContent('');
    load();
  }

  async function deleteNote(noteId) {
    if (!window.confirm('Delete this note?')) return;
    await api.del(`/trips/${id}/notes/${noteId}`);
    load();
  }

  return (
    <PageShell
      title="Notes"
      subtitle={`${notes.length} entr${notes.length === 1 ? 'y' : 'ies'} · journaling & reminders`}
      contentClassName="content-area--narrow"
      ribbon={<TripWorkflowNav />}
      actions={<Link to={`/trips/${id}`} className="btn btn-ghost btn-sm">Overview</Link>}
    >
      <form onSubmit={addNote} className="card card--quiet" style={{ marginBottom: '1.35rem', padding: '1.25rem' }}>
        <textarea
          className="form-textarea"
          placeholder="Flight confirmation numbers, café tips, playlist ideas..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ minHeight: 100, marginBottom: '0.75rem' }}
          required
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={14} /> Save note
        </button>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="Start your trip journal"
          description="Short bullet or long story — every note stays with this trip."
          action={null}
        />
      ) : (
        notes.map((note) => (
          <div className="card card--quiet" key={note.id} style={{ marginBottom: '1rem', padding: '1.15rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                {note.created_at
                  ? new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : ''}
                {note.stop_name ? <span className="badge badge-teal" style={{ marginLeft: '0.5rem' }}>{note.stop_name}</span> : null}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteNote(note.id)} style={{ color: 'var(--error)' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{note.content}</p>
          </div>
        ))
      )}
    </PageShell>
  );
}
