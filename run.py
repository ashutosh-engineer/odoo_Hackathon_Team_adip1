"""
Traveloop — Run Script
-----------------------
Project entry point. Kept at root level so you can simply run:
    python run.py

This imports the app factory from backend/ and starts the dev server.
In production, use a WSGI server such as Gunicorn or Waitress.
"""

import os
from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0').strip().lower() in {'1', 'true', 'yes', 'on'}
    port = int(os.environ.get('PORT', '5000'))
    app.run(debug=debug, port=port)
