from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Backend health check")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
