import logging
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from schemas.common import ApiResponse
from schemas.models import (
    ModelInfo,
    ModelFamilySummary,
    RoutesConfigResponse,
    ModelCatalogResponse,
    ModelTestRequest,
    ModelTestResponse,
)
from services.openrouter_client import openrouter_service
from services.llm_client import llm_client
from config import settings

logger = logging.getLogger("ai_service.routers.models")
router = APIRouter(prefix="/api/v1/models", tags=["OpenRouter Models & Routing"])


@router.get("", response_model=ApiResponse[ModelCatalogResponse])
async def list_models(
    free_only: bool = Query(default=False, description="Filter to only free models"),
    family: Optional[str] = Query(default=None, description="Filter by family: meta-llama, google, deepseek, mistralai, qwen, openai, anthropic"),
    modality: Optional[str] = Query(default=None, description="Filter by capability e.g. vision"),
):
    """
    List available AI models accessible via OpenRouter.
    Includes free tier models and filter parameters.
    """
    try:
        models = await openrouter_service.get_models(
            free_only=free_only,
            family=family,
            modality=modality
        )
        families = [f.id for f in openrouter_service.get_families()]
        free_count = sum(1 for m in models if m.is_free)

        catalog_resp = ModelCatalogResponse(
            total_models=len(models),
            free_models_count=free_count,
            families=families,
            models=models
        )
        return ApiResponse(
            success=True,
            message=f"Retrieved {len(models)} models",
            data=catalog_resp
        )
    except Exception as e:
        logger.error(f"Failed to list models: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model catalog retrieval error: {str(e)}")


@router.get("/families", response_model=ApiResponse[List[ModelFamilySummary]])
async def list_families():
    """
    Get supported AI model families with categorized free and recommended choices.
    """
    families = openrouter_service.get_families()
    return ApiResponse(
        success=True,
        message="Model families retrieved successfully",
        data=families
    )


@router.get("/routes", response_model=ApiResponse[RoutesConfigResponse])
async def get_routes_configuration():
    """
    View current model routing and fallback configurations for different tasks.
    """
    routes = openrouter_service.get_routes()
    return ApiResponse(
        success=True,
        message="Model routes retrieved successfully",
        data=RoutesConfigResponse(
            active_provider=llm_client.get_active_provider(),
            openrouter_configured=llm_client.openrouter_configured,
            routes=routes
        )
    )


@router.post("/test", response_model=ApiResponse[ModelTestResponse])
async def test_model_route(request: ModelTestRequest):
    """
    Test prompt execution against a specific model or configured task route with fallback protection.
    """
    if not llm_client.openrouter_configured:
        # Mock testing response for offline environments
        primary, _ = openrouter_service.resolve_route(request.task or "copilot", request.model, request.fallbacks)
        return ApiResponse(
            success=True,
            message="Test executed in simulated mock mode (OpenRouter API key not configured)",
            data=ModelTestResponse(
                model_used=primary,
                reply=f"Simulated test response for '{request.prompt}' via {primary}",
                latency_ms=12.5,
                fallback_triggered=False,
                provider="mock"
            )
        )

    try:
        messages = [
            {"role": "system", "content": "You are a concise AI test responder. Reply in 1-2 short sentences."},
            {"role": "user", "content": request.prompt}
        ]
        result = await openrouter_service.chat_completion(
            messages=messages,
            task=request.task or "copilot",
            model=request.model,
            fallback_models=request.fallbacks,
            temperature=0.3,
            max_tokens=150
        )
        return ApiResponse(
            success=True,
            message="Model test completed successfully",
            data=ModelTestResponse(
                model_used=result["model_used"],
                reply=result["content"].strip(),
                latency_ms=result["latency_ms"],
                fallback_triggered=result["fallback_triggered"],
                provider="openrouter"
            )
        )
    except Exception as e:
        logger.error(f"Model test error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model routing test error: {str(e)}")
