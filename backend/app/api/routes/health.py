"""Health-check endpoints used by local and container readiness checks."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Backend health check")
async def health_check() -> dict[str, str]:
    """Return a minimal status payload for uptime checks."""

    return {"status": "ok"}
