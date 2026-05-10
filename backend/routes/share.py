"""
Share / Public Itinerary Routes
--------------------------------
Generates shareable links for trips so non-logged-in users can view them.

How it works:
1. Trip owner clicks "Share" → generates a unique URL-safe token
2. Anyone with the link can view the itinerary (no login required)
3. View is read-only — no editing, no personal data exposed
4. Owner can revoke sharing by toggling is_public off

Security: tokens are 32-byte URL-safe strings (via secrets module),
practically impossible to guess (2^256 combinations).
"""

from flask import Blueprint, render_template, redirect, url_for, flash, jsonify, request
from flask_login import login_required, current_user
from backend.models import db
from backend.models.trip import Trip
from backend.helpers import get_owned_trip_or_404

share_bp = Blueprint('share', __name__)


@share_bp.route('/trip/<int:trip_id>/generate', methods=['POST'])
@login_required
def generate_link(trip_id):
    """Generate a shareable link for a trip."""
    trip = get_owned_trip_or_404(trip_id, current_user.id)

    token = trip.generate_share_token()
    db.session.commit()

    share_url = url_for('share.public_view', token=token, _external=True)

    if request.is_json:
        return jsonify({'success': True, 'share_url': share_url, 'token': token})

    flash('Share link generated! Anyone with the link can view your trip.', 'success')
    return redirect(url_for('trips.view', trip_id=trip_id))


@share_bp.route('/trip/<int:trip_id>/revoke', methods=['POST'])
@login_required
def revoke_link(trip_id):
    """Revoke public access to a shared trip."""
    trip = get_owned_trip_or_404(trip_id, current_user.id)

    trip.is_public = False
    trip.share_token = None
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('Share link revoked. Your trip is now private.', 'info')
    return redirect(url_for('trips.view', trip_id=trip_id))


@share_bp.route('/<token>')
def public_view(token):
    """
    Public itinerary view — accessible without login.
    Shows trip overview, stops, activities, and budget summary.
    No personal data (email, etc.) is exposed.
    """
    trip = Trip.query.filter_by(share_token=token, is_public=True).first_or_404()
    stops = trip.stops.all()

    return render_template('trips/shared.html', trip=trip, stops=stops)
