/* AuthLayout — left hero photo + right scrollable form.
   Logo: #febd69 fill (Amazon yellow) — same as sidebar & splash.
   Wordmark: #131921 navy — same as sidebar bg.
*/

const PHOTO_SRC =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=82';

/* Shared logo mark — #febd69, matches sidebar & splash exactly */
function LogoMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        fill="#febd69"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937
           a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788
           l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237
           c-.92 0-1.456-1.04-.92-1.788L10.013.474
           c.214-.297.556-.474.92-.474h28.894
           c.92 0 1.456 1.04.92 1.788l-7.48 10.471
           c-1.07 1.498 0 3.579 1.842 3.579h11.377
           c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="auth-split">
      {/* ── Left: hero photo with overlay text ── */}
      <aside className="auth-split__photo" aria-hidden="true">
        <img
          src={PHOTO_SRC}
          alt=""
          className="auth-split__photo-img"
          loading="eager"
          fetchPriority="high"
        />
        <div className="auth-split__overlay" />
        <div className="auth-split__copy">
          {/* Brand row on the photo — logo + wordmark */}
          <div className="auth-split__brand-row">
            <LogoMark size={36} />
            <span className="auth-split__brand-name">Traveloop</span>
          </div>
          <p className="auth-split__eyebrow">Plan smarter journeys</p>
          <h2 className="auth-split__headline">
            <span className="auth-split__travel">Travel</span>
            <span className="auth-split__oop">oop</span>
          </h2>
          <p className="auth-split__lead">
            Iceland highlands · One workspace for itineraries,
            budgets, packing, and shared links.
          </p>
        </div>
      </aside>

      {/* ── Right: fixed logo bar + scrollable form ── */}
      <main className="auth-split__main">
        {/* Logo bar — pinned, never scrolls */}
        <div className="auth-split__logo-bar">
          <LogoMark size={30} />
          <span className="auth-split__logo-name">Traveloop</span>
        </div>

        {/* Scrollable form area */}
        <div className="auth-split__scroll">
          <div className="auth-split__main-inner">{children}</div>
        </div>
      </main>
    </div>
  );
}
