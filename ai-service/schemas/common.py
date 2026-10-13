from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    active_provider: str
    gemini_configured: bool
    openai_configured: bool
    openrouter_configured: bool = False
    openrouter_default_model: Optional[str] = None
