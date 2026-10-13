import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.invoice import ParsedInvoice
from schemas.common import ApiResponse
from services.vision_service import vision_service

logger = logging.getLogger("ai_service.routers.invoice")
router = APIRouter(prefix="/api/v1/invoice", tags=["Vision & Document OCR"])


@router.post("/parse", response_model=ApiResponse[ParsedInvoice])
async def parse_invoice(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG, PNG, WEBP)")

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        parsed_data = await vision_service.parse_invoice_image(
            image_bytes=image_bytes,
            mime_type=file.content_type or "image/jpeg"
        )

        return ApiResponse(
            success=True,
            message=f"Successfully extracted {len(parsed_data.items)} items from invoice",
            data=parsed_data
        )
    except Exception as e:
        logger.error(f"Failed to parse invoice: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Invoice OCR extraction error: {str(e)}")
