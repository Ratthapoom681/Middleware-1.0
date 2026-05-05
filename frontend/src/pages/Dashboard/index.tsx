import { Button } from "../../components/Button";
import { useAppStore } from "../../store";

export function Dashboard() {
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Summary stats and quick links go here.</p>
      <Button onClick={toggleSidebar}>Toggle sidebar</Button>
    </div>
  );
}

