import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { FeatureA } from "./pages/FeatureA";
import { FeatureB } from "./pages/FeatureB";
import { NotFound } from "./pages/NotFound";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-content">
        <Sidebar />
        <section className="page-shell">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/feature-a" element={<FeatureA />} />
            <Route path="/feature-b" element={<FeatureB />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}
