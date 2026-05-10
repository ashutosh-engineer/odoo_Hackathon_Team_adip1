"""
Activity model.

Represents city-specific activities used by the itinerary builder and budget views.
"""

from backend.models import db


class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey('cities.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False, default='sightseeing')
    cost = db.Column(db.Float, default=0.0)
    duration_hours = db.Column(db.Float, default=1.0)
    image_url = db.Column(db.String(500), nullable=True)

    def __repr__(self):
        return f'<Activity "{self.name}" in city {self.city_id}>'
