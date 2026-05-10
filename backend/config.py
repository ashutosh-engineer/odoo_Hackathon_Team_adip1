"""
Application Configuration
-------------------------
Centralizes all config values in one place. Uses environment variables
where available, with sensible defaults for local development.

Why a class-based config?
- Flask natively supports loading from objects via app.config.from_object()
- Easy to extend with TestingConfig, ProductionConfig later
- Keeps secrets out of source code when env vars are set
"""

import os

# Base directory — points to project root (one level up from backend/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class Config:
    """Base configuration shared across all environments."""

    # Secret key for session cookies and CSRF tokens.
    # MUST be overridden via environment variable in production.
    SECRET_KEY = os.environ.get('SECRET_KEY', 'traveloop-dev-secret-change-in-production')

    # SQLite database stored in the project root.
    # SQLite was chosen over PostgreSQL because:
    #   - Zero setup (no server to install)
    #   - Single file, easy to share/demo
    #   - Still a proper relational DB with full SQL support
    #   - Perfect for hackathon scope (< 10k concurrent users)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "traveloop.db")}'
    )

    # Disable modification tracking — saves memory, we don't need it
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Max upload size for trip cover images (5MB)
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
