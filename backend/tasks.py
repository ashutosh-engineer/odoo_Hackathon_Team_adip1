import logging
from backend.celery_worker import celery_app
from backend.models import db
from backend.app import create_app

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def process_upload_to_s3(self, file_path, bucket_name, object_name):
    """
    Background task to move local uploads to S3/Object Storage.
    Demonstrates 'Store uploads in object storage' requirement.
    """
    app = create_app()
    with app.app_context():
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError
            
            s3 = boto3.client('s3')
            s3.upload_file(file_path, bucket_name, object_name)
            
            # Successfully uploaded, could update DB here
            logger.info(f"Successfully uploaded {file_path} to {bucket_name}")
            
            # Typically delete local file after S3 upload
            if os.path.exists(file_path):
                os.remove(file_path)
                
        except Exception as exc:
            logger.error(f"Error uploading to S3: {exc}")
            raise self.retry(exc=exc, countdown=60)

@celery_app.task
def send_trip_reminder(user_email, trip_name):
    """
    Background task for notifications/reminders.
    """
    logger.info(f"Sending reminder to {user_email} for trip {trip_name}")
    # Integration with SendGrid/Mailgun would go here
    return True
