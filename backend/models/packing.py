"""
Packing & Notes Models
-----------------------
Supporting models that enhance the trip planning experience.

PackingItem — per-trip checklist with categories and packed status
TripNote    — free-form notes tied to a trip or a specific stop

Design decisions:
- PackingItem categories (clothing, documents, electronics, toiletries, other)
  are stored as strings, not a separate table. Simple enough for this scope.
- TripNote.stop_id is nullable — a note can be trip-wide or stop-specific
- Timestamps on notes enable chronological sorting (journal-like display)
"""

from datetime import datetime, timezone
from backend.models import db


class PackingItem(db.Model):
    __tablename__ = 'packing_items'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default='general')
    is_packed = db.Column(db.Boolean, default=False)

    def __repr__(self):
        status = '✓' if self.is_packed else '○'
        return f'<PackingItem [{status}] {self.name}>'


class TripNote(db.Model):
    __tablename__ = 'trip_notes'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    # Nullable — if set, note is tied to a specific stop; otherwise trip-wide
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Optional relationship to stop for stop-specific notes
    stop = db.relationship('Stop', lazy='joined')

    def __repr__(self):
        return f'<TripNote trip={self.trip_id} ({len(self.content)} chars)>'
