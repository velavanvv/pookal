import base64
import json
import logging
import time
from typing import Dict, Any, List, Optional, Tuple
import httpx
from openai import AsyncOpenAI
from config import settings
from schemas.models import ModelInfo, ModelFamilySummary, TaskRouteInfo

logger = logging.getLogger("ai_service.openrouter")

# Curated registry of model families and prominent models (free & paid)
CURATED_MODEL_FAMILIES: Dict[str, Dict[str, Any]] = {
    "meta-llama": {
        "name": "Meta Llama",
        "description": "Meta's open-weights frontier LLMs optimized for reasoning, dialogue, and coding.",
        "free_models": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "meta-llama/llama-3.2-11b-vision-instruct:free",
            "meta-llama/llama-3.2-3b-instruct:free",
        ],
        "recommended_paid": [
            "meta-llama/llama-3.3-70b-instruct",
            "meta-llama/llama-3.1-405b-instruct"
        ]
    },
    "google": {
        "name": "Google Gemini",
        "description": "Google's multimodal intelligence models with long contexts and rapid inference.",
        "free_models": [
            "google/gemini-2.0-flash-exp:free",
            "google/gemini-2.0-flash-thinking-exp:free",
        ],
        "recommended_paid": [
            "google/gemini-flash-1.5",
            "google/gemini-pro-1.5",
            "google/gemini-2.0-flash-exp"
        ]
    },
    "deepseek": {
        "name": "DeepSeek",
        "description": "High-efficiency open models excelling at advanced reasoning and mathematics.",
        "free_models": [
            "deepseek/deepseek-r1:free",
            "deepseek/deepseek-chat:free",
            "deepseek/deepseek-r1-distill-llama-70b:free",
        ],
        "recommended_paid": [
            "deepseek/deepseek-r1",
            "deepseek/deepseek-chat"
        ]
    },
    "mistralai": {
        "name": "Mistral AI",
        "description": "Fast, high-performance European open models with precise instruction following.",
        "free_models": [
            "mistralai/mistral-7b-instruct:free",
            "mistralai/mistral-small-3:free",
        ],
        "recommended_paid": [
            "mistralai/mistral-large",
            "mistralai/mistral-small"
        ]
    },
    "qwen": {
        "name": "Alibaba Qwen",
        "description": "State-of-the-art multilingual and coding models by Alibaba Cloud.",
        "free_models": [
            "qwen/qwen-2.5-coder-32b-instruct:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "qwen/qwq-32b-preview:free",
        ],
        "recommended_paid": [
            "qwen/qwen-2.5-72b-instruct",
            "qwen/qwen-max"
        ]
    },
    "openai": {
        "name": "OpenAI",
        "description": "Industry-standard GPT models available through OpenRouter unified billing.",
        "free_models": [],
        "recommended_paid": [
            "openai/gpt-4o-mini",
            "openai/gpt-4o",
            "openai/o1-mini"
        ]
    },
    "anthropic": {
        "name": "Anthropic Claude",
        "description": "Frontier models with nuanced conversational abilities and code generation.",
        "free_models": [],
        "recommended_paid": [
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-5-haiku"
        ]
    }
}

