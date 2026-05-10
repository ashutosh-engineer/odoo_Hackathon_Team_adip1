import os
from celery import Celery

def make_celery(app_name=__name__):
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
    
    celery = Celery(
        app_name,
        broker=redis_url,
        backend=redis_url,
        include=['backend.tasks']
    )
    
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=300,
    )
    
    return celery

celery_app = make_celery()
