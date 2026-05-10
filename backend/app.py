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
5. Create tables and seed data on first run

Why factory pattern?
- Standard Flask practice for anything beyond a toy project
- Enables testing with a separate database
- Keeps global state clean

Why separate frontend/ and backend/?
- Clear separation of concerns (designers touch frontend, devs touch backend)
- Follows Odoo-style modular thinking
- Easier to reason about the codebase during hackathon
"""

import os
from flask import Flask
from backend.config import Config
from backend.models import db, login_manager
from backend.routes import register_routes
from backend.seed import seed_database

# Paths to the frontend directory (relative to project root)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')


def create_app(config_class=Config):
    """
    Build and configure the Flask application.
    Templates and static assets are served from the frontend/ directory,
    keeping UI and backend logic cleanly separated.
    """
    app = Flask(
        __name__,
        template_folder=TEMPLATE_DIR,
        static_folder=STATIC_DIR
    )
    app.config.from_object(config_class)

    # Ensure the upload directory exists inside frontend/static/uploads
    upload_dir = os.path.join(STATIC_DIR, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_dir

    # Bind extensions to this app instance
    db.init_app(app)
    login_manager.init_app(app)

    # Register all route blueprints (modular, one per feature domain)
    register_routes(app)

    # Create database tables on first run and seed with initial data
    with app.app_context():
        # Import all models so SQLAlchemy knows about them
        from backend.models.user import User
        from backend.models.trip import Trip, TripExpense
        from backend.models.city import City
        from backend.models.activity import Activity
        from backend.models.itinerary import Stop, StopActivity
        from backend.models.packing import PackingItem, TripNote

        db.create_all()
        seed_database()

    return app
