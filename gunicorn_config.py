"""
Gunicorn configuration for production deployment.

Enables running multiple stateless application instances behind a load balancer.
Each worker is independent and shares no local state; all session/cache/queue
data is stored in Redis, making the deployment horizontally scalable.
"""

import multiprocessing
import os

bind = os.environ.get('GUNICORN_BIND', '127.0.0.1:5000')
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 5

max_requests = 1000
max_requests_jitter = 100

accesslog = '-'
errorlog = '-'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

forwarded_allow_ips = '*'
secure_scheme_headers = {
    'X-FORWARDED_PROTOCOL': 'ssl',
    'X-FORWARDED_PROTO': 'https',
    'X-FORWARDED_SSL': 'on',
}

proc_name = 'traveloop'
preload_app = False
