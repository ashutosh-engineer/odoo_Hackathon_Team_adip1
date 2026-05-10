"""
Authentication Routes (HTML blueprint)
---------------------------------------
The React SPA handles all auth UI. These routes simply redirect
browser requests to the correct SPA pages so old bookmarks / links work.

All actual auth logic lives in /api/auth/* (backend/routes/api.py).
"""

from flask import Blueprint, redirect, url_for
from flask_login import logout_user, login_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login')
@auth_bp.route('/login/')
def login():
    """Redirect legacy /login to the React SPA login page."""
    return redirect('/#/login' if False else '/login', code=302)


@auth_bp.route('/signup')
@auth_bp.route('/signup/')
def signup():
    """Redirect legacy /signup to the React SPA signup page."""
    return redirect('/signup', code=302)


@auth_bp.route('/logout')
@auth_bp.route('/logout/')
def logout():
    """
    Handle direct browser navigation to /logout.
    Clears the server session and redirects to the SPA login page.
    """
    logout_user()
    return redirect('/login', code=302)
