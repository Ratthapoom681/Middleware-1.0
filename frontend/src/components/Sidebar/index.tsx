import { NavLink } from "react-router-dom";
import { useAppStore } from "../../store";

const navClassName = ({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link");

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside className="sidebar">
      <p className="sidebar-title">Navigate</p>
      <nav className="sidebar-nav">
        <NavLink className={navClassName} to="/">
          Overview
        </NavLink>
        <NavLink className={navClassName} to="/search">
          Search Index
        </NavLink>
        <NavLink className={navClassName} to="/feature-a">
          Feature A
        </NavLink>
        <NavLink className={navClassName} to="/feature-b">
          Feature B
        </NavLink>
        <NavLink className={navClassName} to="/settings">
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
