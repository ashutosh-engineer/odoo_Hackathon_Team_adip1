/*
 * PageShell — Amazon-style dark sticky topbar + content area.
 * Dark #131921 header bar (60px), white page title, breadcrumb subtitle,
 * actions on the right. Matches AWS Console / Seller Central layout.
 */

export default function PageShell({ title, subtitle, actions = null, ribbon = null, children, contentClassName = '' }) {
  return (
    <>
      <div className="page-shell-sticky">
        <header className="page-header">
          <div className="page-header-text">
            {/* Breadcrumb-style separator when subtitle is present */}
            <h1 className="page-title">{title}</h1>
            {subtitle ? (
              <>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', margin: '0 0.35rem' }}>›</span>
                <p className="page-subtitle">{subtitle}</p>
              </>
            ) : null}
          </div>
          {actions ? <div className="page-header-actions">{actions}</div> : null}
        </header>
        {ribbon}
      </div>
      <div className={`content-area ${contentClassName}`.trim()}>{children}</div>
    </>
  );
}
