"""
Application configuration.

Defines the environment-specific Flask settings used by the app factory.
"""

import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH  = os.path.join(BASE_DIR, 'Database', 'traveloop.db')


def _env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _redis_available():
    """Quick check — returns True if Redis is reachable."""
    try:
        import redis
        r = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
                           socket_connect_timeout=1)
        r.ping()
        return True
    except Exception:
        return False


class BaseConfig:
    """Shared configuration for every environment."""

    SECRET_KEY = os.environ.get('SECRET_KEY', 'traveloop-dev-secret-change-in-production')

    # Default to SQLite so the app runs without PostgreSQL locally
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{DB_PATH}'
    )
    SQLALCHEMY_BINDS = {}          # replica only added when explicitly set
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE   = _env_flag('SESSION_COOKIE_SECURE', False)
    PERMANENT_SESSION_LIFETIME = 86400

    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE   = _env_flag('REMEMBER_COOKIE_SECURE', False)
    REMEMBER_COOKIE_SAMESITE = 'Lax'

    REDIS_URL            = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')

    PREFERRED_URL_SCHEME = 'https'
    AUTO_CREATE_DB = _env_flag('AUTO_CREATE_DB', False)
    AUTO_SEED_DATA = _env_flag('AUTO_SEED_DATA', False)
    JSON_SORT_KEYS = False
    WTF_CSRF_ENABLED   = True
    WTF_CSRF_TIME_LIMIT = None

    # Session backend: Redis when available, filesystem otherwise
    @classmethod
    def _session_config(cls):
        if _redis_available():
            return {
                'SESSION_TYPE':  'redis',
                'SESSION_REDIS': __import__('redis').from_url(
                    os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
                ),
            }
        return {
            'SESSION_TYPE':            'filesystem',
            'SESSION_FILE_DIR':        os.path.join(BASE_DIR, '.flask_sessions'),
            'SESSION_FILE_THRESHOLD':  500,
        }


class DevelopmentConfig(BaseConfig):
    """Local development — SQLite + filesystem sessions, no Redis required."""

    DEBUG  = True
    TESTING = False
    AUTO_CREATE_DB = True
    AUTO_SEED_DATA = True
    SESSION_COOKIE_SECURE  = False
    REMEMBER_COOKIE_SECURE = False
    # Disable CSRF for easier local API testing from the React dev server
    WTF_CSRF_ENABLED = False
    # Use memory for rate limiting so no Redis needed
    RATELIMIT_STORAGE_URL = 'memory://'


class ProductionConfig(BaseConfig):
    """Production — PostgreSQL + Redis required."""

    DEBUG  = False
    TESTING = False
    SESSION_COOKIE_SECURE  = True
    REMEMBER_COOKIE_SECURE = True
    AUTO_CREATE_DB = _env_flag('AUTO_CREATE_DB', False)
    AUTO_SEED_DATA = _env_flag('AUTO_SEED_DATA', False)
    WTF_CSRF_ENABLED = True

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://traveloop:traveloop@localhost:5432/traveloop_db'
    )
    # Add replica bind only when explicitly configured
    @property
    def SQLALCHEMY_BINDS(self):
        replica = os.environ.get('REPLICA_DATABASE_URL')
        return {'replica': replica} if replica else {}

    SESSION_TYPE  = 'redis'
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/2')


class TestingConfig(BaseConfig):
    """In-memory SQLite for fast unit tests."""

    TESTING = True
    DEBUG   = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    AUTO_CREATE_DB = True
    AUTO_SEED_DATA = False
    WTF_CSRF_ENABLED = False
    RATELIMIT_STORAGE_URL = 'memory://'
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = os.path.join(BASE_DIR, '.flask_sessions_test')


def get_config_class():
    """Resolve the active config class from environment variables."""
    app_env = os.environ.get('APP_ENV', os.environ.get('FLASK_ENV', 'development')).strip().lower()
    if app_env in {'prod', 'production'}:
        return ProductionConfig
    if app_env in {'test', 'testing'}:
        return TestingConfig
    return DevelopmentConfig
