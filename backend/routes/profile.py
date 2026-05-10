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
from backend.models.itinerary import Stop
from backend.models.trip import Trip
from backend.forms import ProfileUpdateForm, ChangePasswordForm

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/')
@login_required
def settings():
    visited_city_ids = (
        db.session.query(Stop.city_id)
        .join(Trip, Stop.trip_id == Trip.id)
        .filter(Trip.user_id == current_user.id)
        .distinct()
        .all()
    )
    visited_cities = City.query.filter(City.id.in_([c[0] for c in visited_city_ids])).all()

    profile_form = ProfileUpdateForm(obj=current_user)
    password_form = ChangePasswordForm()

    return render_template(
        'profile/settings.html',
        visited_cities=visited_cities,
        profile_form=profile_form,
        password_form=password_form
    )


@profile_bp.route('/update', methods=['POST'])
@login_required
def update():
    form = ProfileUpdateForm()
    if form.validate_on_submit():
        # Check if email is taken by another user
        existing = User.query.filter(User.email == form.email.data.lower(), User.id != current_user.id).first()
        if existing:
            flash('This email is already in use.', 'error')
            return redirect(url_for('profile.settings'))

        current_user.name = form.name.data
        current_user.email = form.email.data.lower()
        db.session.commit()
        flash('Profile updated.', 'success')
    else:
        for error in form.errors.values():
            flash(error[0], 'error')

    return redirect(url_for('profile.settings'))


@profile_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    if form.validate_on_submit():
        if not current_user.check_password(form.old_password.data):
            flash('Current password is incorrect.', 'error')
            return redirect(url_for('profile.settings'))

        current_user.set_password(form.new_password.data)
        db.session.commit()
        flash('Password changed successfully.', 'success')
    else:
        for error in form.errors.values():
            flash(error[0], 'error')

    return redirect(url_for('profile.settings'))


@profile_bp.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    """
    Permanently delete the user account and all associated data.
    Requires password confirmation as a safety measure.
    """
    password = get_form_value('password', strip=False)

    if not current_user.check_password(password):
        flash('Incorrect password. Account not deleted.', 'error')
        return redirect(url_for('profile.settings'))

    user = User.query.get(current_user.id)
    logout_user()
    db.session.delete(user)
    db.session.commit()

    flash('Your account has been permanently deleted.', 'info')
    return redirect(url_for('auth.login'))
