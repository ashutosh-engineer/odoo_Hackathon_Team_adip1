/*
 * PageLoader — lightweight branded loading placeholder.
 */

export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader page-loader--branded">
      <div className="page-loader__orbit" aria-hidden />
      <p className="page-loader__text">{label}</p>
    </div>
  );
}
