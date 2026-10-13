import os
from pydantic_settings import BaseSettings
from typing import Optional, List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    APP_NAME: str = "UBP AI Service"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = True

    # OpenRouter API Configuration
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_SITE_URL: str = "https://ubp.pookal.local"
    OPENROUTER_APP_NAME: str = "UBP Business Intelligence"

    # OpenRouter Default Models & Task Routing
    OPENROUTER_DEFAULT_MODEL: str = "openrouter/free"
    OPENROUTER_COPILOT_MODEL: str = "openrouter/free"
    OPENROUTER_VISION_MODEL: str = "google/gemini-2.0-flash-exp:free"
    OPENROUTER_REASONING_MODEL: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    OPENROUTER_FAST_MODEL: str = "nvidia/nemotron-3.5-lightning:free"

    # Fallback model chains
    OPENROUTER_FALLBACK_MODELS: List[str] = [
        "openrouter/free",
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free",
        "google/gemma-4-31b-it:free",
    ]
    OPENROUTER_COPILOT_FALLBACKS: List[str] = [
        "openrouter/free",
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free",
    ]
    OPENROUTER_VISION_FALLBACKS: List[str] = [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free",
        "google/gemini-flash-1.5",
        "openai/gpt-4o-mini"
    ]

    # LLM Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # Providers: "openrouter" | "gemini" | "openai" | "mock"
    DEFAULT_AI_PROVIDER: str = "openrouter"
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"

    @field_validator(
        "OPENROUTER_FALLBACK_MODELS",
        "OPENROUTER_COPILOT_FALLBACKS",
        "OPENROUTER_VISION_FALLBACKS",
        mode="before"
    )
    @classmethod
    def parse_str_list(cls, v):
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                import json
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [item.strip() for item in v_stripped.split(",") if item.strip()]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()
