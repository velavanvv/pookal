from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ModelPricing(BaseModel):
    prompt: str = "0"
    completion: str = "0"
    image: Optional[str] = "0"
    request: Optional[str] = "0"


class ModelInfo(BaseModel):
    id: str = Field(description="OpenRouter model ID e.g. meta-llama/llama-3.3-70b-instruct:free")
    name: str = Field(description="Display name of the model")
    family: str = Field(description="Model family e.g. meta-llama, google, mistralai, deepseek, qwen, openai, anthropic")
    is_free: bool = Field(default=False, description="Whether the model is completely free to use on OpenRouter")
    context_length: Optional[int] = Field(default=None, description="Max token context window")
    description: Optional[str] = Field(default=None, description="Short summary of model capabilities")
    supports_vision: bool = Field(default=False, description="Whether model supports image / multimodal inputs")
    pricing: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Pricing details per million tokens")


class ModelFamilySummary(BaseModel):
    id: str = Field(description="Family identifier e.g. meta-llama, google, deepseek")
    name: str = Field(description="Display name e.g. Meta Llama, Google Gemini")
    description: str = Field(description="Summary of family capabilities")
    free_models: List[str] = Field(default_factory=list, description="Available free models in this family")
    recommended_paid: List[str] = Field(default_factory=list, description="Recommended paid models in this family")


class TaskRouteInfo(BaseModel):
    task: str = Field(description="Task identifier e.g. copilot, vision, reasoning, fast")
    primary_model: str = Field(description="Primary model routed for this task")
    fallback_models: List[str] = Field(default_factory=list, description="Ordered fallback models if primary is overloaded")
    description: str = Field(description="Description of what this route handles")


class RoutesConfigResponse(BaseModel):
    active_provider: str
    openrouter_configured: bool
    routes: Dict[str, TaskRouteInfo]


class ModelCatalogResponse(BaseModel):
    total_models: int
    free_models_count: int
    families: List[str]
    models: List[ModelInfo]


class ModelTestRequest(BaseModel):
    prompt: str = Field(default="Hello, test connection to model routing", description="Prompt text to evaluate")
    task: Optional[str] = Field(default="copilot", description="Routing task category: copilot, vision, reasoning, fast")
    model: Optional[str] = Field(default=None, description="Specific model ID to test (overrides route primary)")
    fallbacks: Optional[List[str]] = Field(default=None, description="Custom fallback chain to test")


class ModelTestResponse(BaseModel):
    model_used: str
    reply: str
    latency_ms: float
    fallback_triggered: bool = False
    provider: str = "openrouter"
