"""
Authentication Routes
---------------------
Handles user registration, login, and logout.

Security approach:
- Passwords hashed via Werkzeug's scrypt (default in modern versions)
- CSRF tokens on all forms via Flask-WTF
- Session-based auth (server-side, not JWT) — simpler and more secure for
  server-rendered apps since tokens aren't exposed to JavaScript
- Email uniqueness enforced at DB level (unique constraint)
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from backend.models import db
from backend.models.user import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Login page — GET renders form, POST validates credentials.
    Redirects to dashboard on success, re-renders with error on failure.
    """
    # Already logged in? Go straight to dashboard
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        # Look up user by email — indexed column, fast lookup
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            # remember=True keeps session alive across browser restarts
            login_user(user, remember=True)
            # Redirect to the page they originally wanted, or dashboard
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard.home'))

        # Intentionally vague error — don't reveal if email exists
        flash('Invalid email or password.', 'error')

    return render_template('auth/login.html')


@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    """
    Registration page — creates a new user account.
    Validates: non-empty name, valid email format, password length, email uniqueness.
    """
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')

        # Server-side validation — never trust the client
        errors = []
        if not name or len(name) < 2:
            errors.append('Name must be at least 2 characters.')
        if not email or '@' not in email:
            errors.append('Please enter a valid email address.')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if password != confirm:
            errors.append('Passwords do not match.')
        if User.query.filter_by(email=email).first():
            errors.append('An account with this email already exists.')

        if errors:
            for err in errors:
                flash(err, 'error')
            return render_template('auth/signup.html', name=name, email=email)

        # All checks passed — create the account
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Log them in immediately after signup (no need for a separate login step)
        login_user(user, remember=True)
        flash('Welcome to Traveloop! Start planning your first trip.', 'success')
        return redirect(url_for('dashboard.home'))

    return render_template('auth/signup.html')


@auth_bp.route('/logout')
@login_required
def logout():
    """Clear the session and redirect to login."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))
