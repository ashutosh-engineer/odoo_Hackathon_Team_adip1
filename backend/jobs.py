"""
Background Jobs
---------------
Shared helpers for offloading small non-request tasks.
"""

from concurrent.futures import ThreadPoolExecutor
from os import environ

from backend.models.city import City
from backend.models import db

_EXECUTOR = ThreadPoolExecutor(max_workers=int(environ.get('BACKGROUND_WORKERS', '4')))


def run_background_job(app, func, *args, **kwargs):
    """Run a callable in the background with its own Flask app context."""

    def job_wrapper():
        with app.app_context():
            func(*args, **kwargs)

    return _EXECUTOR.submit(job_wrapper)


def increment_city_popularity(app, city_id):
    """Increment a city's popularity score in the background."""
    city = City.query.get(city_id)
    if city is None:
        return

    city.popularity += 1
    db.session.commit()
