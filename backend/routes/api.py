   

from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from backend.models import db
from backend.models.user import User
from backend.models.trip import Trip, TripExpense
from backend.models.city import City
from backend.models.activity import Activity
from backend.models.itinerary import Stop, StopActivity
from backend.models.packing import PackingItem, TripNote
from backend.forms import LoginForm, RegistrationForm, TripForm, ProfileUpdateForm, ChangePasswordForm
from backend.security import admin_required
import secrets
from datetime import date

api_bp = Blueprint('api', __name__)


                                            
def error_response(message, status=400):
    return jsonify({'error': message}), status


def success_response(data=None, message='Success'):
    resp = {'success': True, 'message': message}
    if data is not None:
        resp['data'] = data
    return jsonify(resp)


                                             
                 
                                             

@api_bp.route('/auth/login', methods=['POST'])
def api_login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower()).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            return success_response({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'initials': user.initials
            }, 'Logged in successfully.')
        return error_response('Invalid email or password.', 401)
    
    # Return first validation error if any
    if form.errors:
        first_error = next(iter(form.errors.values()))[0]
        return error_response(first_error)
        
    return error_response('Invalid request.')


@api_bp.route('/auth/signup', methods=['POST'])
def api_signup():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(name=form.name.data, email=form.email.data.lower())
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        login_user(user, remember=True)

        return success_response({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'initials': user.initials
        }, 'Account created.')

    if form.errors:
        first_error = next(iter(form.errors.values()))[0]
        return error_response(first_error)

    return error_response('Invalid request.')


