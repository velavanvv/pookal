import logging
from fastapi import APIRouter, HTTPException
from schemas.copilot import CopilotRequest, CopilotResponse
from schemas.common import ApiResponse
from services.copilot_service import copilot_service

logger = logging.getLogger("ai_service.routers.copilot")
router = APIRouter(prefix="/api/v1/copilot", tags=["Merchant AI Copilot"])


@router.post("/chat", response_model=ApiResponse[CopilotResponse])
async def chat_with_copilot(request: CopilotRequest):
    try:
        response = await copilot_service.chat(request)
        return ApiResponse(
            success=True,
            message="Copilot response generated",
            data=response
        )
    except Exception as e:
        logger.error(f"Copilot chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Copilot inference error: {str(e)}")
