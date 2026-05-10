"""
Trip model.

Represents a travel plan and the data attached to it, including stops,
notes, expenses, and share state.
"""

import secrets
from datetime import datetime, timezone
from backend.models import db


class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_image = db.Column(db.String(500), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    share_token = db.Column(db.String(64), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Child relationships — cascade delete keeps data consistent
    stops = db.relationship('Stop', backref='trip', lazy='dynamic',
                            cascade='all, delete-orphan',
                            order_by='Stop.order_index')
    packing_items = db.relationship('PackingItem', backref='trip', lazy='dynamic',
                                    cascade='all, delete-orphan')
    notes = db.relationship('TripNote', backref='trip', lazy='dynamic',
                            cascade='all, delete-orphan')
    expenses = db.relationship('TripExpense', backref='trip', lazy='dynamic',
                               cascade='all, delete-orphan')

    def generate_share_token(self):
        """Create a unique, URL-safe token for sharing this trip publicly."""
        self.share_token = secrets.token_urlsafe(32)
        self.is_public = True
        return self.share_token

    @property
    def duration_days(self):
        """Calculate trip length in days. Returns None if dates aren't set."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return None

    @property
    def stop_count(self):
        """Number of cities/stops in this trip."""
        return self.stops.count()

    @property
    def total_estimated_cost(self):
        """Sum of all expenses for this trip. Used in budget breakdown."""
        total = db.session.query(
            db.func.coalesce(db.func.sum(TripExpense.amount), 0)
        ).filter(TripExpense.trip_id == self.id).scalar()
        return round(float(total), 2)

    def __repr__(self):
        return f'<Trip "{self.name}" by user {self.user_id}>'


class TripExpense(db.Model):
    """
    Individual expense line item within a trip.
    Categories: transport, accommodation, food, activities, other
    Stored separately from stops so users can add trip-wide costs too.
    """
    __tablename__ = 'trip_expenses'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False, default='other')
    description = db.Column(db.String(200), nullable=True)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    currency = db.Column(db.String(3), default='USD')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
