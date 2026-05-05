import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="panel">
      <h1>Not found</h1>
      <p className="section-copy">The page you requested is not part of the current scaffold.</p>
      <Link className="button button--secondary" to="/">
        Back to dashboard
      </Link>
    </div>
  );
}
