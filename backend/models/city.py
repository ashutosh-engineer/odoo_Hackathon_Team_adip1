"""
City model.

Stores destination reference data used when travelers add stops to trips.
"""

from backend.models import db


class City(db.Model):
    __tablename__ = 'cities'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    region = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    cost_index = db.Column(db.Float, default=50.0)  # 0=very cheap, 100=very expensive
    popularity = db.Column(db.Integer, default=0)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # A city has many available activities
    activities = db.relationship('Activity', backref='city', lazy='dynamic')

    @property
    def cost_label(self):
        """Human-readable cost category based on the numeric index."""
        if self.cost_index < 30:
            return 'Budget'
        elif self.cost_index < 60:
            return 'Moderate'
        elif self.cost_index < 80:
            return 'Expensive'
        return 'Luxury'

    def __repr__(self):
        return f'<City {self.name}, {self.country}>'
