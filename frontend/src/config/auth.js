/**
 * Temporary UI bypass — no signup/login screens; app opens as signed in.
 * Set to false before production or demos that require real Flask sessions.
 */
export const bypassAuth = false;

export const bypassUser = {
  name: 'Demo Traveler',
  email: 'demo@traveloop.local',
  initials: 'DT',
};
