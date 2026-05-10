"""
Database Seeder
----------------
Populates the database with real-world city and activity data on first run.
Reads from seed_data/cities.json — curated content with actual descriptions,
costs, and images from Unsplash (free to use, no API key needed).

This script is idempotent — running it multiple times won't create duplicates.
It checks if cities already exist before inserting.

Usage: called automatically from app.py on first launch,
       or manually via: python seed.py
"""

import json
import os
from backend.models import db
from backend.models.city import City
from backend.models.activity import Activity


def seed_database():
    """
    Load cities and activities from JSON seed file into the database.
    Skips seeding if data already exists (prevents duplicates on restart).
    """
    # Don't re-seed if we already have cities
    if City.query.first() is not None:
        print('[Seed] Database already populated — skipping.')
        return

    seed_path = os.path.join(os.path.dirname(__file__), 'seed_data', 'cities.json')

    if not os.path.exists(seed_path):
        print(f'[Seed] Warning: {seed_path} not found. Skipping seed.')
        return

    with open(seed_path, 'r', encoding='utf-8') as f:
        cities_data = json.load(f)

    city_count = 0
    activity_count = 0

    for entry in cities_data:
        # Create the city record
        city = City(
            name=entry['name'],
            country=entry['country'],
            region=entry.get('region'),
            description=entry.get('description'),
            image_url=entry.get('image_url'),
            cost_index=entry.get('cost_index', 50),
            latitude=entry.get('latitude'),
            longitude=entry.get('longitude'),
            popularity=0
        )
        db.session.add(city)
        db.session.flush()  # Get the city ID before adding activities
        city_count += 1

        # Create activities for this city
        for act in entry.get('activities', []):
            activity = Activity(
                city_id=city.id,
                name=act['name'],
                description=act.get('description'),
                category=act.get('category', 'sightseeing'),
                cost=act.get('cost', 0),
                duration_hours=act.get('duration_hours', 1.0),
                image_url=act.get('image_url')
            )
            db.session.add(activity)
            activity_count += 1

    db.session.commit()
    print(f'[Seed] Loaded {city_count} cities with {activity_count} activities.')


if __name__ == '__main__':
    # Allow running directly: python seed.py
    from backend.app import create_app
    app = create_app()
    with app.app_context():
        seed_database()
