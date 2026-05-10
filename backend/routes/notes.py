"""
Trip Notes / Journal Routes
-----------------------------
Free-form note-taking tied to trips or specific stops.
Sorted by creation date (newest first) for a journal-like experience.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from backend.models import db
from backend.models.trip import Trip
from backend.models.packing import TripNote
from backend.models.itinerary import Stop
from backend.helpers import get_form_value, parse_optional_int

notes_bp = Blueprint('notes', __name__)


@notes_bp.route('/<int:trip_id>')
@login_required
def journal(trip_id):
    """Display all notes for a trip, optionally filtered by stop."""
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    stop_filter = request.args.get('stop_id', type=int)

    notes_query = TripNote.query.filter_by(trip_id=trip.id)
    if stop_filter:
        notes_query = notes_query.filter_by(stop_id=stop_filter)

    notes = notes_query.order_by(TripNote.created_at.desc()).all()
    stops = trip.stops.all()

    return render_template(
        'notes/journal.html',
        trip=trip,
        notes=notes,
        stops=stops,
        selected_stop=stop_filter
    )


@notes_bp.route('/<int:trip_id>/add', methods=['POST'])
@login_required
def add_note(trip_id):
    """Create a new note, optionally tied to a specific stop."""
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    content = get_form_value('content')
    stop_id = parse_optional_int(request.form.get('stop_id'))

    if not content:
        flash('Note content cannot be empty.', 'error')
        return redirect(url_for('notes.journal', trip_id=trip_id))

    # Validate stop belongs to this trip if specified
    if stop_id:
        Stop.query.filter_by(id=stop_id, trip_id=trip.id).first_or_404()

    note = TripNote(
        trip_id=trip.id,
        stop_id=stop_id if stop_id else None,
        content=content
    )
    db.session.add(note)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True, 'note_id': note.id})

    flash('Note saved.', 'success')
    return redirect(url_for('notes.journal', trip_id=trip_id))


@notes_bp.route('/<int:trip_id>/edit/<int:note_id>', methods=['POST'])
@login_required
def edit_note(trip_id, note_id):
    """Update a note's content."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    note = TripNote.query.filter_by(id=note_id, trip_id=trip_id).first_or_404()

    content = get_form_value('content')
    if not content:
        flash('Note content cannot be empty.', 'error')
        return redirect(url_for('notes.journal', trip_id=trip_id))

    note.content = content
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('Note updated.', 'success')
    return redirect(url_for('notes.journal', trip_id=trip_id))


@notes_bp.route('/<int:trip_id>/delete/<int:note_id>', methods=['POST'])
@login_required
def delete_note(trip_id, note_id):
    """Delete a note permanently."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    note = TripNote.query.filter_by(id=note_id, trip_id=trip_id).first_or_404()

    db.session.delete(note)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('Note deleted.', 'info')
    return redirect(url_for('notes.journal', trip_id=trip_id))
