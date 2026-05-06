from fastapi import HTTPException, Request, status

from app.core.config import settings


def extract_api_key(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return request.headers.get("x-api-key", "").strip()


def is_authenticated(request: Request) -> bool:
    if not settings.auth_enabled:
        request.state.actor = "anonymous"
        return True

    api_key = extract_api_key(request)
    if settings.api_key and api_key == settings.api_key:
        request.state.actor = "api-key"
        return True

    return False


def current_actor(request: Request) -> str:
    actor = getattr(request.state, "actor", None)
    if isinstance(actor, str) and actor:
        return actor
    if not is_authenticated(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid API key required",
        )
    return getattr(request.state, "actor", "api-key")
