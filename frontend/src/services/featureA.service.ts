import axios from "axios";

export interface DojoConfig {
  url: string;
  apiKey: string;
  productId: string;
  engagementId: string;
  testId: string;
  verifySSL: boolean;
  autoSync: boolean;
}

export interface DojoFinding {
  id: number;
  title: string;
  severity: string;
  status: string;
  cwe: number | null;
  date: string | null;
  active: boolean;
  verified: boolean;
  description?: string;
}

export interface DojoProduct {
  id: number;
  name: string;
  description?: string;
}

export interface DojoEngagement {
  id: number;
  name: string;
  status?: string;
  product?: number;
}

export interface DojoTest {
  id: number;
  title: string;
  test_type_name?: string;
  engagement?: number;
}

const CONFIG_KEY = "dojo_config";

export function saveDojoConfig(cfg: DojoConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function loadDojoConfig(): DojoConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DojoConfig;
  } catch {
    return null;
  }
}

/**
 * Extract readable error message from Axios or generic errors.
 * The backend returns { "detail": "..." } on errors.
 */
export function extractError(e: unknown): string {
  // Axios error with response from server
  if (axios.isAxiosError(e) && e.response) {
    const data = e.response.data;
    // FastAPI returns {"detail": "..."} on HTTPException
    if (data?.detail) {
      return typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    }
    if (data?.message) return data.message;
    return `Server error (HTTP ${e.response.status})`;
  }
  // Axios error without response (network issue)
  if (axios.isAxiosError(e) && !e.response) {
    return e.message || "Network error — cannot reach the backend server";
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

// ─── Proxy helper ─────────────────────────────────────────────────────────────
async function dojoProxy(cfg: DojoConfig, endpoint: string, params: Record<string, string> = {}) {
  const res = await axios.post("/api/dojo/proxy", { cfg, endpoint, params });
  return res.data;
}

// ─── API functions ────────────────────────────────────────────────────────────
export async function testDojoConnection(cfg: DojoConfig): Promise<string> {
  await dojoProxy(cfg, "/api/v2/products/", { limit: "1" });
  return "Connection successful";
}

export async function fetchFindings(cfg: DojoConfig): Promise<DojoFinding[]> {
  const params: Record<string, string> = { limit: "200" };
  if (cfg.productId) params.product = cfg.productId;
  if (cfg.engagementId) params.engagement = cfg.engagementId;
  if (cfg.testId) params.test = cfg.testId;
  const data = await dojoProxy(cfg, "/api/v2/findings/", params);
  return (data.results ?? []) as DojoFinding[];
}

export async function fetchProducts(cfg: DojoConfig): Promise<DojoProduct[]> {
  const data = await dojoProxy(cfg, "/api/v2/products/", { limit: "100" });
  return (data.results ?? []) as DojoProduct[];
}

export async function fetchEngagements(cfg: DojoConfig): Promise<DojoEngagement[]> {
  const data = await dojoProxy(cfg, "/api/v2/engagements/", { limit: "100" });
  return (data.results ?? []) as DojoEngagement[];
}

export async function fetchTests(cfg: DojoConfig): Promise<DojoTest[]> {
  const data = await dojoProxy(cfg, "/api/v2/tests/", { limit: "100" });
  return (data.results ?? []) as DojoTest[];
}

/** Persist findings to Postgres via our backend API */
export async function syncFindingsToPostgres(
  findings: DojoFinding[],
  dojoUrl: string
): Promise<void> {
  const payload = {
    findings: findings.map((f) => ({
      dojo_id: f.id,
      title: f.title,
      severity: f.severity,
      status: f.status,
      cwe: f.cwe ?? null,
      date: f.date ?? null,
      active: f.active,
      verified: f.verified,
      description: f.description ?? null,
      dojo_url: dojoUrl,
    })),
  };
  await axios.post("/api/dojo/findings", payload);
}
