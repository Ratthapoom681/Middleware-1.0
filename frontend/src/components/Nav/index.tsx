import { NavLink } from "react-router-dom";

const navClassName = ({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link");

export function Nav() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Middleware 1.0</p>
        <strong>Service Console</strong>
      </div>
      <nav className="topbar-nav">
        <NavLink className={navClassName} to="/">
          Dashboard
        </NavLink>
        <NavLink className={navClassName} to="/search">
          Search
        </NavLink>
        <NavLink className={navClassName} to="/feature-a">
          Feature A
        </NavLink>
        <NavLink className={navClassName} to="/feature-b">
          Feature B
        </NavLink>
      </nav>
    </header>
  );
}
