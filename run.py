"""
Traveloop — Run Script
-----------------------
Project entry point. Kept at root level so you can simply run:
    python run.py

This imports the app factory from backend/ and starts the dev server.
In production, use: gunicorn "backend.app:create_app()"
"""

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
