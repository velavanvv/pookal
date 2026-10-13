import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from config import settings
from services.openrouter_client import openrouter_service, OpenRouterService
from services.llm_client import llm_client

client = TestClient(app)


def test_models_list_endpoint():
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "total_models" in data
    assert "free_models_count" in data
    assert "families" in data
    assert len(data["models"]) > 0

    # Verify free model presence
    free_models = [m for m in data["models"] if m["is_free"]]
    assert len(free_models) > 0
    assert any(":free" in m["id"] or m["id"] == "openrouter/free" for m in free_models)



def test_models_filter_free_only():
    response = client.get("/api/v1/models?free_only=true")
    assert response.status_code == 200
    res = response.json()
    data = res["data"]
    for model in data["models"]:
        assert model["is_free"] is True


def test_models_filter_by_family():
    response = client.get("/api/v1/models?family=meta-llama")
    assert response.status_code == 200
    res = response.json()
    data = res["data"]
    for model in data["models"]:
        assert model["family"] == "meta-llama"


def test_models_filter_by_vision():
    response = client.get("/api/v1/models?modality=vision")
    assert response.status_code == 200
    res = response.json()
    data = res["data"]
    assert len(data["models"]) > 0
    for model in data["models"]:
        assert model["supports_vision"] is True


def test_model_families_endpoint():
    response = client.get("/api/v1/models/families")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    families = res["data"]
    family_ids = [f["id"] for f in families]
    assert "meta-llama" in family_ids
    assert "google" in family_ids
    assert "deepseek" in family_ids
    assert "mistralai" in family_ids
    assert "qwen" in family_ids


def test_models_routes_configuration():
    response = client.get("/api/v1/models/routes")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    routes = res["data"]["routes"]
    assert "copilot" in routes
    assert "vision" in routes
    assert "reasoning" in routes
    assert "fast" in routes
    assert routes["copilot"]["primary_model"] == settings.OPENROUTER_COPILOT_MODEL
    assert len(routes["copilot"]["fallback_models"]) > 0


def test_model_route_resolver():
    service = OpenRouterService()
    # Test default copilot task
    primary, fallbacks = service.resolve_route("copilot")
    assert primary == settings.OPENROUTER_COPILOT_MODEL
    assert primary not in fallbacks
    assert len(fallbacks) > 0

    # Test override preferred model
    primary, fallbacks = service.resolve_route("copilot", preferred_model="deepseek/deepseek-r1:free")
    assert primary == "deepseek/deepseek-r1:free"
    assert "deepseek/deepseek-r1:free" not in fallbacks

    # Test override preferred fallbacks
    custom_fallbacks = ["google/gemini-2.0-flash-exp:free", "mistralai/mistral-7b-instruct:free"]
    primary, fallbacks = service.resolve_route("copilot", preferred_fallbacks=custom_fallbacks)
    assert fallbacks == custom_fallbacks


@pytest.mark.anyio
async def test_openrouter_chat_completion_with_server_fallback():
    service = OpenRouterService()
    mock_async_client = MagicMock()
    mock_chat = MagicMock()
    
    mock_choice = MagicMock()
    mock_choice.message.content = "OpenRouter intelligent reply"
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "meta-llama/llama-3.3-70b-instruct:free"

    mock_chat.completions.create = AsyncMock(return_value=mock_response)
    mock_async_client.chat = mock_chat

    with patch.object(service, "get_client", return_value=mock_async_client), \
         patch.object(service, "is_configured", True):
        result = await service.chat_completion(
            messages=[{"role": "user", "content": "What are my top selling goods?"}],
            task="copilot",
            model="meta-llama/llama-3.3-70b-instruct:free"
        )
        assert result["content"] == "OpenRouter intelligent reply"
        assert result["model_used"] == "meta-llama/llama-3.3-70b-instruct:free"
        assert result["fallback_triggered"] is False



