"""
Dashboard Route
----------------
The central hub after login — shows dynamic data:
- Welcome message with user's name
- Their recent trips (sorted by last updated)
- Popular destinations from the database (most added to trips)
- Quick actions: create trip, explore cities

All data is pulled from the database — no hardcoded content.
"""

from flask import Blueprint, render_template
from flask_login import login_required, current_user
from backend.models.trip import Trip
from backend.models.city import City

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def home():
    """
    Render the main dashboard with dynamic, user-specific content.
    Performance: limited queries with .limit() to avoid loading everything.
    """
    # Recent trips — show latest 6, ordered by most recently updated
    recent_trips = (
        Trip.query
        .filter_by(user_id=current_user.id)
        .order_by(Trip.updated_at.desc())
        .limit(6)
        .all()
    )

    # Popular destinations — top 8 cities by popularity score
    # These are updated dynamically whenever a city is added to a trip
    popular_cities = (
        City.query
        .order_by(City.popularity.desc())
        .limit(8)
        .all()
    )

    # Stats for the user's overview cards
    total_trips = Trip.query.filter_by(user_id=current_user.id).count()
    upcoming_trips = (
        Trip.query
        .filter(Trip.user_id == current_user.id, Trip.start_date != None)
        .order_by(Trip.start_date.asc())
        .limit(3)
        .all()
    )

    return render_template(
        'dashboard.html',
        recent_trips=recent_trips,
        popular_cities=popular_cities,
        total_trips=total_trips,
        upcoming_trips=upcoming_trips
    )
