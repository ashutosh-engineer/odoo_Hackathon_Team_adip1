"""
Traveloop — Application Factory
---------------------------------
Entry point for the Flask application. Uses the factory pattern so
the app can be created with different configs (dev, test, prod).

Startup sequence:
1. Create Flask instance (pointing to frontend/ for templates & static)
2. Load config
3. Initialize database and login manager
4. Register all route blueprints
5. Apply security headers and error handlers
6. Create tables and seed data only when explicitly enabled

Why factory pattern?
- Standard Flask practice for anything beyond a toy project
- Enables testing with a separate database
- Keeps global state clean

Why separate frontend/ and backend/?
- Clear separation of concerns (designers touch frontend, devs touch backend)
- Follows modular thinking
- Easier to reason about the codebase during maintenance
"""

import logging
import os
from flask import Flask
from backend.config import get_config_class
from backend.models import db, login_manager
from backend.routes import register_routes
from backend.seed import seed_database
from backend.security import register_error_handlers, register_security

# Paths to the frontend directory (relative to project root)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')


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

    # Ensure the upload directory exists inside frontend/static/uploads
    upload_dir = os.path.join(STATIC_DIR, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_dir

    # Bind extensions to this app instance
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'

    # Security helpers are registered before blueprints so every response
    # gets consistent headers and every failure path stays predictable.
    register_security(app)

    # Register all route blueprints (modular, one per feature domain)
    register_routes(app)
    register_error_handlers(app)

    # Create database tables and seed data only when the environment allows it.
    with app.app_context():
        # Import all models so SQLAlchemy knows about them
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
