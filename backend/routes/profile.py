"""
User Profile & Settings Routes
--------------------------------
Account management: update name, email, password, and preferences.
Also handles account deletion (with confirmation).
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user, logout_user
from backend.models import db
from backend.models.user import User
from backend.models.city import City

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/')
@login_required
def settings():
    """Render the profile/settings page with current user data."""
    # Saved destinations — cities the user has visited (from their trips)
    from models.itinerary import Stop
    from models.trip import Trip

    visited_city_ids = (
        db.session.query(Stop.city_id)
        .join(Trip, Stop.trip_id == Trip.id)
        .filter(Trip.user_id == current_user.id)
        .distinct()
        .all()
    )
    visited_cities = City.query.filter(City.id.in_([c[0] for c in visited_city_ids])).all()

    return render_template(
        'profile/settings.html',
        visited_cities=visited_cities
    )


@profile_bp.route('/update', methods=['POST'])
@login_required
def update():
    """Update profile information (name, email)."""
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()

    errors = []
    if not name or len(name) < 2:
        errors.append('Name must be at least 2 characters.')
    if not email or '@' not in email:
        errors.append('Please enter a valid email.')

    # Check if email is taken by another user
    existing = User.query.filter(User.email == email, User.id != current_user.id).first()
    if existing:
        errors.append('This email is already in use.')

    if errors:
        for err in errors:
            flash(err, 'error')
        return redirect(url_for('profile.settings'))

    current_user.name = name
    current_user.email = email
    db.session.commit()

    flash('Profile updated.', 'success')
    return redirect(url_for('profile.settings'))


@profile_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change password — requires current password for verification."""
    current_pw = request.form.get('current_password', '')
    new_pw = request.form.get('new_password', '')
    confirm_pw = request.form.get('confirm_password', '')

    if not current_user.check_password(current_pw):
        flash('Current password is incorrect.', 'error')
        return redirect(url_for('profile.settings'))

    if len(new_pw) < 6:
        flash('New password must be at least 6 characters.', 'error')
        return redirect(url_for('profile.settings'))

    if new_pw != confirm_pw:
        flash('New passwords do not match.', 'error')
        return redirect(url_for('profile.settings'))

    current_user.set_password(new_pw)
    db.session.commit()

    flash('Password changed successfully.', 'success')
    return redirect(url_for('profile.settings'))


@profile_bp.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    """
    Permanently delete the user account and all associated data.
    Requires password confirmation as a safety measure.
    """
    password = request.form.get('password', '')

    if not current_user.check_password(password):
        flash('Incorrect password. Account not deleted.', 'error')
        return redirect(url_for('profile.settings'))

    user = User.query.get(current_user.id)
    logout_user()
    db.session.delete(user)
    db.session.commit()

    flash('Your account has been permanently deleted.', 'info')
    return redirect(url_for('auth.login'))
