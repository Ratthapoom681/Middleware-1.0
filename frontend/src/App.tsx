import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { Logs } from "./pages/Logs";
import { FeatureA } from "./pages/FeatureA";
import { FeatureB } from "./pages/FeatureB";
import { NotFound } from "./pages/NotFound";
import { Search } from "./pages/Search";

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <div className="app-content">
        <Sidebar />
        <section className="page-shell">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/search" element={<Search />} />
            <Route path="/feature-a" element={<FeatureA />} />
            <Route path="/feature-b" element={<FeatureB />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </section>
      </div>
    </div>
  );
}
