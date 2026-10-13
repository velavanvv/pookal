from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(description="Role of the sender: user, assistant, system")
    content: str = Field(description="Text content of the message")


class CopilotRequest(BaseModel):
    prompt: str = Field(description="User query or command")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Shop context (shop_name, vertical, total_products, active_orders)")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation history")
    model: Optional[str] = Field(default=None, description="Optional OpenRouter model ID override (e.g. meta-llama/llama-3.3-70b-instruct:free)")
    fallbacks: Optional[List[str]] = Field(default=None, description="Optional ordered list of fallback models")


class SuggestedAction(BaseModel):
    action_type: str = Field(description="Type of action: CREATE_CAMPAIGN, RESTOCK_ITEM, NAVIGATE, VIEW_REPORT")
    title: str = Field(description="Human readable button label")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Data needed by frontend to execute action")


class CopilotResponse(BaseModel):
    reply: str = Field(description="AI response formatted in clean markdown")
    intent: str = Field(description="Detected user intent e.g. QUERY_INVENTORY, GENERATE_CAMPAIGN, BILLING_HELP, GENERAL")
    suggested_actions: List[SuggestedAction] = Field(default_factory=list, description="One-click executable actions for the shopkeeper")
    model_used: Optional[str] = Field(default=None, description="Model ID that generated the response")
    provider: Optional[str] = Field(default=None, description="AI provider used (openrouter, gemini, openai, mock)")

