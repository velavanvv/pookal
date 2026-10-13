import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["status"] == "ok"
    assert "active_provider" in res["data"]


def test_copilot_campaign_intent():
    payload = {
        "prompt": "Create a 15% discount WhatsApp flash sale campaign for my store",
        "context": {
            "shop_name": "Murugan Organic Stores",
            "vertical": "grocery"
        }
    }
    response = client.post("/api/v1/copilot/chat", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["intent"] == "GENERATE_CAMPAIGN"
    assert len(data["suggested_actions"]) > 0
    assert "payload" in data["suggested_actions"][0]


def test_copilot_inventory_intent():
    payload = {
        "prompt": "Which items are low in stock and need restock?",
        "context": {
            "shop_name": "Murugan Café",
            "vertical": "restaurant"
        }
    }
    response = client.post("/api/v1/copilot/chat", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["intent"] == "QUERY_INVENTORY"


def test_invoice_parser_endpoint():
    # Create a dummy test image in-memory
    from PIL import Image
    img = Image.new("RGB", (200, 200), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("test_invoice.jpg", buf, "image/jpeg")}
    response = client.post("/api/v1/invoice/parse", files=files)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "items" in res["data"]
    assert len(res["data"]["items"]) > 0
    assert res["data"]["total_amount"] > 0
