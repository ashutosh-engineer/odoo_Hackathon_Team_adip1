"""
Itinerary Routes
-----------------
The core trip-building experience — adding stops (cities), scheduling
activities within each stop, and reordering the journey.

This is the most interactive part of the app. Routes serve both
full page renders and JSON responses for AJAX operations (add/remove/reorder).

Why AJAX for some operations?
- Adding a stop shouldn't reload the entire page
- Reordering cities should be instant (drag-and-drop feel)
- The builder page stays responsive as the itinerary grows
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from backend.models import db
from backend.models.trip import Trip
from backend.models.city import City
from backend.models.activity import Activity
from backend.models.itinerary import Stop, StopActivity
from backend.helpers import (
    get_json_or_form_payload,
    get_json_or_form_value,
    get_owned_stop_or_404,
    get_owned_trip_or_404,
    parse_int_list,
    parse_optional_date,
    parse_optional_int,
)

itinerary_bp = Blueprint('itinerary', __name__)


def get_user_trip(trip_id):
    """Fetch trip with ownership check — reused across itinerary routes."""
    return get_owned_trip_or_404(trip_id, current_user.id)


@itinerary_bp.route('/<int:trip_id>/builder')
@login_required
def builder(trip_id):
    """
    Render the itinerary builder — the main planning workspace.
    Shows current stops with their activities, plus a city search panel.
    """
    trip = get_user_trip(trip_id)
    stops = trip.stops.all()

    # Preload cities for the search/add panel (dynamic from DB)
    cities = City.query.order_by(City.popularity.desc()).all()

    return render_template(
        'itinerary/builder.html',
        trip=trip,
        stops=stops,
        cities=cities
    )


@itinerary_bp.route('/<int:trip_id>/view')
@login_required
def view(trip_id):
    """
    Read-only itinerary view — structured day-by-day layout.
    Used for reviewing the plan after building it.
    """
    trip = get_user_trip(trip_id)
    stops = trip.stops.all()
    return render_template('itinerary/view.html', trip=trip, stops=stops)


@itinerary_bp.route('/<int:trip_id>/add-stop', methods=['POST'])
@login_required
def add_stop(trip_id):
    """
    Add a city as a new stop in the itinerary.
    Accepts both form POST and JSON (for AJAX).
    Auto-assigns order_index based on existing stops count.
    """
    trip = get_user_trip(trip_id)

    # Support both form data and JSON requests
    data = get_json_or_form_payload()
    city_id = data.get('city_id')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')

    if not city_id:
        if request.is_json:
            return jsonify({'error': 'City is required'}), 400
        flash('Please select a city.', 'error')
        return redirect(url_for('itinerary.builder', trip_id=trip_id))

    city = City.query.get_or_404(parse_optional_int(city_id))

    # Parse optional dates
    try:
        start_date = parse_optional_date(start_date_str)
        end_date = parse_optional_date(end_date_str)
    except ValueError:
        if request.is_json:
            return jsonify({'error': 'Invalid date format'}), 400
        flash('Invalid date format.', 'error')
        return redirect(url_for('itinerary.builder', trip_id=trip_id))

    # Auto-assign order based on current stop count
    current_count = trip.stops.count()

    stop = Stop(
        trip_id=trip.id,
        city_id=city.id,
        order_index=current_count,
        start_date=start_date,
        end_date=end_date
    )
    db.session.add(stop)

    # Increment city popularity — used for dynamic recommendations
    city.popularity += 1
    db.session.commit()

    if request.is_json:
        return jsonify({
            'success': True,
            'stop_id': stop.id,
            'city_name': city.name,
            'city_country': city.country,
            'city_image': city.image_url,
            'order_index': stop.order_index
        })

    flash(f'{city.name} added to your trip!', 'success')
    return redirect(url_for('itinerary.builder', trip_id=trip_id))


@itinerary_bp.route('/<int:trip_id>/remove-stop/<int:stop_id>', methods=['POST'])
@login_required
def remove_stop(trip_id, stop_id):
    """Remove a stop from the itinerary. Cascade deletes its activities too."""
    trip = get_user_trip(trip_id)
    stop = Stop.query.filter_by(id=stop_id, trip_id=trip.id).first_or_404()

    db.session.delete(stop)

    # Re-index remaining stops to keep order sequential
    remaining = Stop.query.filter_by(trip_id=trip.id).order_by(Stop.order_index).all()
    for idx, s in enumerate(remaining):
        s.order_index = idx

    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('Stop removed from itinerary.', 'info')
    return redirect(url_for('itinerary.builder', trip_id=trip_id))


@itinerary_bp.route('/<int:trip_id>/reorder-stops', methods=['POST'])
@login_required
def reorder_stops(trip_id):
    """
    Update stop order based on drag-and-drop interaction.
    Expects JSON: { "order": [stop_id_1, stop_id_2, ...] }
    """
    trip = get_user_trip(trip_id)
    data = get_json_or_form_payload()
    order = parse_int_list(data.get('order', []))

    for idx, stop_id in enumerate(order):
        stop = Stop.query.filter_by(id=stop_id, trip_id=trip.id).first()
        if stop:
            stop.order_index = idx

    db.session.commit()
    return jsonify({'success': True})


@itinerary_bp.route('/stop/<int:stop_id>/add-activity', methods=['POST'])
@login_required
def add_activity_to_stop(stop_id):
    """
    Schedule an activity at a specific stop on a specific day.
    Links the global Activity catalog to the user's personal itinerary.
    """
    stop = Stop.query.get_or_404(stop_id)
    trip = get_owned_trip_or_404(stop.trip_id, current_user.id)

    data = get_json_or_form_payload()
    activity_id = data.get('activity_id')
    day_number = data.get('day_number', 1)
    start_time = data.get('start_time')

    if not activity_id:
        if request.is_json:
            return jsonify({'error': 'Activity is required'}), 400
        flash('Please select an activity.', 'error')
        return redirect(url_for('itinerary.builder', trip_id=trip.id))

    activity = Activity.query.get_or_404(parse_optional_int(activity_id))

    stop_activity = StopActivity(
        stop_id=stop.id,
        activity_id=activity.id,
        day_number=parse_optional_int(day_number) or 1,
        start_time=start_time
    )
    db.session.add(stop_activity)
    db.session.commit()

    if request.is_json:
        return jsonify({
            'success': True,
            'stop_activity_id': stop_activity.id,
            'activity_name': activity.name,
            'activity_cost': activity.cost,
            'activity_duration': activity.duration_hours,
            'day_number': stop_activity.day_number
        })

    flash(f'"{activity.name}" added to your schedule.', 'success')
    return redirect(url_for('itinerary.builder', trip_id=trip.id))


@itinerary_bp.route('/stop/<int:stop_id>/remove-activity/<int:sa_id>', methods=['POST'])
@login_required
def remove_activity_from_stop(stop_id, sa_id):
    """Remove a scheduled activity from a stop."""
    stop = get_owned_stop_or_404(stop_id, trip_id=Stop.query.get_or_404(stop_id).trip_id)
    get_owned_trip_or_404(stop.trip_id, current_user.id)

    sa = StopActivity.query.filter_by(id=sa_id, stop_id=stop.id).first_or_404()
    db.session.delete(sa)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    return redirect(url_for('itinerary.builder', trip_id=stop.trip_id))


@itinerary_bp.route('/stop/<int:stop_id>/update-dates', methods=['POST'])
@login_required
def update_stop_dates(stop_id):
    """Update the date range for a specific stop."""
    stop = get_owned_stop_or_404(stop_id, trip_id=Stop.query.get_or_404(stop_id).trip_id)
    get_owned_trip_or_404(stop.trip_id, current_user.id)

    try:
        payload = get_json_or_form_payload()
        start_str = get_json_or_form_value('start_date', payload.get('start_date'))
        end_str = get_json_or_form_value('end_date', payload.get('end_date'))
        stop.start_date = parse_optional_date(start_str)
        stop.end_date = parse_optional_date(end_str)
    except (ValueError, TypeError):
        if request.is_json:
            return jsonify({'error': 'Invalid date format'}), 400
        flash('Invalid date format.', 'error')
        return redirect(url_for('itinerary.builder', trip_id=stop.trip_id))

    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})
    return redirect(url_for('itinerary.builder', trip_id=stop.trip_id))
