"""
Itinerary Models — Stop & StopActivity
---------------------------------------
These models connect trips to cities and activities, forming the actual
day-by-day travel plan.

Relationship chain:
  Trip → Stop (city in the trip) → StopActivity (what to do there)

Design decisions:
- Stop.order_index allows drag-and-drop reordering of cities
- StopActivity.day_number groups activities by day within a stop
- start_time stored as string "HH:MM" — simpler than a full Time column
  and sufficient for display purposes
- Notes on both Stop and StopActivity for flexibility (city-level vs activity-level)
"""

from backend.models import db


class Stop(db.Model):
    """
    A single destination within a trip. Each stop represents one city
    the traveler will visit, with its own date range and ordered position.
    """
    __tablename__ = 'stops'

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    city_id = db.Column(db.Integer, db.ForeignKey('cities.id'), nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    # Load city data eagerly since we almost always need city name/image
    city = db.relationship('City', lazy='joined')
    activities = db.relationship('StopActivity', backref='stop', lazy='dynamic',
                                 cascade='all, delete-orphan',
                                 order_by='StopActivity.day_number, StopActivity.start_time')

    @property
    def duration_days(self):
        """How many days the traveler spends at this stop."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return None

    def __repr__(self):
        return f'<Stop #{self.order_index} in trip {self.trip_id}>'


class StopActivity(db.Model):
    """
    An activity scheduled at a particular stop on a particular day.
    Links the global Activity catalog to a user's specific itinerary.
    """
    __tablename__ = 'stop_activities'

    id = db.Column(db.Integer, primary_key=True)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id'), nullable=False, index=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=False)
    day_number = db.Column(db.Integer, default=1)
    start_time = db.Column(db.String(5), nullable=True)  # "09:00" format
    notes = db.Column(db.Text, nullable=True)

    # Eagerly load activity details — we always need name, cost, duration
    activity = db.relationship('Activity', lazy='joined')

    def __repr__(self):
        return f'<StopActivity day={self.day_number} at stop {self.stop_id}>'