@api_bp.route('/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return success_response(message='Logged out.')


@api_bp.route('/auth/forgot-password', methods=['POST'])
def api_forgot_password():
    """Accept reset requests without revealing whether the email exists (no SMTP in hackathon demo)."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return error_response('Email is required.')
    # Optional lookup — never branch the outward message on existence
    User.query.filter_by(email=email).first()
    return success_response(
        message='If an account exists for this email, you will receive password reset instructions shortly.',
    )


@api_bp.route('/auth/me')
def api_me():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'name': current_user.name,
                'email': current_user.email,
                'initials': current_user.initials,
                'is_admin': current_user.is_admin
            }
        })
    return jsonify({'authenticated': False, 'user': None})


                                             
            
                                             

@api_bp.route('/dashboard')
@login_required
def api_dashboard():
    recent_trips = Trip.query.filter_by(user_id=current_user.id)        .order_by(Trip.updated_at.desc()).limit(6).all()

    popular_cities = City.query.order_by(City.popularity.desc()).limit(8).all()

    total_trips = Trip.query.filter_by(user_id=current_user.id).count()

    return jsonify({
        'recent_trips': [_trip_to_dict(t) for t in recent_trips],
        'popular_cities': [_city_to_dict(c) for c in popular_cities],
        'total_trips': total_trips,
        'user_name': current_user.name
    })


                                             
             
                                             

@api_bp.route('/trips')
@login_required
def api_list_trips():
    """List user's trips with pagination and replica support."""
    query = Trip.query.filter_by(user_id=current_user.id).order_by(Trip.updated_at.desc())
    
    pagination = paginate_query(
        query,
        default_per_page=10,
        use_replica=True
    )
    
    return jsonify({
        'trips': [_trip_to_dict(t) for t in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })


@api_bp.route('/trips', methods=['POST'])
@login_required
def api_create_trip():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return error_response('Trip name is required.')

    start = _parse_date(data.get('start_date'))
    end = _parse_date(data.get('end_date'))

    if start and end and end < start:
        return error_response('End date cannot be before start date.')

    trip = Trip(
        user_id=current_user.id,
        name=name,
        description=data.get('description', '').strip(),
        start_date=start,
        end_date=end
    )
    db.session.add(trip)
    db.session.commit()

    return success_response(_trip_to_dict(trip), 'Trip created.')


@api_bp.route('/trips/<int:trip_id>')
@login_required
def api_get_trip(trip_id):
    """Retrieve detailed trip data, using replica for read-only access."""
    from backend.helpers import get_owned_trip_or_404
    trip = get_owned_trip_or_404(trip_id, current_user.id, use_replica=True)
    
    # Eagerly load stops from the same bind if needed
    stops = trip.stops.all()
    
    return jsonify({
        **_trip_to_dict(trip),
        'stops': [_stop_to_dict(s) for s in stops]
    })


@api_bp.route('/trips/<int:trip_id>', methods=['PUT'])
@login_required
def api_update_trip(trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}

    if 'name' in data:
        trip.name = data['name'].strip()
    if 'description' in data:
        trip.description = data['description'].strip()
    if 'start_date' in data:
        trip.start_date = _parse_date(data['start_date'])
    if 'end_date' in data:
        trip.end_date = _parse_date(data['end_date'])

    db.session.commit()
    return success_response(_trip_to_dict(trip), 'Trip updated.')


@api_bp.route('/trips/<int:trip_id>', methods=['DELETE'])
@login_required
def api_delete_trip(trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    db.session.delete(trip)
    db.session.commit()
    return success_response(message='Trip deleted.')


                                             
                                
                                             

@api_bp.route('/trips/<int:trip_id>/stops', methods=['POST'])
@login_required
def api_add_stop(trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    city_id = data.get('city_id')
    if not city_id:
        return error_response('City is required.')

    city = City.query.get_or_404(int(city_id))
    current_count = trip.stops.count()

    stop = Stop(
        trip_id=trip.id,
        city_id=city.id,
        order_index=current_count,
        start_date=_parse_date(data.get('start_date')),
        end_date=_parse_date(data.get('end_date'))
    )
    db.session.add(stop)
    city.popularity += 1
    db.session.commit()

    return success_response(_stop_to_dict(stop), 'Stop added.')


@api_bp.route('/trips/<int:trip_id>/stops/<int:stop_id>', methods=['DELETE'])
@login_required
def api_remove_stop(trip_id, stop_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    stop = Stop.query.filter_by(id=stop_id, trip_id=trip_id).first_or_404()
    db.session.delete(stop)

                              
    remaining = Stop.query.filter_by(trip_id=trip_id).order_by(Stop.order_index).all()
    for idx, s in enumerate(remaining):
        s.order_index = idx
    db.session.commit()

    return success_response(message='Stop removed.')


@api_bp.route('/trips/<int:trip_id>/stops/reorder', methods=['PUT'])
@login_required
def api_reorder_stops(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    order = data.get('order', [])

    for idx, stop_id in enumerate(order):
        stop = Stop.query.filter_by(id=stop_id, trip_id=trip_id).first()
        if stop:
            stop.order_index = idx
    db.session.commit()

    return success_response(message='Stops reordered.')


@api_bp.route('/stops/<int:stop_id>/activities', methods=['POST'])
@login_required
def api_add_stop_activity(stop_id):
    stop = Stop.query.get_or_404(stop_id)
    Trip.query.filter_by(id=stop.trip_id, user_id=current_user.id).first_or_404()

    data = request.get_json() or {}
    activity_id = data.get('activity_id')
    if not activity_id:
        return error_response('Activity is required.')

    activity = Activity.query.get_or_404(int(activity_id))

    sa = StopActivity(
        stop_id=stop.id,
        activity_id=activity.id,
        day_number=int(data.get('day_number', 1)),
        start_time=data.get('start_time')
    )
    db.session.add(sa)
    db.session.commit()

    return success_response({
        'id': sa.id,
        'activity': _activity_to_dict(activity),
        'day_number': sa.day_number,
        'start_time': sa.start_time
    }, 'Activity scheduled.')


@api_bp.route('/stops/<int:stop_id>/activities/<int:sa_id>', methods=['DELETE'])
@login_required
def api_remove_stop_activity(stop_id, sa_id):
    stop = Stop.query.get_or_404(stop_id)
    Trip.query.filter_by(id=stop.trip_id, user_id=current_user.id).first_or_404()
    sa = StopActivity.query.filter_by(id=sa_id, stop_id=stop.id).first_or_404()
    db.session.delete(sa)
    db.session.commit()
    return success_response(message='Activity removed.')


                                             
                             
                                             

@api_bp.route('/cities')
@login_required
def api_cities():
    """Search for cities with pagination and optional replica support."""
    q = request.args.get('q', '').strip()
    region = request.args.get('region', '').strip()
    cost_max = request.args.get('cost_max', type=float)

    query = City.query
    if q:
        term = f'%{q}%'
        query = query.filter((City.name.ilike(term)) | (City.country.ilike(term)))
    if region:
        query = query.filter(City.region == region)
    if cost_max is not None:
        query = query.filter(City.cost_index <= cost_max)

    # Apply pagination and use replica for this read-heavy search
    pagination = paginate_query(
        query.order_by(City.popularity.desc()),
        default_per_page=12,
        use_replica=True
    )
    
    regions = [r[0] for r in City.query.with_bind_key('replica').with_entities(City.region).distinct().all() if r[0]]

    return jsonify({
        'cities': [_city_to_dict(c) for c in pagination.items],
        'regions': regions,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
        'total': pagination.total,
        'page': pagination.page
    })


@api_bp.route('/activities')
@login_required
def api_activities():
    """Search for activities with pagination and replica support."""
    city_id = request.args.get('city_id', type=int)
    category = request.args.get('category', '').strip()

    query = Activity.query
    if city_id:
        query = query.filter(Activity.city_id == city_id)
    if category:
        query = query.filter(Activity.category == category)

    # Use replica for read-heavy catalog searches
    pagination = paginate_query(
        query.order_by(Activity.name),
        default_per_page=20,
        use_replica=True
    )
    
    categories = [c[0] for c in Activity.query.with_bind_key('replica').with_entities(Activity.category).distinct().all() if c[0]]

    return jsonify({
        'activities': [_activity_to_dict(a) for a in pagination.items],
        'categories': categories,
        'total': pagination.total,
        'page': pagination.page,
        'has_next': pagination.has_next
    })


                                             
                    
                                             

@api_bp.route('/trips/<int:trip_id>/budget')
@login_required
def api_budget(trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

                          
    stops = trip.stops.all()
    activity_cost = 0
    by_stop = []
    for stop in stops:
        stop_total = sum(sa.activity.cost for sa in stop.activities.all() if sa.activity)
        by_stop.append({'city': stop.city.name if stop.city else '?', 'cost': round(stop_total, 2)})
        activity_cost += stop_total

                     
    expenses = TripExpense.query.filter_by(trip_id=trip.id).all()
    category_totals = {}
    for exp in expenses:
        category_totals[exp.category] = category_totals.get(exp.category, 0) + exp.amount
    if activity_cost > 0:
        category_totals['activities'] = category_totals.get('activities', 0) + activity_cost

    grand_total = sum(category_totals.values())
    avg_per_day = round(grand_total / trip.duration_days, 2) if trip.duration_days else 0

    return jsonify({
        'trip_name': trip.name,
        'activity_costs': {'by_stop': by_stop, 'total': round(activity_cost, 2)},
        'expenses': [{'id': e.id, 'category': e.category, 'description': e.description, 'amount': e.amount} for e in expenses],
        'category_totals': category_totals,
        'grand_total': round(grand_total, 2),
        'avg_per_day': avg_per_day
    })


@api_bp.route('/trips/<int:trip_id>/expenses', methods=['POST'])
@login_required
def api_add_expense(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    amount = data.get('amount', 0)
    if not amount or float(amount) <= 0:
        return error_response('Valid amount is required.')

    exp = TripExpense(
        trip_id=trip_id,
        category=data.get('category', 'other'),
        description=data.get('description', ''),
        amount=float(amount)
    )
    db.session.add(exp)
    db.session.commit()
    return success_response({'id': exp.id}, 'Expense added.')


@api_bp.route('/trips/<int:trip_id>/expenses/<int:eid>', methods=['DELETE'])
@login_required
def api_remove_expense(trip_id, eid):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    exp = TripExpense.query.filter_by(id=eid, trip_id=trip_id).first_or_404()
    db.session.delete(exp)
    db.session.commit()
    return success_response(message='Expense removed.')


                                             
                    
                                             

@api_bp.route('/trips/<int:trip_id>/packing')
@login_required
def api_packing_list(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    items = PackingItem.query.filter_by(trip_id=trip_id).order_by(PackingItem.category).all()
    return jsonify([{
        'id': i.id, 'name': i.name, 'category': i.category, 'is_packed': i.is_packed
    } for i in items])


@api_bp.route('/trips/<int:trip_id>/packing', methods=['POST'])
@login_required
def api_add_packing_item(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return error_response('Item name is required.')
    item = PackingItem(trip_id=trip_id, name=name, category=data.get('category', 'general'))
    db.session.add(item)
    db.session.commit()
    return success_response({'id': item.id, 'name': item.name, 'category': item.category}, 'Item added.')


@api_bp.route('/trips/<int:trip_id>/packing/<int:item_id>/toggle', methods=['POST'])
@login_required
def api_toggle_packing(trip_id, item_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    item = PackingItem.query.filter_by(id=item_id, trip_id=trip_id).first_or_404()
    item.is_packed = not item.is_packed
    db.session.commit()
    return success_response({'is_packed': item.is_packed})


@api_bp.route('/trips/<int:trip_id>/packing/<int:item_id>', methods=['DELETE'])
@login_required
def api_delete_packing(trip_id, item_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    item = PackingItem.query.filter_by(id=item_id, trip_id=trip_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return success_response(message='Item removed.')


                                             
             
                                             

@api_bp.route('/trips/<int:trip_id>/notes')
@login_required
def api_notes_list(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    notes = TripNote.query.filter_by(trip_id=trip_id).order_by(TripNote.created_at.desc()).all()
    return jsonify([{
        'id': n.id, 'content': n.content, 'stop_id': n.stop_id,
        'stop_name': n.stop.city.name if n.stop and n.stop.city else None,
        'created_at': n.created_at.isoformat() if n.created_at else None
    } for n in notes])


@api_bp.route('/trips/<int:trip_id>/notes', methods=['POST'])
@login_required
def api_add_note(trip_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return error_response('Note content is required.')
    note = TripNote(trip_id=trip_id, stop_id=data.get('stop_id'), content=content)
    db.session.add(note)
    db.session.commit()
    return success_response({'id': note.id}, 'Note saved.')


@api_bp.route('/trips/<int:trip_id>/notes/<int:note_id>', methods=['DELETE'])
@login_required
def api_delete_note(trip_id, note_id):
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    note = TripNote.query.filter_by(id=note_id, trip_id=trip_id).first_or_404()
    db.session.delete(note)
    db.session.commit()
    return success_response(message='Note deleted.')


                                             
          
                                             

@api_bp.route('/trips/<int:trip_id>/share', methods=['POST'])
@login_required
def api_share_trip(trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    token = trip.generate_share_token()
    db.session.commit()
    return success_response({'token': token}, 'Share link created.')


@api_bp.route('/shared/<token>')
def api_shared_trip(token):
    trip = Trip.query.filter_by(share_token=token, is_public=True).first_or_404()
    stops = trip.stops.all()
    return jsonify({
        'name': trip.name,
        'description': trip.description,
        'start_date': trip.start_date.isoformat() if trip.start_date else None,
        'end_date': trip.end_date.isoformat() if trip.end_date else None,
        'owner_name': trip.owner.name,
        'stops': [_stop_to_dict(s) for s in stops]
    })


                                             
          
                                             

# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Collaborative Presence & Stop Locking
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route('/trips/<int:trip_id>/presence', methods=['POST'])
@login_required
def api_presence_heartbeat(trip_id):
    """
    Called every ~15 s by the frontend to signal the user is still viewing.
    Returns the full list of present users + active stop locks.
    """
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    from backend.services.presence import heartbeat, get_present_users, get_locks
    heartbeat(trip_id, current_user.id, current_user.name, current_user.initials)
    return jsonify({
        'users': get_present_users(trip_id),
        'locks': get_locks(trip_id),
    })


@api_bp.route('/trips/<int:trip_id>/presence', methods=['DELETE'])
@login_required
def api_presence_leave(trip_id):
    """Explicitly remove the user from the presence set (page unload)."""
    from backend.services.presence import leave
    leave(trip_id, current_user.id)
    return success_response(message='Left.')


@api_bp.route('/trips/<int:trip_id>/presence', methods=['GET'])
@login_required
def api_presence_poll(trip_id):
    """
    Lightweight poll — returns present users + locks without updating heartbeat.
    Used by viewers who are not the trip owner.
    """
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    from backend.services.presence import get_present_users, get_locks
    return jsonify({
        'users': get_present_users(trip_id),
        'locks': get_locks(trip_id),
    })


@api_bp.route('/trips/<int:trip_id>/stops/<int:stop_id>/lock', methods=['POST'])
@login_required
def api_lock_stop(trip_id, stop_id):
    """Acquire an exclusive edit lock on a stop."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    Stop.query.filter_by(id=stop_id, trip_id=trip_id).first_or_404()
    from backend.services.presence import acquire_lock
    granted = acquire_lock(trip_id, stop_id, current_user.id)
    if granted:
        return success_response({'locked': True}, 'Lock acquired.')
    return jsonify({'success': False, 'locked': False, 'error': 'Stop is being edited by someone else.'}), 409


@api_bp.route('/trips/<int:trip_id>/stops/<int:stop_id>/lock', methods=['DELETE'])
@login_required
def api_unlock_stop(trip_id, stop_id):
    """Release the edit lock on a stop."""
    from backend.services.presence import release_lock
    release_lock(trip_id, stop_id, current_user.id)
    return success_response(message='Lock released.')


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 2 — Smart Budget Health Score
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route('/trips/<int:trip_id>/budget/health')
@login_required
def api_budget_health(trip_id):
    """
    Return the cached Budget Health report, or trigger a Celery task to
    compute it and return a 202 Accepted while it runs.
    """
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    import redis as redis_lib, json, os
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    r = redis_lib.from_url(redis_url, decode_responses=True)
    cached = r.get(f'budget_health:{trip_id}')

    if cached:
        return jsonify({'status': 'ready', 'report': json.loads(cached)})

    # Not cached — kick off Celery task and return 202
    try:
        from backend.tasks import calculate_budget_health
        calculate_budget_health.delay(trip_id)
    except Exception:
        # Celery not running — compute synchronously as fallback
        from backend.models.trip import TripExpense
        from backend.services.budget_health import calculate
        trip = Trip.query.get(trip_id)
        expenses = TripExpense.query.filter_by(trip_id=trip_id).all()
        stops = trip.stops.all()
        activity_cost = sum(
            sa.activity.cost for stop in stops
            for sa in stop.activities.all() if sa.activity
        )
        report = calculate(trip, expenses, activity_cost)
        result = {
            'score': report.score, 'band': report.band,
            'estimated_total': report.estimated_total,
            'budget_limit': report.budget_limit,
            'daily_rate': report.daily_rate,
            'recommended_daily': report.recommended_daily,
            'anomalies': report.anomalies, 'tips': report.tips,
        }
        return jsonify({'status': 'ready', 'report': result})

    return jsonify({'status': 'computing'}), 202


@api_bp.route('/trips/<int:trip_id>/budget/health/refresh', methods=['POST'])
@login_required
def api_budget_health_refresh(trip_id):
    """Force-invalidate the cache and recompute the health score."""
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    import redis as redis_lib, os
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    r = redis_lib.from_url(redis_url, decode_responses=True)
    r.delete(f'budget_health:{trip_id}')

    try:
        from backend.tasks import calculate_budget_health
        calculate_budget_health.delay(trip_id)
        return jsonify({'status': 'computing'}), 202
    except Exception:
        return api_budget_health(trip_id)


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 3 — AI Magic Fill (auto-schedule top activities)
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route('/trips/<int:trip_id>/stops/<int:stop_id>/magic-fill', methods=['POST'])
@login_required
def api_magic_fill(trip_id, stop_id):
    """
    Auto-fill a stop with the N most popular activities for its city.

    Body (JSON, all optional):
      { "days": 3, "max_per_day": 2 }

    Picks activities ordered by:
      1. Highest popularity (city.popularity proxy via activity.city)
      2. Lowest cost (budget-friendly first within same popularity tier)

    Skips activities already scheduled at this stop.
    """
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
    stop = Stop.query.filter_by(id=stop_id, trip_id=trip_id).first_or_404()

    data = request.get_json() or {}
    days        = max(1, int(data.get('days', 3)))
    max_per_day = max(1, int(data.get('max_per_day', 2)))
    total_slots = days * max_per_day

    # IDs already scheduled — avoid duplicates
    existing_ids = {sa.activity_id for sa in stop.activities.all()}

    # Fetch top activities for this city, ordered by cost asc (budget-friendly)
    # In a real system you'd have a popularity column on Activity; we use cost
    # as a proxy (lower cost = more accessible = more popular for hackathon).
    candidates = (
        Activity.query
        .filter_by(city_id=stop.city_id)
        .filter(Activity.id.notin_(existing_ids) if existing_ids else True)
        .order_by(Activity.cost.asc())
        .limit(total_slots * 2)   # fetch extra so we have room to pick
        .all()
    )

    if not candidates:
        return error_response('No activities available for this city.', 404)

    added = []
    day = 1
    per_day_count = 0

    for act in candidates[:total_slots]:
        if per_day_count >= max_per_day:
            day += 1
            per_day_count = 0
            if day > days:
                break

        sa = StopActivity(
            stop_id=stop.id,
            activity_id=act.id,
            day_number=day,
        )
        db.session.add(sa)
        added.append({
            'activity_id':   act.id,
            'activity_name': act.name,
            'day_number':    day,
            'cost':          act.cost,
            'duration_hours': act.duration_hours,
        })
        per_day_count += 1

    db.session.commit()

    return success_response({
        'added':       added,
        'total_added': len(added),
        'days':        days,
    }, f'Magic Fill added {len(added)} activities across {days} days.')


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 4 — PDF Export
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route('/trips/<int:trip_id>/export/pdf', methods=['POST'])
@login_required
def api_request_pdf(trip_id):
    """
    Kick off PDF generation via Celery (or synchronously as fallback).
    Returns 202 while generating, or 200 with { status: 'ready' } if cached.
    """
    Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    import redis as redis_lib, os
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    r = redis_lib.from_url(redis_url, decode_responses=False)

    if r.exists(f'pdf:{trip_id}'):
        return jsonify({'status': 'ready'})

    try:
        from backend.tasks import generate_trip_pdf_task
        generate_trip_pdf_task.delay(trip_id)
        return jsonify({'status': 'generating'}), 202
    except Exception:
        # Celery not running — generate synchronously
        from backend.models.trip import Trip as TripModel
        from backend.services.pdf_export import generate_trip_pdf
        trip = TripModel.query.get(trip_id)
        stops = trip.stops.all()
        pdf_bytes = generate_trip_pdf(trip, stops)
        if pdf_bytes:
            r.setex(f'pdf:{trip_id}', 600, pdf_bytes)
            return jsonify({'status': 'ready'})
        return error_response('PDF generation requires ReportLab. Install it with: pip install reportlab', 503)


@api_bp.route('/trips/<int:trip_id>/export/pdf/download')
@login_required
def api_download_pdf(trip_id):
    """
    Stream the cached PDF bytes to the browser as a file download.
    Returns 404 if not yet generated (client should call POST first).
    """
    from flask import Response
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()

    import redis as redis_lib, os
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    r = redis_lib.from_url(redis_url, decode_responses=False)
    pdf_bytes = r.get(f'pdf:{trip_id}')

    if not pdf_bytes:
        return error_response('PDF not ready. POST to /export/pdf first.', 404)

    safe_name = trip.name.replace(' ', '_').replace('/', '-')[:50]
    return Response(
        pdf_bytes,
        mimetype='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="Traveloop_{safe_name}.pdf"',
            'Content-Length': str(len(pdf_bytes)),
        }
    )


@api_bp.route('/profile', methods=['PUT'])
@login_required
def api_update_profile():
    data = request.get_json() or {}
    if 'name' in data:
        current_user.name = data['name'].strip()
    if 'email' in data:
        email = data['email'].strip().lower()
        existing = User.query.filter(User.email == email, User.id != current_user.id).first()
        if existing:
            return error_response('Email already in use.')
        current_user.email = email
    db.session.commit()
    return success_response({'name': current_user.name, 'email': current_user.email}, 'Profile updated.')


                                             
                                                
                                             

def _trip_to_dict(trip):
    return {
        'id': trip.id,
        'name': trip.name,
        'description': trip.description,
        'cover_image': trip.cover_image,
        'start_date': trip.start_date.isoformat() if trip.start_date else None,
        'end_date': trip.end_date.isoformat() if trip.end_date else None,
        'is_public': trip.is_public,
        'share_token': trip.share_token,
        'stop_count': trip.stop_count,
        'duration_days': trip.duration_days,
        'created_at': trip.created_at.isoformat() if trip.created_at else None,
    }

def _city_to_dict(city):
    return {
        'id': city.id,
        'name': city.name,
        'country': city.country,
        'region': city.region,
        'description': city.description,
        'image_url': city.image_url,
        'cost_index': city.cost_index,
        'cost_label': city.cost_label,
        'popularity': city.popularity,
    }

def _activity_to_dict(activity):
    return {
        'id': activity.id,
        'name': activity.name,
        'description': activity.description,
        'category': activity.category,
        'cost': activity.cost,
        'duration_hours': activity.duration_hours,
        'image_url': activity.image_url,
        'city_name': activity.city.name if activity.city else None,
    }

def _stop_to_dict(stop):
    return {
        'id': stop.id,
        'order_index': stop.order_index,
        'start_date': stop.start_date.isoformat() if stop.start_date else None,
        'end_date': stop.end_date.isoformat() if stop.end_date else None,
        'notes': stop.notes,
        'city': _city_to_dict(stop.city) if stop.city else None,
        'activities': [{
            'id': sa.id,
            'day_number': sa.day_number,
            'start_time': sa.start_time,
            'activity': _activity_to_dict(sa.activity) if sa.activity else None
        } for sa in stop.activities.all()]
    }

def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None