CURATED_MODEL_CATALOG: List[ModelInfo] = [
    ModelInfo(
        id="meta-llama/llama-3.3-70b-instruct:free",
        name="Meta: Llama 3.3 70B Instruct (free)",
        family="meta-llama",
        is_free=True,
        context_length=131072,
        description="Flagship open-source model with 70B parameters. Exceptional general reasoning.",
        supports_vision=False
    ),
    ModelInfo(
        id="google/gemini-2.0-flash-exp:free",
        name="Google: Gemini 2.0 Flash Experimental (free)",
        family="google",
        is_free=True,
        context_length=1048576,
        description="Next-generation multimodal model from Google with ultra-fast latency.",
        supports_vision=True
    ),
    ModelInfo(
        id="deepseek/deepseek-r1:free",
        name="DeepSeek: R1 Reasoning (free)",
        family="deepseek",
        is_free=True,
        context_length=65536,
        description="Open reasoning model competing with OpenAI o1 for complex multi-step reasoning.",
        supports_vision=False
    ),
    ModelInfo(
        id="meta-llama/llama-3.2-11b-vision-instruct:free",
        name="Meta: Llama 3.2 11B Vision (free)",
        family="meta-llama",
        is_free=True,
        context_length=131072,
        description="Multimodal open model capable of visual reasoning, OCR, and document inspection.",
        supports_vision=True
    ),
    ModelInfo(
        id="mistralai/mistral-7b-instruct:free",
        name="Mistral: 7B Instruct (free)",
        family="mistralai",
        is_free=True,
        context_length=32768,
        description="Lightweight and reliable general instruction assistant.",
        supports_vision=False
    ),
    ModelInfo(
        id="qwen/qwen-2.5-coder-32b-instruct:free",
        name="Qwen: 2.5 Coder 32B Instruct (free)",
        family="qwen",
        is_free=True,
        context_length=32768,
        description="Specialized high-capacity coding and structured data extraction model.",
        supports_vision=False
    ),
    ModelInfo(
        id="meta-llama/llama-3.1-8b-instruct:free",
        name="Meta: Llama 3.1 8B Instruct (free)",
        family="meta-llama",
        is_free=True,
        context_length=131072,
        description="Ultra-fast, low-latency text model for quick operational chats.",
        supports_vision=False
    ),
    ModelInfo(
        id="google/gemini-2.0-flash-thinking-exp:free",
        name="Google: Gemini 2.0 Flash Thinking Experimental (free)",
        family="google",
        is_free=True,
        context_length=1048576,
        description="Chain-of-thought thinking model from Google with visual context awareness.",
        supports_vision=True
    ),
    ModelInfo(
        id="deepseek/deepseek-chat:free",
        name="DeepSeek: V3 Chat (free)",
        family="deepseek",
        is_free=True,
        context_length=65536,
        description="DeepSeek general conversational model with strong multilingual skills.",
        supports_vision=False
    ),
    ModelInfo(
        id="openai/gpt-4o-mini",
        name="OpenAI: GPT-4o Mini",
        family="openai",
        is_free=False,
        context_length=128000,
        description="Cost-effective multimodal GPT model with high intelligence.",
        supports_vision=True
    ),
    ModelInfo(
        id="anthropic/claude-3.5-sonnet",
        name="Anthropic: Claude 3.5 Sonnet",
        family="anthropic",
        is_free=False,
        context_length=200000,
        description="Industry benchmark for reasoning, coding, and complex instructions.",
        supports_vision=True
    )
]


