import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { FeatureA } from "./pages/FeatureA";
import { FeatureB } from "./pages/FeatureB";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <div>
      <Nav />
      <main style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
        <Sidebar />
        <section style={{ flex: 1, padding: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/feature-a" element={<FeatureA />} />
            <Route path="/feature-b" element={<FeatureB />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}

