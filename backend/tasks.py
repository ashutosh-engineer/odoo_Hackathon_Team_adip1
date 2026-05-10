"""
Celery background tasks.

Tasks:
  1. process_upload_to_s3       — existing S3 upload task
  2. send_trip_reminder         — existing notification task
  3. calculate_budget_health    — NEW: compute & cache budget health score
  4. generate_trip_pdf_task     — NEW: render PDF and store in Redis
"""

import logging
import os
import json

from backend.celery_worker import celery_app
from backend.models import db
from backend.app import create_app

logger = logging.getLogger(__name__)


# ── Existing tasks (unchanged) ────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3)
def process_upload_to_s3(self, file_path, bucket_name, object_name):
    """Background task to move local uploads to S3/Object Storage."""
    app = create_app()
    with app.app_context():
        try:
            import boto3
            s3 = boto3.client('s3')
            s3.upload_file(file_path, bucket_name, object_name)
            logger.info(f"Successfully uploaded {file_path} to {bucket_name}")
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as exc:
            logger.error(f"Error uploading to S3: {exc}")
            raise self.retry(exc=exc, countdown=60)


@celery_app.task
def send_trip_reminder(user_email, trip_name):
    """Background task for notifications/reminders."""
    logger.info(f"Sending reminder to {user_email} for trip {trip_name}")
    return True


# ── NEW: Budget Health ────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2)
def calculate_budget_health(self, trip_id: int):
    """
    Compute the Budget Health score for a trip and cache the result in Redis.

    Cache key: budget_health:{trip_id}
    TTL: 5 minutes (results are cheap to recompute)
    """
    app = create_app()
    with app.app_context():
        try:
            import redis as redis_lib
            from backend.models.trip import Trip, TripExpense
            from backend.services.budget_health import calculate

            trip = Trip.query.get(trip_id)
            if not trip:
                logger.warning(f"calculate_budget_health: trip {trip_id} not found")
                return None

            # Gather data
            expenses = TripExpense.query.filter_by(trip_id=trip_id).all()
            stops    = trip.stops.all()
            activity_cost = sum(
                sa.activity.cost
                for stop in stops
                for sa in stop.activities.all()
                if sa.activity
            )

            report = calculate(trip, expenses, activity_cost)

            result = {
                'score':             report.score,
                'band':              report.band,
                'estimated_total':   report.estimated_total,
                'budget_limit':      report.budget_limit,
                'daily_rate':        report.daily_rate,
                'recommended_daily': report.recommended_daily,
                'anomalies':         report.anomalies,
                'tips':              report.tips,
            }

            # Cache in Redis
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
            r = redis_lib.from_url(redis_url, decode_responses=True)
            r.setex(f'budget_health:{trip_id}', 300, json.dumps(result))

            logger.info(f"Budget health for trip {trip_id}: score={report.score} band={report.band}")
            return result

        except Exception as exc:
            logger.error(f"calculate_budget_health error for trip {trip_id}: {exc}")
            raise self.retry(exc=exc, countdown=30)


# ── NEW: PDF Export ───────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2)
def generate_trip_pdf_task(self, trip_id: int):
    """
    Render a PDF for the trip and store the bytes in Redis.

    Cache key: pdf:{trip_id}
    TTL: 10 minutes
    """
    app = create_app()
    with app.app_context():
        try:
            import redis as redis_lib
            from backend.models.trip import Trip
            from backend.services.pdf_export import generate_trip_pdf

            trip = Trip.query.get(trip_id)
            if not trip:
                logger.warning(f"generate_trip_pdf_task: trip {trip_id} not found")
                return None

            stops = trip.stops.all()
            pdf_bytes = generate_trip_pdf(trip, stops)

            if pdf_bytes is None:
                logger.warning("ReportLab not available — PDF generation skipped")
                return None

            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
            # Use binary Redis client for PDF bytes
            r = redis_lib.from_url(redis_url, decode_responses=False)
            r.setex(f'pdf:{trip_id}', 600, pdf_bytes)

            logger.info(f"PDF generated for trip {trip_id} ({len(pdf_bytes)} bytes)")
            return {'size': len(pdf_bytes)}

        except Exception as exc:
            logger.error(f"generate_trip_pdf_task error for trip {trip_id}: {exc}")
            raise self.retry(exc=exc, countdown=30)
