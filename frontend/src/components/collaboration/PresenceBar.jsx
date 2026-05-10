/**
 * PresenceBar — shows avatar bubbles of who's currently viewing the trip.
 * Renders inline in the page header actions area.
 */

export default function PresenceBar({ users = [], currentUserId }) {
  if (!users.length) return null;

  // Show up to 5 avatars, then a "+N" overflow badge
  const visible  = users.slice(0, 5);
  const overflow = users.length - visible.length;

  return (
    <div className="presence-bar" aria-label="People viewing this trip">
      {visible.map((u) => (
        <div
          key={u.user_id}
          className={`presence-avatar ${u.user_id === currentUserId ? 'presence-avatar--self' : ''}`}
          style={{ background: u.color }}
          title={u.user_id === currentUserId ? `${u.name} (you)` : u.name}
          aria-label={u.name}
        >
          {u.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div className="presence-avatar presence-avatar--overflow" title={`${overflow} more`}>
          +{overflow}
        </div>
      )}
      <span className="presence-bar__label">
        {users.length === 1 ? '1 viewer' : `${users.length} viewers`}
      </span>
    </div>
  );
}
