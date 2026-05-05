import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div>
      <h1>Not found</h1>
      <Link to="/">Back to dashboard</Link>
    </div>
  );
}

