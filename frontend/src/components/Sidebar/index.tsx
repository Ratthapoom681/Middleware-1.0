import { Link } from "react-router-dom";
import { useAppStore } from "../../store";

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside
      style={{
        borderRight: "1px solid #e5e7eb",
        minWidth: 220,
        padding: 24
      }}
    >
      <nav style={{ display: "grid", gap: 10 }}>
        <Link to="/">Overview</Link>
        <Link to="/feature-a">Feature A</Link>
        <Link to="/feature-b">Feature B</Link>
      </nav>
    </aside>
  );
}

