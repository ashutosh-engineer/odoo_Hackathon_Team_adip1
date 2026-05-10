"""
Application configuration.

Defines the environment-specific Flask settings used by the app factory.
"""

import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def _env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


class BaseConfig:
    """Shared configuration for every environment."""

    SECRET_KEY = os.environ.get('SECRET_KEY', 'traveloop-dev-secret-change-in-production')
    
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://traveloop:traveloop@localhost:5432/traveloop_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = _env_flag('SESSION_COOKIE_SECURE', False)
    SESSION_TYPE = 'redis'
    SESSION_REDIS = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    PERMANENT_SESSION_LIFETIME = 86400
    
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = _env_flag('REMEMBER_COOKIE_SECURE', False)
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
    
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/2')
    
    PREFERRED_URL_SCHEME = 'https'
    AUTO_CREATE_DB = _env_flag('AUTO_CREATE_DB', False)
    AUTO_SEED_DATA = _env_flag('AUTO_SEED_DATA', False)
    JSON_SORT_KEYS = False
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None


class DevelopmentConfig(BaseConfig):
    """Local development defaults."""

    DEBUG = True
    TESTING = False
    AUTO_CREATE_DB = True
    AUTO_SEED_DATA = True
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False


class ProductionConfig(BaseConfig):
    """Production-safe defaults."""

    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    AUTO_CREATE_DB = _env_flag('AUTO_CREATE_DB', False)
    AUTO_SEED_DATA = _env_flag('AUTO_SEED_DATA', False)


class TestingConfig(BaseConfig):
    """Testing defaults with an isolated in-memory database."""

    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'postgresql://traveloop:traveloop@localhost:5432/traveloop_test'
    AUTO_CREATE_DB = True
    AUTO_SEED_DATA = False



def get_config_class():
    """Resolve the active config class from environment variables."""
    app_env = os.environ.get('APP_ENV', os.environ.get('FLASK_ENV', 'development')).strip().lower()

    if app_env in {'prod', 'production'}:
        return ProductionConfig
    if app_env in {'test', 'testing'}:
        return TestingConfig
    return DevelopmentConfig
