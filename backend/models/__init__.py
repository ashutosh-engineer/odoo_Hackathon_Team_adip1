"""
Database & Model Initialization
--------------------------------
Sets up SQLAlchemy and Flask-Login instances that get bound to the
Flask app during factory initialization in app.py.

Why separate from app.py?
- Avoids circular imports (models need db, app needs models)
- Standard Flask pattern — db is created once, imported everywhere
- Makes testing easier (can bind to a test database)
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
