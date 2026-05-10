"""
Budget & Cost Breakdown Routes
-------------------------------
Financial overview for a trip — shows estimated costs broken down by
category, with visual indicators for budget tracking.

Cost data comes from two sources:
1. StopActivity costs (automatically calculated from activity catalog)
2. Manual TripExpense entries (user-added for transport, accommodation, etc.)

This dual approach lets users see both structured and custom costs.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from backend.models import db
from backend.models.trip import Trip, TripExpense
from backend.models.itinerary import Stop, StopActivity

budget_bp = Blueprint('budget', __name__)


@budget_bp.route('/<int:trip_id>')
@login_required
def breakdown(trip_id):
    """
    Render the full budget breakdown for a trip.
    Calculates costs from both activity schedule and manual expenses.
    """
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    # Calculate activity-based costs (from scheduled activities in itinerary)
    activity_costs = _calculate_activity_costs(trip)

    # Get manual expenses added by the user
    manual_expenses = TripExpense.query.filter_by(trip_id=trip.id).all()

    # Aggregate by category for the chart
    category_totals = {}
    for exp in manual_expenses:
        category_totals[exp.category] = category_totals.get(exp.category, 0) + exp.amount

    # Add activity costs under 'activities' category
    if activity_costs['total'] > 0:
        category_totals['activities'] = category_totals.get('activities', 0) + activity_costs['total']

    grand_total = sum(category_totals.values())

    # Per-day average (useful for budget planning)
    avg_per_day = 0
    if trip.duration_days and trip.duration_days > 0:
        avg_per_day = round(grand_total / trip.duration_days, 2)

    return render_template(
        'budget/breakdown.html',
        trip=trip,
        activity_costs=activity_costs,
        manual_expenses=manual_expenses,
        category_totals=category_totals,
        grand_total=round(grand_total, 2),
        avg_per_day=avg_per_day
    )


@budget_bp.route('/<int:trip_id>/add-expense', methods=['POST'])
@login_required
def add_expense(trip_id):
    """Add a manual expense entry to the trip budget."""
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    category = request.form.get('category', 'other').strip()
    description = request.form.get('description', '').strip()
    amount = request.form.get('amount', type=float)

    if not amount or amount <= 0:
        if request.is_json:
            return jsonify({'error': 'Valid amount is required'}), 400
        flash('Please enter a valid amount.', 'error')
        return redirect(url_for('budget.breakdown', trip_id=trip_id))

    expense = TripExpense(
        trip_id=trip.id,
        category=category,
        description=description,
        amount=amount
    )
    db.session.add(expense)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True, 'expense_id': expense.id})

    flash('Expense added.', 'success')
    return redirect(url_for('budget.breakdown', trip_id=trip_id))


@budget_bp.route('/<int:trip_id>/remove-expense/<int:expense_id>', methods=['POST'])
@login_required
def remove_expense(trip_id, expense_id):
    """Delete a manual expense entry."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    expense = TripExpense.query.filter_by(id=expense_id, trip_id=trip_id).first_or_404()

    db.session.delete(expense)
    db.session.commit()

    if request.is_json:
        return jsonify({'success': True})

    flash('Expense removed.', 'info')
    return redirect(url_for('budget.breakdown', trip_id=trip_id))


def _calculate_activity_costs(trip):
    """
    Sum up costs from all scheduled activities across all stops.
    Returns a breakdown by stop for detailed display.
    """
    stops = trip.stops.all()
    by_stop = []
    total = 0

    for stop in stops:
        stop_total = 0
        activities = stop.activities.all()
        for sa in activities:
            if sa.activity:
                stop_total += sa.activity.cost
        by_stop.append({
            'city': stop.city.name if stop.city else 'Unknown',
            'cost': round(stop_total, 2),
            'activity_count': len(activities)
        })
        total += stop_total

    return {'by_stop': by_stop, 'total': round(total, 2)}
