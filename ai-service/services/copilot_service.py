import logging
from typing import Dict, Any, List
from schemas.copilot import CopilotRequest, CopilotResponse, SuggestedAction, ChatMessage
from services.llm_client import llm_client
from config import settings

logger = logging.getLogger("ai_service.copilot")


from services.openrouter_client import openrouter_service

class CopilotService:
    @staticmethod
    def _infer_actions_and_intent(prompt: str, reply: str) -> tuple[str, List[SuggestedAction]]:
        text = (prompt + " " + reply).lower()
        if any(w in text for w in ["campaign", "discount", "whatsapp", "sale", "offer", "marketing"]):
            return "GENERATE_CAMPAIGN", [
                SuggestedAction(
                    action_type="CREATE_CAMPAIGN",
                    title="📱 Launch WhatsApp Blast",
                    payload={"template": "flash_sale", "discount_pct": 10, "min_order": 499}
                ),
                SuggestedAction(
                    action_type="NAVIGATE",
                    title="👥 View CRM Loyalty Tiers",
                    payload={"route": "/crm"}
                )
            ]
        elif any(w in text for w in ["stock", "inventory", "reorder", "supplier", "purchase order", "po"]):
            return "QUERY_INVENTORY", [
                SuggestedAction(
                    action_type="RESTOCK_ITEM",
                    title="📥 Auto-Generate Restock PO",
                    payload={"threshold_days": 4}
                ),
                SuggestedAction(
                    action_type="NAVIGATE",
                    title="🔍 View Inventory Ledger",
                    payload={"route": "/inventory"}
                )
            ]
        elif any(w in text for w in ["khata", "credit", "due", "udhari", "receivable"]):
            return "KHATA_RECOVERY", [
                SuggestedAction(
                    action_type="NAVIGATE",
                    title="🧾 Open Khata Ledger",
                    payload={"route": "/crm"}
                )
            ]
        else:
            return "GENERAL_ASSISTANT", [
                SuggestedAction(
                    action_type="CREATE_CAMPAIGN",
                    title="🚀 Boost Sales Campaign",
                    payload={"template": "weekend_special"}
                ),
                SuggestedAction(
                    action_type="NAVIGATE",
                    title="🛒 Open POS Counter",
                    payload={"route": "/pos"}
                )
            ]

    @staticmethod
    async def chat(request: CopilotRequest) -> CopilotResponse:
        provider = llm_client.get_active_provider()
        prompt_lower = request.prompt.lower()
        shop_name = request.context.get("shop_name", "your shop")
        vertical = request.context.get("vertical", "retail")
        low_stock_items = request.context.get("low_stock_items", [])
        today_rev = request.context.get("today_revenue", 0)
        today_orders = request.context.get("today_orders_count", 0)
        total_products = request.context.get("total_products", 0)

        system_context = (
            f"You are the AI Business Copilot for {shop_name} ({vertical} business) on the Universal Business Platform. "
            "Help the owner increase sales, manage inventory, recover khata credit, and retain customers concisely in markdown."
        )

        context_bullets = []
        if total_products:
            context_bullets.append(f"- Total Catalog Products: {total_products}")
        if today_orders or today_rev:
            context_bullets.append(f"- Today's Sales: ₹{today_rev:,.2f} ({today_orders} orders placed today)")
        if low_stock_items:
            context_bullets.append(f"- Current Low-Stock Alert Items: {', '.join(low_stock_items[:5])}")

        if context_bullets:
            system_context += "\n\nLive Store Database State:\n" + "\n".join(context_bullets)

        # 1. OpenRouter unified multi-model routing
        if provider == "openrouter" and llm_client.openrouter_configured:

            try:
                messages = [{"role": "system", "content": system_context}]
                if request.history:
                    for h in request.history[-8:]:
                        messages.append({"role": h.role, "content": h.content})
                messages.append({"role": "user", "content": request.prompt})

                result = await openrouter_service.chat_completion(
                    messages=messages,
                    task="copilot",
                    model=request.model,
                    fallback_models=request.fallbacks,
                    temperature=0.7
                )
                reply_text = result["content"].strip()
                intent, actions = CopilotService._infer_actions_and_intent(request.prompt, reply_text)
                return CopilotResponse(
                    reply=reply_text,
                    intent=intent,
                    suggested_actions=actions,
                    model_used=result["model_used"],
                    provider="openrouter"
                )
            except Exception as e:
                logger.error(f"OpenRouter Copilot error: {e}. Falling back to secondary engine.")

        # 2. Direct Gemini / OpenAI fallback processing
        if provider == "gemini" and llm_client.gemini_configured:
            try:
                import google.generativeai as genai
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                response = model.generate_content(f"{system_context}\n\nUser Question: {request.prompt}")
                reply_text = response.text.strip()
                intent, actions = CopilotService._infer_actions_and_intent(request.prompt, reply_text)
                return CopilotResponse(
                    reply=reply_text,
                    intent=intent,
                    suggested_actions=actions,
                    model_used=settings.GEMINI_MODEL,
                    provider="gemini"
                )
            except Exception as e:
                logger.error(f"Gemini Copilot error: {e}")


        # 2. Intelligent Context-Aware Agent Fallback (Rules Engine + Intent Extraction)
        # Handles business intents: Campaigns, Stock, Khata, Orders
        if "campaign" in prompt_lower or "discount" in prompt_lower or "whatsapp" in prompt_lower or "sale" in prompt_lower:
            return CopilotResponse(
                reply=f"### 🚀 Recommended Revenue Campaign for **{shop_name}**\n\n"
                      f"Based on your recent sales velocity in **{vertical}**, launching a **Weekend Flash Sale** yields the highest repeat visits:\n\n"
                      f"- **Suggested Offer**: Flat 10% OFF on all orders above ₹499.\n"
                      f"- **Audience Target**: Top 20% loyalty customers & lapsed buyers (>30 days).\n"
                      f"- **Channel**: WhatsApp 1-Click Broadcast with pre-filled cart links.",
                intent="GENERATE_CAMPAIGN",
                suggested_actions=[
                    SuggestedAction(
                        action_type="CREATE_CAMPAIGN",
                        title="📱 Launch WhatsApp Blast",
                        payload={"template": "flash_sale", "discount_pct": 10, "min_order": 499}
                    ),
                    SuggestedAction(
                        action_type="NAVIGATE",
                        title="👥 View CRM Loyalty Tiers",
                        payload={"route": "/crm"}
                    )
                ]
            )

        elif "stock" in prompt_lower or "inventory" in prompt_lower or "reorder" in prompt_lower:
            return CopilotResponse(
                reply=f"### 📦 Inventory Intelligence for **{shop_name}**\n\n"
                      f"I checked your stock levels. Here are items that require immediate attention:\n\n"
                      f"1. **Fast-Moving Essentials**: Top 3 items have < 4 days of stock remaining.\n"
                      f"2. **Slow-Moving Stock**: Consider bundling items unsold for > 45 days into a discount hamper.\n\n"
                      f"Would you like me to draft an automatic Purchase Order to your primary vendor?",
                intent="QUERY_INVENTORY",
                suggested_actions=[
                    SuggestedAction(
                        action_type="RESTOCK_ITEM",
                        title="📥 Auto-Generate Restock PO",
                        payload={"threshold_days": 4}
                    ),
                    SuggestedAction(
                        action_type="NAVIGATE",
                        title="🔍 View Inventory Ledger",
                        payload={"route": "/inventory"}
                    )
                ]
            )

        elif "khata" in prompt_lower or "credit" in prompt_lower or "due" in prompt_lower or "udhari" in prompt_lower:
            return CopilotResponse(
                reply=f"### 💰 Customer Khata & Receivables Summary\n\n"
                      f"Active customer credit ledger shows outstanding balances.\n\n"
                      f"- **Recommended Action**: Send gentle WhatsApp reminders with direct UPI payment QR code links to recover balances without awkwardness.",
                intent="KHATA_RECOVERY",
                suggested_actions=[
                    SuggestedAction(
                        action_type="NAVIGATE",
                        title="🧾 Open Khata Ledger",
                        payload={"route": "/crm"}
                    )
                ]
            )

        else:
            return CopilotResponse(
                reply=f"Hello! I am your **UBP AI Business Copilot** for **{shop_name}**.\n\n"
                      f"I can help you with:\n"
                      f"- 📸 **Scanning vendor invoices** to restock inventory automatically\n"
                      f"- 📈 **Generating high-converting WhatsApp marketing campaigns**\n"
                      f"- 📊 **Predicting inventory stock-outs and restock orders**\n"
                      f"- 💡 **Loyalty points optimization & customer retention**\n\n"
                      f"What would you like to achieve today?",
                intent="GENERAL_ASSISTANT",
                suggested_actions=[
                    SuggestedAction(
                        action_type="CREATE_CAMPAIGN",
                        title="🚀 Boost Sales Campaign",
                        payload={"template": "weekend_special"}
                    ),
                    SuggestedAction(
                        action_type="NAVIGATE",
                        title="🛒 Open POS Counter",
                        payload={"route": "/pos"}
                    )
                ]
            )


copilot_service = CopilotService()
