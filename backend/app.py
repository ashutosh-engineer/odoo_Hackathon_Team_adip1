"""
Traveloop application factory.

Builds the Flask app, loads the active config, registers blueprints,
and applies security and initialization hooks.
"""

import logging
import os
from flask import Flask
from backend.config import get_config_class
from backend.models import db, login_manager
from backend.extensions import csrf, session_handler, limiter
from backend.routes import register_routes
from backend.seed import seed_database
from backend.security import register_error_handlers, register_security

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
STATIC_DIR   = os.path.join(FRONTEND_DIR, 'static')


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
    Works with SQLite + filesystem sessions locally (no Redis/PostgreSQL needed).
    In production: PostgreSQL + Redis.
    """
    config_class = config_class or get_config_class()

    app = Flask(
        __name__,
        template_folder=TEMPLATE_DIR,
        static_folder=STATIC_DIR
    )
    app.config.from_object(config_class)

    # Apply dynamic session config (Redis if available, filesystem otherwise)
    if hasattr(config_class, '_session_config'):
        app.config.update(config_class._session_config())

    # Ensure filesystem session dir exists
    session_dir = app.config.get('SESSION_FILE_DIR')
    if session_dir:
        os.makedirs(session_dir, exist_ok=True)

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

    # Serve the React SPA for all non-API routes
    _register_spa_fallback(app)

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


def _register_spa_fallback(app):
    """
    Serve the built React SPA (frontend/dist/index.html) for every route
    that isn't an API call or a static file.  This lets React Router handle
    client-side navigation while Flask handles /api/* requests.
    """
    import os
    from flask import send_from_directory, send_file

    dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

    @app.route('/assets/<path:filename>')
    def spa_assets(filename):
        return send_from_directory(os.path.join(dist_dir, 'assets'), filename)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def spa_index(path):
        # Let /api/* and /static/* fall through to their own handlers
        if path.startswith('api/') or path.startswith('static/'):
            from flask import abort
            abort(404)
        index = os.path.join(dist_dir, 'index.html')
        if os.path.exists(index):
            return send_file(index)
        # Dev mode: no dist yet — return a helpful message
        return (
            '<h2>Frontend not built.</h2>'
            '<p>Run <code>cd frontend && npm run build</code> first, '
            'or start the Vite dev server on port 5173.</p>',
            200
        )

    # Disable strict slashes so /trips and /trips/ both hit the SPA
    app.url_map.strict_slashes = False

