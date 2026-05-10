"""
Presence Service — Redis-backed real-time collaboration.

Tracks who is currently viewing a trip and which stop (if any) is locked
for editing. Uses Redis sorted sets and hashes with TTL-based expiry so
stale entries clean themselves up automatically.

Key schema:
  presence:{trip_id}          ZSET  user_id → last_seen_timestamp
  presence:{trip_id}:meta:{uid}  HASH  name, initials, color
  lock:{trip_id}:stop:{stop_id}  STRING  user_id  (TTL = LOCK_TTL_SECS)
"""

import json
import time
import hashlib
import redis
import os

PRESENCE_TTL_SECS = 30       # user considered gone after 30 s of silence
LOCK_TTL_SECS     = 20       # stop lock expires after 20 s without renewal
HEARTBEAT_WINDOW  = 60       # only return users seen in last 60 s

# Palette of distinct avatar colours (Amazon-ish tones)
_COLOURS = [
    '#e47911', '#007185', '#067d62', '#cc0c39',
    '#8b5cf6', '#0066c0', '#d97706', '#059669',
]


def _colour_for(user_id: int) -> str:
    return _COLOURS[user_id % len(_COLOURS)]


def _get_redis() -> redis.Redis:
    url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    return redis.from_url(url, decode_responses=True)


# ── Presence ──────────────────────────────────────────────────────────────────

def heartbeat(trip_id: int, user_id: int, user_name: str, initials: str) -> None:
    """Record that a user is actively viewing a trip (call every ~15 s)."""
    r = _get_redis()
    now = time.time()
    key_set  = f'presence:{trip_id}'
    key_meta = f'presence:{trip_id}:meta:{user_id}'

    pipe = r.pipeline()
    pipe.zadd(key_set, {str(user_id): now})
    pipe.expire(key_set, HEARTBEAT_WINDOW * 2)
    pipe.hset(key_meta, mapping={
        'name':     user_name,
        'initials': initials,
        'color':    _colour_for(user_id),
    })
    pipe.expire(key_meta, HEARTBEAT_WINDOW * 2)
    pipe.execute()


def leave(trip_id: int, user_id: int) -> None:
    """Explicitly remove a user from the presence set (on page unload)."""
    r = _get_redis()
    r.zrem(f'presence:{trip_id}', str(user_id))
    r.delete(f'presence:{trip_id}:meta:{user_id}')


def get_present_users(trip_id: int) -> list[dict]:
    """Return all users seen within HEARTBEAT_WINDOW seconds."""
    r = _get_redis()
    cutoff = time.time() - HEARTBEAT_WINDOW
    key_set = f'presence:{trip_id}'

    # Remove stale entries first
    r.zremrangebyscore(key_set, '-inf', cutoff)

    members = r.zrangebyscore(key_set, cutoff, '+inf')
    users = []
    for uid_str in members:
        meta = r.hgetall(f'presence:{trip_id}:meta:{uid_str}')
        if meta:
            users.append({
                'user_id':  int(uid_str),
                'name':     meta.get('name', 'Unknown'),
                'initials': meta.get('initials', '?'),
                'color':    meta.get('color', '#e47911'),
            })
    return users


# ── Stop Locking ──────────────────────────────────────────────────────────────

def acquire_lock(trip_id: int, stop_id: int, user_id: int) -> bool:
    """
    Try to acquire an exclusive edit lock on a stop.
    Returns True if lock was granted, False if already held by someone else.
    """
    r = _get_redis()
    key = f'lock:{trip_id}:stop:{stop_id}'
    # SET NX (only if not exists) with TTL
    result = r.set(key, str(user_id), nx=True, ex=LOCK_TTL_SECS)
    if result:
        return True
    # Already locked — check if it's us (allow re-acquire / renewal)
    holder = r.get(key)
    if holder == str(user_id):
        r.expire(key, LOCK_TTL_SECS)   # renew
        return True
    return False


def release_lock(trip_id: int, stop_id: int, user_id: int) -> None:
    """Release a lock only if the caller owns it."""
    r = _get_redis()
    key = f'lock:{trip_id}:stop:{stop_id}'
    holder = r.get(key)
    if holder == str(user_id):
        r.delete(key)


def get_locks(trip_id: int) -> dict[str, int]:
    """
    Return a mapping of stop_id → user_id for all active locks on a trip.
    """
    r = _get_redis()
    pattern = f'lock:{trip_id}:stop:*'
    locks = {}
    for key in r.scan_iter(pattern):
        stop_id_str = key.split(':')[-1]
        holder = r.get(key)
        if holder:
            locks[stop_id_str] = int(holder)
    return locks
