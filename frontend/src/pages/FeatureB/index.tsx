import { useFetch } from "../../hooks/useFetch";

type HealthResponse = {
  status: string;
};

export function FeatureB() {
  const { data, error, loading } = useFetch<HealthResponse>("/api/health");

  return (
    <div>
      <h1>Feature B</h1>
      {loading && <p>Loading backend status...</p>}
      {error && <p>{error}</p>}
      {data && <p>Backend status: {data.status}</p>}
    </div>
  );
}

