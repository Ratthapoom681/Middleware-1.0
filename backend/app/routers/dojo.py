import logging
import traceback

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.dojo import BulkUpsertRequest, DojoFindingResponse
from app.services.dojo_service import list_findings, upsert_findings

logger = logging.getLogger("dojo")

router = APIRouter()


# ─── Proxy ─────────────────────────────────────────────────────────────────────
@router.post("/proxy")
async def proxy_dojo_request(request: Request):
    """
    Proxy requests to an external DefectDojo instance.
    Bypasses CORS, honours the verifySSL toggle, and returns structured errors.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    cfg = payload.get("cfg", {})
    endpoint = payload.get("endpoint", "")
    params = payload.get("params", {})

    # ── Validate config ──────────────────────────────────────────────────────
    base_url = (cfg.get("url") or "").strip().rstrip("/")
    api_key = (cfg.get("apiKey") or "").strip()

    if not base_url:
        raise HTTPException(status_code=400, detail="Missing DefectDojo URL")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing DefectDojo API Key")

    if not base_url.startswith("http"):
        base_url = "https://" + base_url

    url = base_url + endpoint
    verify_ssl = cfg.get("verifySSL", True)

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # ── Make request to DefectDojo ────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(verify=verify_ssl, timeout=20.0) as client:
            resp = await client.get(url, params=params, headers=headers)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot connect to DefectDojo at {base_url} — check the URL and make sure DefectDojo is running",
        )
    except httpx.ConnectTimeout:
        raise HTTPException(
            status_code=504,
            detail=f"Connection timeout reaching {base_url}",
        )
    except httpx.ReadTimeout:
        raise HTTPException(
            status_code=504,
            detail="DefectDojo took too long to respond (read timeout)",
        )
    except httpx.UnsupportedProtocol:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported protocol in URL: {base_url}",
        )
    except Exception as exc:
        logger.error("Proxy error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach DefectDojo: {type(exc).__name__}: {exc}",
        )

    # ── Interpret DefectDojo response (outside try so HTTPException propagates) ──
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid API Key — DefectDojo returned 401 Unauthorized")
    if resp.status_code == 403:
        raise HTTPException(status_code=403, detail="Forbidden — check API Key permissions")
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Endpoint not found: {endpoint}")
    if resp.status_code >= 400:
        body = resp.text[:300]
        raise HTTPException(status_code=resp.status_code, detail=f"DefectDojo returned {resp.status_code}: {body}")

    return resp.json()


# ─── Findings CRUD ─────────────────────────────────────────────────────────────
@router.post("/findings", status_code=200)
def sync_findings(payload: BulkUpsertRequest, db: Session = Depends(get_db)):
    """Upsert a batch of DefectDojo findings into Postgres."""
    try:
        rows = upsert_findings(db, payload.findings)
        return {"success": True, "count": len(rows)}
    except Exception as exc:
        logger.error("sync_findings error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database insert failed: {exc}")


@router.get("/findings", response_model=list[DojoFindingResponse])
def get_findings(db: Session = Depends(get_db)):
    """Return all synced findings from Postgres."""
    try:
        return list_findings(db)
    except Exception as exc:
        logger.error("get_findings error: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database read failed: {exc}")
