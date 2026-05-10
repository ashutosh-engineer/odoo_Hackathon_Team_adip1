"""
City Search Routes
-------------------
Browse and search the city catalog. Data comes from the seeded database,
not an external API — ensuring fast, reliable responses during demo.

Search supports:
- Text query (matches city name or country)
- Region filter
- Cost range filter
All filters are combinable.
"""

from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required
from backend.models.city import City

cities_bp = Blueprint('cities', __name__)


@cities_bp.route('/')
@login_required
def search():
    """
    City search page with dynamic filtering.
    Supports both full page load and AJAX (returns JSON for dynamic updates).
    """
    query = request.args.get('q', '').strip()
    region = request.args.get('region', '').strip()
    cost_max = request.args.get('cost_max', type=float)

    # Start with base query
    cities_query = City.query

    # Apply text search — matches city name or country (case-insensitive)
    if query:
        search_term = f'%{query}%'
        cities_query = cities_query.filter(
            (City.name.ilike(search_term)) | (City.country.ilike(search_term))
        )

    # Filter by region if specified
    if region:
        cities_query = cities_query.filter(City.region == region)

    # Filter by max cost index
    if cost_max is not None:
        cities_query = cities_query.filter(City.cost_index <= cost_max)

    cities = cities_query.order_by(City.popularity.desc()).all()

    # Get distinct regions for the filter dropdown (dynamic, not hardcoded)
    regions = [r[0] for r in City.query.with_entities(City.region).distinct().all() if r[0]]

    # AJAX requests get JSON; regular requests get the full page
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify([{
            'id': c.id,
            'name': c.name,
            'country': c.country,
            'region': c.region,
            'description': c.description,
            'image_url': c.image_url,
            'cost_index': c.cost_index,
            'cost_label': c.cost_label,
            'popularity': c.popularity
        } for c in cities])

    return render_template(
        'cities/search.html',
        cities=cities,
        regions=regions,
        query=query,
        selected_region=region
    )
