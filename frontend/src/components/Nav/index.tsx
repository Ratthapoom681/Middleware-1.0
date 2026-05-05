import { Link } from "react-router-dom";

export function Nav() {
  return (
    <header
      style={{
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        gap: 16,
        height: 64,
        padding: "0 24px"
      }}
    >
      <strong>My App</strong>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Dashboard</Link>
        <Link to="/feature-a">Feature A</Link>
        <Link to="/feature-b">Feature B</Link>
      </nav>
    </header>
  );
}

