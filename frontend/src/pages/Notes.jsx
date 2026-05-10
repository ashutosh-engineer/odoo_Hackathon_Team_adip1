import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Trash2, FileText } from 'lucide-react';

export default function Notes() {
  const { id } = useParams();
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');

  function load() { api.get(`/trips/${id}/notes`).then(setNotes).catch(console.error); }
  useEffect(() => { load(); }, [id]);

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
    <>
      <div className="page-header">
        <div><h1 className="page-title">Trip Journal</h1><p className="page-subtitle">{notes.length} note{notes.length !== 1 ? 's' : ''}</p></div>
        <Link to={`/trips/${id}`} className="btn btn-outline">← Back</Link>
      </div>

      <div className="content-area" style={{ maxWidth: 700 }}>
        <form onSubmit={addNote} className="card" style={{ marginBottom: '1.5rem' }}>
          <textarea className="form-textarea" placeholder="Write a note about your trip..." value={content} onChange={(e) => setContent(e.target.value)} style={{ minHeight: 80, marginBottom: '0.75rem' }} required />
          <button type="submit" className="btn btn-primary btn-sm"><Plus size={14} /> Add Note</button>
        </form>

        {notes.length === 0 ? (
          <div className="empty-state"><FileText size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} /><h3>No notes yet</h3><p>Capture memories, tips, and reminders about your trip</p></div>
        ) : notes.map((note) => (
          <div className="card" key={note.id} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                {note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                {note.stop_name && <span className="badge badge-teal" style={{ marginLeft: '0.5rem' }}>{note.stop_name}</span>}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => deleteNote(note.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.content}</p>
          </div>
        ))}
      </div>
    </>
  );
}
