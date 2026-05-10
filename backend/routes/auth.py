"""
Authentication Routes
---------------------
Handles user registration, login, and logout.

Security approach:
- Passwords hashed via Werkzeug's scrypt (default in modern versions)
- Session-based auth (server-side, not JWT) — simpler and more secure for
    server-rendered apps since tokens aren't exposed to JavaScript
- Email uniqueness enforced at DB level (unique constraint)
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from backend.models import db
from backend.models.user import User
from backend.forms import LoginForm, RegistrationForm
from backend.security import is_safe_redirect_target

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower()).first()

        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')
            if not is_safe_redirect_target(next_page):
                next_page = None
            return redirect(next_page or url_for('dashboard.home'))

        flash('Invalid email or password.', 'error')

    return render_template('auth/login.html', form=form)


@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(name=form.name.data, email=form.email.data.lower())
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()

        login_user(user, remember=True)
        flash('Welcome to Traveloop! Start planning your first trip.', 'success')
        return redirect(url_for('dashboard.home'))

    return render_template('auth/signup.html', form=form)


@auth_bp.route('/logout')
@login_required
def logout():
    """Clear the session and redirect to login."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))