class OpenRouterService:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self._cached_live_models: List[ModelInfo] = []
        self._last_catalog_fetch: float = 0.0
        self._cache_ttl: float = 300.0  # 5 minutes cache
        self.is_configured: bool = bool(settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY.strip()) > 0)



    def get_client(self) -> AsyncOpenAI:
        if self._client is None and self.is_configured:
            headers = {
                "HTTP-Referer": settings.OPENROUTER_SITE_URL,
                "X-Title": settings.OPENROUTER_APP_NAME,
            }
            self._client = AsyncOpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
                default_headers=headers,
                timeout=45.0,
            )
        return self._client

    def get_families(self) -> List[ModelFamilySummary]:
        """Returns supported model families with free and recommended models."""
        summaries = []
        for fam_id, data in CURATED_MODEL_FAMILIES.items():
            summaries.append(ModelFamilySummary(
                id=fam_id,
                name=data["name"],
                description=data["description"],
                free_models=data["free_models"],
                recommended_paid=data["recommended_paid"]
            ))
        return summaries

    async def get_models(
        self,
        free_only: bool = False,
        family: Optional[str] = None,
        modality: Optional[str] = None
    ) -> List[ModelInfo]:
        """
        Fetches models from OpenRouter's live API if configured, falling back to curated registry.
        Supports filtering by free_only, family, and modality.
        """
        models = await self._fetch_live_models_or_fallback()

        filtered = []
        for m in models:
            if free_only and not m.is_free:
                continue
            if family and m.family.lower() != family.lower():
                continue
            if modality == "vision" and not m.supports_vision:
                continue
            filtered.append(m)

        return filtered

    async def _fetch_live_models_or_fallback(self) -> List[ModelInfo]:
        now = time.time()
        if self._cached_live_models and (now - self._last_catalog_fetch) < self._cache_ttl:
            return self._cached_live_models

        # Attempt live fetch if API key is present
        if self.is_configured:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{settings.OPENROUTER_BASE_URL}/models",
                        headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
                    )
                    if resp.status_code == 200:
                        data = resp.json().get("data", [])
                        parsed_models: List[ModelInfo] = []
                        for item in data:
                            model_id = item.get("id", "")
                            name = item.get("name", model_id)
                            desc = item.get("description", "")
                            context = item.get("context_length")
                            pricing = item.get("pricing", {})
                            
                            is_free = (
                                model_id.endswith(":free") or 
                                (str(pricing.get("prompt", "1")) == "0" and str(pricing.get("completion", "1")) == "0")
                            )

                            # Determine family
                            family = model_id.split("/")[0] if "/" in model_id else "other"

                            # Architecture check for vision
                            arch = item.get("architecture", {})
                            mod = arch.get("modality", "")
                            supports_vision = ("image" in mod) or ("vision" in model_id.lower())

                            parsed_models.append(ModelInfo(
                                id=model_id,
                                name=name,
                                family=family,
                                is_free=is_free,
                                context_length=context,
                                description=desc,
                                supports_vision=supports_vision,
                                pricing=pricing
                            ))

                        if parsed_models:
                            self._cached_live_models = parsed_models
                            self._last_catalog_fetch = now
                            logger.info(f"Loaded {len(parsed_models)} live models from OpenRouter API.")
                            return self._cached_live_models
            except Exception as e:
                logger.warning(f"Could not fetch live models from OpenRouter ({e}). Using curated catalog.")

        return CURATED_MODEL_CATALOG

    def get_routes(self) -> Dict[str, TaskRouteInfo]:
        """Returns the active task routing and fallback configurations."""
        return {
            "copilot": TaskRouteInfo(
                task="copilot",
                primary_model=settings.OPENROUTER_COPILOT_MODEL,
                fallback_models=settings.OPENROUTER_COPILOT_FALLBACKS,
                description="Conversational intelligence and business action generation for merchant copilot."
            ),
            "vision": TaskRouteInfo(
                task="vision",
                primary_model=settings.OPENROUTER_VISION_MODEL,
                fallback_models=settings.OPENROUTER_VISION_FALLBACKS,
                description="Multimodal OCR and receipt/invoice document analysis."
            ),
            "reasoning": TaskRouteInfo(
                task="reasoning",
                primary_model=settings.OPENROUTER_REASONING_MODEL,
                fallback_models=[
                    settings.OPENROUTER_REASONING_MODEL,
                    "google/gemini-2.0-flash-thinking-exp:free",
                    "meta-llama/llama-3.3-70b-instruct:free"
                ],
                description="Deep reasoning and calculation tasks (e.g., inventory forecasting)."
            ),
            "fast": TaskRouteInfo(
                task="fast",
                primary_model=settings.OPENROUTER_FAST_MODEL,
                fallback_models=[
                    settings.OPENROUTER_FAST_MODEL,
                    "mistralai/mistral-7b-instruct:free",
                    "meta-llama/llama-3.2-3b-instruct:free"
                ],
                description="Low-latency quick summaries and auto-completions."
            )
        }

    def resolve_route(
        self,
        task: str = "copilot",
        preferred_model: Optional[str] = None,
        preferred_fallbacks: Optional[List[str]] = None
    ) -> Tuple[str, List[str]]:
        """
        Determines the primary model and fallback model chain.
        """
        routes = self.get_routes()
        default_route = routes.get(task, routes["copilot"])

        primary = preferred_model or default_route.primary_model
        
        if preferred_fallbacks is not None:
            fallbacks = [m for m in preferred_fallbacks if m != primary]
        else:
            fallbacks = [m for m in default_route.fallback_models if m != primary]

        # Always ensure at least primary + fallbacks list has alternatives
        if not fallbacks:
            fallbacks = [m for m in settings.OPENROUTER_FALLBACK_MODELS if m != primary]

        return primary, fallbacks

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        task: str = "copilot",
        model: Optional[str] = None,
        fallback_models: Optional[List[str]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> Dict[str, Any]:
        """
        Executes chat completion with dual-layer fallback resilience:
        1. OpenRouter server-side fallback (`models` list parameter)
        2. Application client-side retry across candidate models on network/API failure
        """
        primary_model, fallbacks = self.resolve_route(task, model, fallback_models)
        all_candidate_models = [primary_model] + fallbacks

        client = self.get_client()
        if not client:
            raise RuntimeError("OpenRouter API key is not configured. Please set OPENROUTER_API_KEY.")

        start_time = time.time()
        last_error = None

        # Try with primary model + server-side OpenRouter fallback
        try:
            extra_body: Dict[str, Any] = {
                "route": "fallback"
            }
            if fallbacks:
                extra_body["models"] = all_candidate_models[:3]

            response = await client.chat.completions.create(
                model=primary_model,
                messages=messages,
                extra_body=extra_body,
                temperature=temperature,
                max_tokens=max_tokens
            )
            elapsed = (time.time() - start_time) * 1000
            actual_model = getattr(response, "model", primary_model) or primary_model
            raw_msg = response.choices[0].message
            content = (raw_msg.content or getattr(raw_msg, "reasoning", "") or "").strip()

            return {
                "content": content,
                "model_used": actual_model,
                "latency_ms": round(elapsed, 2),
                "fallback_triggered": actual_model != primary_model
            }
        except Exception as e:
            logger.warning(f"OpenRouter primary call ({primary_model}) failed: {e}. Initiating client-side model fallback chain.")
            last_error = e

        # Client-side fallback retry loop across remaining candidates
        for fallback_candidate in fallbacks:
            try:
                logger.info(f"Falling back to candidate model: {fallback_candidate}")
                fb_start = time.time()
                response = await client.chat.completions.create(
                    model=fallback_candidate,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                elapsed = (time.time() - fb_start) * 1000
                actual_model = getattr(response, "model", fallback_candidate) or fallback_candidate
                raw_msg = response.choices[0].message
                content = (raw_msg.content or getattr(raw_msg, "reasoning", "") or "").strip()

                return {
                    "content": content,
                    "model_used": actual_model,
                    "latency_ms": round(elapsed, 2),
                    "fallback_triggered": True
                }
            except Exception as fb_err:
                logger.warning(f"Fallback candidate {fallback_candidate} failed: {fb_err}")
                last_error = fb_err

        raise RuntimeError(f"All OpenRouter models failed. Last error: {last_error}")

    async def parse_vision(
        self,
        image_bytes: bytes,
        mime_type: str,
        prompt: str,
        preferred_model: Optional[str] = None,
        preferred_fallbacks: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Multimodal visual analysis for invoices and receipts using OpenRouter vision models.
        """
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64_image}"

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    }
                ]
            }
        ]

        return await self.chat_completion(
            messages=messages,
            task="vision",
            model=preferred_model,
            fallback_models=preferred_fallbacks,
            temperature=0.1,  # Low temperature for deterministic OCR
            max_tokens=2500
        )


openrouter_service = OpenRouterService()
