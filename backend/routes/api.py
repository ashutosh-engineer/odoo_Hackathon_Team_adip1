   

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
    trips = Trip.query.filter_by(user_id=current_user.id)        .order_by(Trip.updated_at.desc()).all()
    return jsonify([_trip_to_dict(t) for t in trips])


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
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first_or_404()
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

    cities = query.order_by(City.popularity.desc()).all()
    regions = [r[0] for r in City.query.with_entities(City.region).distinct().all() if r[0]]

    return jsonify({'cities': [_city_to_dict(c) for c in cities], 'regions': regions})


@api_bp.route('/activities')
@login_required
def api_activities():
    city_id = request.args.get('city_id', type=int)
    category = request.args.get('category', '').strip()

    query = Activity.query
    if city_id:
        query = query.filter(Activity.city_id == city_id)
    if category:
        query = query.filter(Activity.category == category)

    activities = query.order_by(Activity.name).all()
    categories = [c[0] for c in Activity.query.with_entities(Activity.category).distinct().all() if c[0]]

    return jsonify({
        'activities': [_activity_to_dict(a) for a in activities],
        'categories': categories
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
