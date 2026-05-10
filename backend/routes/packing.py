"""
Packing checklist routes.

Manages per-trip checklist items and packed/unpacked state.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from backend.models import db
from backend.models.trip import Trip
from backend.models.packing import PackingItem
from backend.helpers import get_form_value

packing_bp = Blueprint('packing', __name__)

PACKING_CATEGORIES = ['clothing', 'documents', 'electronics', 'toiletries', 'medicine', 'other']


@packing_bp.route('/<int:trip_id>')
@login_required
def checklist(trip_id):
    """
    Render the packing checklist grouped by category.
    Shows progress (packed vs total items).
    """
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    items = PackingItem.query.filter_by(trip_id=trip.id).order_by(PackingItem.category).all()

    # Group items by category for organized display
    grouped = {}
    for item in items:
        cat = item.category or 'other'
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(item)

    total = len(items)
    packed = sum(1 for i in items if i.is_packed)

    return render_template(
        'packing/checklist.html',
        trip=trip,
        grouped_items=grouped,
        categories=PACKING_CATEGORIES,
        total=total,
        packed=packed
    )


@packing_bp.route('/<int:trip_id>/add', methods=['POST'])
@login_required
def add_item(trip_id):
    """Add a new item to the packing list."""
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    name = get_form_value('name')
    category = get_form_value('category', 'other')

    if not name:
        if request.is_json:
            return jsonify({'error': 'Item name is required'}), 400
        flash('Please enter an item name.', 'error')
        return redirect(url_for('packing.checklist', trip_id=trip_id))

    item = PackingItem(trip_id=trip.id, name=name, category=category)
    db.session.add(item)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True, 'item_id': item.id, 'name': item.name, 'category': item.category})

    return redirect(url_for('packing.checklist', trip_id=trip_id))


@packing_bp.route('/<int:trip_id>/toggle/<int:item_id>', methods=['POST'])
@login_required
def toggle_item(trip_id, item_id):
    """Toggle the packed/unpacked status of an item."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    item = PackingItem.query.filter_by(id=item_id, trip_id=trip_id).first_or_404()

    item.is_packed = not item.is_packed
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True, 'is_packed': item.is_packed})

    return redirect(url_for('packing.checklist', trip_id=trip_id))


@packing_bp.route('/<int:trip_id>/remove/<int:item_id>', methods=['POST'])
@login_required
def remove_item(trip_id, item_id):
    """Remove an item from the packing list."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    item = PackingItem.query.filter_by(id=item_id, trip_id=trip_id).first_or_404()

    db.session.delete(item)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    return redirect(url_for('packing.checklist', trip_id=trip_id))


@packing_bp.route('/<int:trip_id>/reset', methods=['POST'])
@login_required
def reset_checklist(trip_id):
    """Unpack all items — useful for re-using the list on a new trip."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    PackingItem.query.filter_by(trip_id=trip_id).update({'is_packed': False})
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('All items unpacked.', 'info')
    return redirect(url_for('packing.checklist', trip_id=trip_id))
