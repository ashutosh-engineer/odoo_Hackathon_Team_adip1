"""
Trip Routes
-----------
Full CRUD for trip management: create, list, view, update, delete.

Authorization: Every route checks that the trip belongs to current_user.
This prevents horizontal privilege escalation (user A accessing user B's trips).

URL structure:
  /trips/            — list all user's trips
  /trips/create      — new trip form
  /trips/<id>        — view trip details
  /trips/<id>/edit   — edit trip form
  /trips/<id>/delete — delete (POST only)
"""

import os
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from backend.models import db
from backend.models.trip import Trip
from backend.models.city import City
from backend.helpers import get_form_value, parse_optional_date

trips_bp = Blueprint('trips', __name__)

# Allowed image extensions for cover photos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename):
    """Check if uploaded file has an allowed image extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_user_trip_or_404(trip_id):
    """
    Fetch a trip that belongs to the current user.
    Returns 404 if not found, preventing unauthorized access.
    This pattern is used in every trip-specific route.
    """
    return Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()


@trips_bp.route('/')
@login_required
def list_trips():
    """Show all trips owned by the current user, newest first."""
    trips = (
        Trip.query
        .filter_by(user_id=current_user.id)
        .order_by(Trip.updated_at.desc())
        .all()
    )
    return render_template('trips/list.html', trips=trips)


@trips_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create():
    """
    Trip creation form. Handles optional cover image upload.
    Redirects to the itinerary builder after creation so the user
    can immediately start adding stops.
    """
    if request.method == 'POST':
        name = get_form_value('name')
        description = get_form_value('description')
        start_date = get_form_value('start_date') or None
        end_date = get_form_value('end_date') or None

        if not name:
            flash('Trip name is required.', 'error')
            return render_template('trips/create.html')

        # Parse date strings to date objects
        try:
            start = parse_optional_date(start_date)
            end = parse_optional_date(end_date)
        except ValueError:
            flash('Invalid date format.', 'error')
            return render_template('trips/create.html')

        if start and end and end < start:
            flash('End date cannot be before start date.', 'error')
            return render_template('trips/create.html')

        trip = Trip(
            user_id=current_user.id,
            name=name,
            description=description,
            start_date=start,
            end_date=end
        )

        # Handle cover image upload
        cover = request.files.get('cover_image')
        if cover and cover.filename and allowed_file(cover.filename):
            filename = secure_filename(f"trip_{current_user.id}_{cover.filename}")
            upload_dir = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_dir, exist_ok=True)
            cover.save(os.path.join(upload_dir, filename))
            trip.cover_image = f"uploads/{filename}"

        db.session.add(trip)
        db.session.commit()

        flash(f'Trip "{name}" created! Now add your destinations.', 'success')
        return redirect(url_for('itinerary.builder', trip_id=trip.id))

    # GET — show list of popular cities for inspiration (dynamic data)
    popular_cities = City.query.order_by(City.popularity.desc()).limit(6).all()
    return render_template('trips/create.html', popular_cities=popular_cities)


@trips_bp.route('/<int:trip_id>')
@login_required
def view(trip_id):
    """View a single trip's full details including stops and budget summary."""
    trip = get_user_trip_or_404(trip_id)
    stops = trip.stops.all()
    return render_template('trips/view.html', trip=trip, stops=stops)


@trips_bp.route('/<int:trip_id>/edit', methods=['GET', 'POST'])
@login_required
def edit(trip_id):
    """Edit trip metadata (name, dates, description, cover image)."""
    trip = get_user_trip_or_404(trip_id)

    if request.method == 'POST':
        trip.name = get_form_value('name', trip.name)
        trip.description = get_form_value('description')

        start_date = get_form_value('start_date') or None
        end_date = get_form_value('end_date') or None

        try:
            trip.start_date = parse_optional_date(start_date)
            trip.end_date = parse_optional_date(end_date)
        except ValueError:
            flash('Invalid date format.', 'error')
            return render_template('trips/create.html', trip=trip, editing=True)

        # Handle new cover image
        cover = request.files.get('cover_image')
        if cover and cover.filename and allowed_file(cover.filename):
            filename = secure_filename(f"trip_{current_user.id}_{cover.filename}")
            upload_dir = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_dir, exist_ok=True)
            cover.save(os.path.join(upload_dir, filename))
            trip.cover_image = f"uploads/{filename}"

        db.session.commit()
        flash('Trip updated.', 'success')
        return redirect(url_for('trips.view', trip_id=trip.id))

    return render_template('trips/create.html', trip=trip, editing=True)


@trips_bp.route('/<int:trip_id>/delete', methods=['POST'])
@login_required
def delete(trip_id):
    """
    Delete a trip and all related data (cascade).
    POST-only to prevent accidental deletion via GET requests.
    """
    trip = get_user_trip_or_404(trip_id)
    trip_name = trip.name
    db.session.delete(trip)
    db.session.commit()
    flash(f'Trip "{trip_name}" deleted.', 'info')
    return redirect(url_for('trips.list_trips'))
