"""
Security Helpers
----------------
Centralized response hardening and redirect validation.

Keeping this in one module avoids repeating security logic across route files.
"""

from functools import wraps
from urllib.parse import urljoin, urlparse

from flask import current_app, jsonify, make_response, request, abort
from flask_login import current_user


def admin_required(f):
    """Ensure the user is an administrator."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


def is_safe_redirect_target(target):
    """Reject open redirects by only allowing same-host redirects."""
    if not target:
        return False

    host_url = request.host_url
    test_url = urljoin(host_url, target)

    return urlparse(test_url).scheme in {'http', 'https'} and urlparse(host_url).netloc == urlparse(test_url).netloc


def register_security(app):
    """Attach response headers that harden every request."""

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

        if app.config.get('SESSION_COOKIE_SECURE'):
            response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

        return response


def register_error_handlers(app):
    """Return consistent errors for browsers and JSON clients."""

    def wants_json():
        return request.is_json or request.accept_mimetypes.best == 'application/json'

    def format_error(status_code, message):
        payload = {'error': message, 'status_code': status_code}
        if wants_json():
            return jsonify(payload), status_code

        body = f'{status_code} {message}'
        return make_response(body, status_code)

    @app.errorhandler(400)
    def bad_request(error):
        return format_error(400, 'Bad request')

    @app.errorhandler(403)
    def forbidden(error):
        return format_error(403, 'Forbidden')

    @app.errorhandler(404)
    def not_found(error):
        return format_error(404, 'Not found')

    @app.errorhandler(413)
    def payload_too_large(error):
        return format_error(413, 'Uploaded file is too large')

    @app.errorhandler(500)
    def server_error(error):
        current_app.logger.exception('Unhandled server error')
        return format_error(500, 'Internal server error')