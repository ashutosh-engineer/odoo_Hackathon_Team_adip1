"""
User Model

Represents a registered traveler on the platform.
Passwords are securely hashed, and Flask-Login integration handles session state.
"""

from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from backend.models import db, login_manager


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    language = db.Column(db.String(10), default='en')
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships — lazy='dynamic' avoids loading all trips on every user query
    trips = db.relationship('Trip', backref='owner', lazy='dynamic',
                            cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and store the password. Never store plaintext."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify a plaintext password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    @property
    def initials(self):
        """Generate display initials from the user's name (for avatar fallback)."""
        parts = self.name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return self.name[0].upper() if self.name else '?'

    def __repr__(self):
        return f'<User {self.email}>'


@login_manager.user_loader
def load_user(user_id):
    """
    Flask-Login callback — loads user from session cookie.
    Called on every authenticated request, so we use primary key lookup (O(1)).
    """
    return User.query.get(int(user_id))
