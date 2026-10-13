import json
import logging
from typing import Optional, Dict, Any, Type
from pydantic import BaseModel
from config import settings

logger = logging.getLogger("ai_service.llm_client")

# Optional imports for Gemini and OpenAI
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


from services.openrouter_client import openrouter_service

class LLMClient:
    def __init__(self):
        self.gemini_configured = False
        self.openai_configured = False
        self.openai_client = None

        if settings.GEMINI_API_KEY and genai:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_configured = True
            logger.info("Google Gemini client initialized successfully.")

        if settings.OPENAI_API_KEY and OpenAI:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self.openai_configured = True
            logger.info("OpenAI client initialized successfully.")

        self.openrouter_configured = openrouter_service.is_configured
        if self.openrouter_configured:
            logger.info("OpenRouter client initialized successfully with unified multi-model routing.")

    def get_active_provider(self) -> str:
        preferred = settings.DEFAULT_AI_PROVIDER.lower()
        if preferred == "openrouter" and self.openrouter_configured:
            return "openrouter"
        if preferred == "gemini" and self.gemini_configured:
            return "gemini"
        if preferred == "openai" and self.openai_configured:
            return "openai"

        # Automatic detection hierarchy
        if self.openrouter_configured:
            return "openrouter"
        if self.gemini_configured:
            return "gemini"
        if self.openai_configured:
            return "openai"
        return "mock"


llm_client = LLMClient()

