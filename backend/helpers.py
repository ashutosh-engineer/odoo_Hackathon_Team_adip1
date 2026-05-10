"""
Backend helpers.

Shared request-validation, pagination, and ownership helpers used by
multiple blueprints.
"""

from datetime import date

from flask import flash, redirect, request, url_for

from backend.models import db
from backend.models.trip import Trip, TripExpense
from backend.models.itinerary import Stop
from backend.models.packing import PackingItem, TripNote


def get_form_value(name, default='', strip=True):
    """Read a form value with consistent trimming semantics."""
    value = request.form.get(name, default)
    if value is None:
        return default
    return value.strip() if strip and isinstance(value, str) else value


def get_json_or_form_value(name, default=None):
    """Read from JSON first, then fall back to form data."""
    if request.is_json:
        payload = request.get_json(silent=True) or {}
        if name in payload:
            return payload.get(name, default)
    return request.form.get(name, default)


def get_json_or_form_payload():
    """Return the active request payload as a dictionary when possible."""
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form


def parse_optional_date(value):
    """Parse an ISO date string or return None for empty input."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def parse_optional_int(value):
    """Parse an integer or return None when missing/invalid."""
    if value in (None, '', []):
        return None
    return int(value)


def parse_int_list(values):
    """Parse a list of integers and skip empty items."""
    if not values:
        return []
    return [int(value) for value in values if value not in (None, '', [])]


def get_pagination_params(default_per_page=20, max_per_page=50):
    """Read page and page-size query parameters with safe bounds."""
    page = request.args.get('page', default=1, type=int) or 1
    per_page = request.args.get('per_page', default=default_per_page, type=int) or default_per_page
    page = max(page, 1)
    per_page = max(1, min(per_page, max_per_page))
    return page, per_page


def paginate_query(query, page=None, per_page=None, default_per_page=20, max_per_page=50):
    """Paginate a SQLAlchemy query using bounded request parameters."""
    page = page or request.args.get('page', default=1, type=int) or 1
    per_page = per_page or request.args.get('per_page', default=default_per_page, type=int) or default_per_page
    page = max(page, 1)
    per_page = max(1, min(per_page, max_per_page))
    return db.paginate(query, page=page, per_page=per_page, error_out=False)


def get_owned_trip_or_404(trip_id, user_id):
    """Load a trip owned by the active user."""
    return Trip.query.filter_by(id=trip_id, user_id=user_id).first_or_404()


def get_owned_stop_or_404(stop_id, trip_id):
    """Load a stop that belongs to the given trip."""
    return Stop.query.filter_by(id=stop_id, trip_id=trip_id).first_or_404()


def get_owned_expense_or_404(expense_id, trip_id):
    """Load a trip expense that belongs to the given trip."""
    return TripExpense.query.filter_by(id=expense_id, trip_id=trip_id).first_or_404()


def get_owned_note_or_404(note_id, trip_id):
    """Load a trip note that belongs to the given trip."""
    return TripNote.query.filter_by(id=note_id, trip_id=trip_id).first_or_404()


def get_owned_packing_item_or_404(item_id, trip_id):
    """Load a packing item that belongs to the given trip."""
    return PackingItem.query.filter_by(id=item_id, trip_id=trip_id).first_or_404()


def flash_and_redirect(message, category, endpoint, **values):
    """Flash a message and redirect in one step to reduce boilerplate."""
    flash(message, category)
    return redirect(url_for(endpoint, **values))
