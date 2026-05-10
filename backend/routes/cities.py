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
from backend.helpers import paginate_query

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

    cities_query = City.query

    if query:
        search_term = f'%{query}%'
        cities_query = cities_query.filter(
            (City.name.ilike(search_term)) | (City.country.ilike(search_term))
        )

    if region:
        cities_query = cities_query.filter(City.region == region)

    if cost_max is not None:
        cities_query = cities_query.filter(City.cost_index <= cost_max)

    pagination = paginate_query(cities_query.order_by(City.popularity.desc()), default_per_page=24, max_per_page=48)
    cities = pagination.items

    regions = [r[0] for r in City.query.with_entities(City.region).distinct().all() if r[0]]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'items': [{
                'id': c.id,
                'name': c.name,
                'country': c.country,
                'region': c.region,
                'description': c.description,
                'image_url': c.image_url,
                'cost_index': c.cost_index,
                'cost_label': c.cost_label,
                'popularity': c.popularity
            } for c in cities],
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
        })

    return render_template(
        'cities/search.html',
        cities=cities,
        regions=regions,
        query=query,
        selected_region=region,
        pagination=pagination
    )