@pytest.mark.anyio
async def test_openrouter_client_side_fallback_when_primary_fails():
    service = OpenRouterService()
    mock_async_client = MagicMock()
    mock_chat = MagicMock()

    # First call (primary) raises 429 RateLimit/Exception, second call (fallback) succeeds
    mock_fallback_choice = MagicMock()
    mock_fallback_choice.message.content = "Fallback model successful reply"
    mock_fallback_response = MagicMock()
    mock_fallback_response.choices = [mock_fallback_choice]
    mock_fallback_response.model = "google/gemini-2.0-flash-exp:free"

    mock_chat.completions.create = AsyncMock(
        side_effect=[
            RuntimeError("Primary model 429: Rate limit exceeded on llama-3.3-70b"),
            mock_fallback_response
        ]
    )
    mock_async_client.chat = mock_chat

    with patch.object(service, "get_client", return_value=mock_async_client), \
         patch.object(service, "is_configured", True):
        result = await service.chat_completion(
            messages=[{"role": "user", "content": "Calculate profit"}],
            task="copilot",
            fallback_models=["google/gemini-2.0-flash-exp:free"]
        )
        assert result["content"] == "Fallback model successful reply"
        assert result["model_used"] == "google/gemini-2.0-flash-exp:free"
        assert result["fallback_triggered"] is True


def test_model_test_endpoint_mock_mode():
    response = client.post("/api/v1/models/test", json={"prompt": "Ping check"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "model_used" in res["data"]
    assert "latency_ms" in res["data"]


def test_copilot_chat_with_openrouter_configured():
    # Simulate OpenRouter configured and active
    with patch("services.llm_client.llm_client.get_active_provider", return_value="openrouter"), \
         patch("services.llm_client.llm_client.openrouter_configured", True), \
         patch("services.openrouter_client.openrouter_service.chat_completion", new_callable=AsyncMock) as mock_chat:

        mock_chat.return_value = {
            "content": "Here is your customized promotion strategy for the weekend.",
            "model_used": "meta-llama/llama-3.3-70b-instruct:free",
            "latency_ms": 150.0,
            "fallback_triggered": False
        }

        payload = {
            "prompt": "Give me a weekend discount campaign idea",
            "context": {"shop_name": "Royal Mart", "vertical": "retail"},
            "model": "meta-llama/llama-3.3-70b-instruct:free"
        }
        response = client.post("/api/v1/copilot/chat", json=payload)
        assert response.status_code == 200
        res = response.json()
        assert res["success"] is True
        assert res["data"]["provider"] == "openrouter"
        assert res["data"]["model_used"] == "meta-llama/llama-3.3-70b-instruct:free"
        assert res["data"]["intent"] == "GENERATE_CAMPAIGN"
        assert len(res["data"]["suggested_actions"]) > 0


def test_vision_parse_invoice_with_openrouter():
    # Simulate OpenRouter vision extraction
    with patch("services.llm_client.llm_client.get_active_provider", return_value="openrouter"), \
         patch("services.llm_client.llm_client.openrouter_configured", True), \
         patch("services.openrouter_client.openrouter_service.parse_vision", new_callable=AsyncMock) as mock_parse:

        mock_parse.return_value = {
            "content": """{
                "merchant_name": "Chennai Organic Suppliers",
                "invoice_number": "INV-5566",
                "items": [
                    {"name": "Mustard Seeds 1kg", "quantity": 10, "unit_price": 80.0, "total_price": 800.0}
                ],
                "subtotal": 800.0,
                "tax_amount": 40.0,
                "total_amount": 840.0,
                "confidence_score": 0.99
            }""",
            "model_used": "google/gemini-2.0-flash-exp:free",
            "latency_ms": 210.0,
            "fallback_triggered": False
        }

        from PIL import Image
        img = Image.new("RGB", (100, 100), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        response = client.post("/api/v1/invoice/parse", files={"file": ("invoice.jpg", buf, "image/jpeg")})
        assert response.status_code == 200
        res = response.json()
        assert res["success"] is True
        assert res["data"]["merchant_name"] == "Chennai Organic Suppliers"
        assert res["data"]["invoice_number"] == "INV-5566"
        assert len(res["data"]["items"]) == 1
        assert res["data"]["total_amount"] == 840.0
