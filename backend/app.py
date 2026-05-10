"""
Traveloop application factory.

Builds the Flask app, loads the active config, registers blueprints,
and applies security and initialization hooks.
"""

import logging
import os
from flask import Flask
from flask_wtf import CSRFProtect
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from backend.config import get_config_class
from backend.models import db, login_manager
from backend.routes import register_routes
from backend.seed import seed_database
from backend.security import register_error_handlers, register_security

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')
csrf = CSRFProtect()
session_handler = Session()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])


def _configure_logging(app):
    """Apply a predictable logging setup for local and deployed runs."""
    log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
    if not app.logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(log_level)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s [%(name)s] %(message)s'
        ))
        app.logger.addHandler(handler)

    app.logger.setLevel(log_level)


def create_app(config_class=None):
    """
    Build and configure the Flask application.
    Templates and static assets are served from the frontend/ directory,
    keeping UI and backend logic cleanly separated.
    """
    config_class = config_class or get_config_class()

    app = Flask(
        __name__,
        template_folder=TEMPLATE_DIR,
        static_folder=STATIC_DIR
    )
    app.config.from_object(config_class)
    _configure_logging(app)

    upload_dir = os.path.join(STATIC_DIR, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_dir

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'
    
    session_handler.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)
    
    register_security(app)
    register_routes(app)
    register_error_handlers(app)

    with app.app_context():
        from backend.models.user import User
        from backend.models.trip import Trip, TripExpense
        from backend.models.city import City
        from backend.models.activity import Activity
        from backend.models.itinerary import Stop, StopActivity
        from backend.models.packing import PackingItem, TripNote

        if app.config.get('AUTO_CREATE_DB'):
            db.create_all()

        if app.config.get('AUTO_SEED_DATA'):
            seed_database()

    return app

