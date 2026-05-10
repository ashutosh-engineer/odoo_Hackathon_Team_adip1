/**
 * usePresence — real-time collaborative presence hook.
 *
 * Sends a heartbeat every HEARTBEAT_MS and returns:
 *   users  — array of { user_id, name, initials, color }
 *   locks  — object { stop_id: user_id }
 *   lockStop(stopId)   — acquire edit lock, returns true/false
 *   unlockStop(stopId) — release edit lock
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

const HEARTBEAT_MS = 15_000;   // 15 s

export function usePresence(tripId) {
  const [users, setUsers]   = useState([]);
  const [locks, setLocks]   = useState({});
  const timerRef            = useRef(null);

  const beat = useCallback(async () => {
    if (!tripId) return;
    try {
      const data = await api.post(`/trips/${tripId}/presence`, {});
      if (data) {
        setUsers(data.users  ?? []);
        setLocks(data.locks  ?? {});
      }
    } catch {
      // silently ignore — presence is best-effort
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    beat();                                          // immediate first beat
    timerRef.current = setInterval(beat, HEARTBEAT_MS);

    // On unmount / page unload — tell server we left
    const onUnload = () => {
      navigator.sendBeacon(`/api/trips/${tripId}/presence`);
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('beforeunload', onUnload);
      api.del(`/trips/${tripId}/presence`).catch(() => {});
    };
  }, [tripId, beat]);

  const lockStop = useCallback(async (stopId) => {
    try {
      await api.post(`/trips/${tripId}/stops/${stopId}/lock`, {});
      return true;
    } catch {
      return false;
    }
  }, [tripId]);

  const unlockStop = useCallback(async (stopId) => {
    try {
      await api.del(`/trips/${tripId}/stops/${stopId}/lock`);
    } catch { /* ignore */ }
  }, [tripId]);

  return { users, locks, lockStop, unlockStop };
}
