import os
import socket

from fastapi import Request

from app.core.config import settings


def runtime_identity() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "container": os.getenv("CONTAINER_NAME") or os.getenv("HOSTNAME") or socket.gethostname(),
    }


def caller_identity(request: Request) -> dict[str, str | None]:
    return {
        "caller_service": request.headers.get("x-caller-service")
        or request.headers.get("x-service-name")
        or request.headers.get("x-forwarded-service"),
        "caller_container": request.headers.get("x-caller-container")
        or request.headers.get("x-container-name")
        or request.headers.get("x-forwarded-container"),
    }
