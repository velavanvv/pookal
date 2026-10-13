from fastapi import APIRouter
from schemas.common import HealthResponse, ApiResponse
from services.llm_client import llm_client
from config import settings

router = APIRouter(prefix="/api/v1", tags=["Health & Status"])


@router.get("/health", response_model=ApiResponse[HealthResponse])
async def health_check():
    health = HealthResponse(
        status="ok",
        version=settings.VERSION,
        active_provider=llm_client.get_active_provider(),
        gemini_configured=llm_client.gemini_configured,
        openai_configured=llm_client.openai_configured,
        openrouter_configured=llm_client.openrouter_configured,
        openrouter_default_model=settings.OPENROUTER_DEFAULT_MODEL if llm_client.openrouter_configured else None,
    )
    return ApiResponse(
        success=True,
        message="AI Microservice is healthy and operational",
        data=health,
    )
