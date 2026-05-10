"""
Route registration helpers.

Imports and registers all Flask blueprints used by the application.
"""


def register_routes(app):
    """Import and register all blueprints with the Flask app."""

    from backend.routes.auth import auth_bp
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.trips import trips_bp
    from backend.routes.itinerary import itinerary_bp
    from backend.routes.cities import cities_bp
    from backend.routes.activities import activities_bp
    from backend.routes.budget import budget_bp
    from backend.routes.packing import packing_bp
    from backend.routes.notes import notes_bp
    from backend.routes.share import share_bp
    from backend.routes.profile import profile_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(trips_bp, url_prefix='/trips')
    app.register_blueprint(itinerary_bp, url_prefix='/itinerary')
    app.register_blueprint(cities_bp, url_prefix='/cities')
    app.register_blueprint(activities_bp, url_prefix='/activities')
    app.register_blueprint(budget_bp, url_prefix='/budget')
    app.register_blueprint(packing_bp, url_prefix='/packing')
    app.register_blueprint(notes_bp, url_prefix='/notes')
    app.register_blueprint(share_bp, url_prefix='/share')
    app.register_blueprint(profile_bp, url_prefix='/profile')

    # JSON API for React frontend — single endpoint collection under /api
    from backend.routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
