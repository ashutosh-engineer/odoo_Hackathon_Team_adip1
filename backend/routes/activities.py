"""
Activity Search Routes
-----------------------
Browse activities available in a specific city or across all cities.
Activities are categorized (sightseeing, food, adventure, culture, nightlife)
and filterable by cost and duration.

All data from seeded database — consistent and fast.
"""

from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required
from backend.models.activity import Activity
from backend.models.city import City
from backend.helpers import paginate_query

activities_bp = Blueprint('activities', __name__)


@activities_bp.route('/')
@login_required
def search():
    """
    Activity search with filters for city, category, cost, and duration.
    Dual response: HTML page or JSON for AJAX calls.
    """
    city_id = request.args.get('city_id', type=int)
    category = request.args.get('category', '').strip()
    cost_max = request.args.get('cost_max', type=float)
    duration_max = request.args.get('duration_max', type=float)

    activities_query = Activity.query

    if city_id:
        activities_query = activities_query.filter(Activity.city_id == city_id)

    if category:
        activities_query = activities_query.filter(Activity.category == category)

    if cost_max is not None:
        activities_query = activities_query.filter(Activity.cost <= cost_max)

    if duration_max is not None:
        activities_query = activities_query.filter(Activity.duration_hours <= duration_max)

    pagination = paginate_query(activities_query.order_by(Activity.name), default_per_page=24, max_per_page=48)
    activities = pagination.items

    categories = [
        c[0] for c in
        Activity.query.with_entities(Activity.category).distinct().all()
        if c[0]
    ]
    cities = City.query.order_by(City.name).all()

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'items': [{
                'id': a.id,
                'name': a.name,
                'description': a.description,
                'category': a.category,
                'cost': a.cost,
                'duration_hours': a.duration_hours,
                'image_url': a.image_url,
                'city_name': a.city.name if a.city else None
            } for a in activities],
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
        })

    return render_template(
        'activities/search.html',
        activities=activities,
        categories=categories,
        cities=cities,
        selected_city=city_id,
        selected_category=category,
        pagination=pagination
    )