"""
Flask extension instances.

Defined here (not in app.py) so any module can import them
without triggering a circular import through the app factory.
"""

from flask_wtf import CSRFProtect
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

csrf = CSRFProtect()
session_handler = Session()

# Generous defaults — 10 000/day, 2 000/hour per IP.
# Auth endpoints apply their own stricter @limiter.limit() decorators.
# In production, back this with Redis via RATELIMIT_STORAGE_URL.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["10000 per day", "2000 per hour"],
)
