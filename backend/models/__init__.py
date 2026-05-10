"""
Database and model initialization.

Provides the shared SQLAlchemy and Flask-Login instances bound by the
application factory.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Single shared database instance — all models import this
db = SQLAlchemy()

# Login manager handles session-based authentication
login_manager = LoginManager()

# Where to redirect unauthenticated users
login_manager.login_view = 'auth.login'
login_manager.login_message_category = 'info'
