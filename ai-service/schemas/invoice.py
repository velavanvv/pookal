from typing import List, Optional
from pydantic import BaseModel, Field


class InvoiceItem(BaseModel):
    name: str = Field(description="Name or description of the product/item")
    quantity: float = Field(default=1.0, description="Quantity or count")
    unit: Optional[str] = Field(default="pcs", description="Unit of measurement e.g. kg, pcs, box, packet")
    unit_price: float = Field(default=0.0, description="Price per unit before tax")
    total_price: float = Field(default=0.0, description="Total line amount")
    category: Optional[str] = Field(default="general", description="Inferred category e.g. Grocery, Dairy, Produce, Bakery")


class ParsedInvoice(BaseModel):
    merchant_name: Optional[str] = Field(default="Unknown Vendor", description="Supplier or vendor store name")
    merchant_phone: Optional[str] = Field(default=None, description="Vendor contact number if present")
    invoice_number: Optional[str] = Field(default=None, description="Invoice or Bill serial number")
    invoice_date: Optional[str] = Field(default=None, description="Date of the invoice (YYYY-MM-DD)")
    items: List[InvoiceItem] = Field(default_factory=list, description="Extracted line items")
    subtotal: float = Field(default=0.0, description="Subtotal amount before tax")
    tax_amount: float = Field(default=0.0, description="Total tax / GST / VAT")
    total_amount: float = Field(default=0.0, description="Final payable amount")
    confidence_score: float = Field(default=0.95, description="Confidence score between 0.0 and 1.0")
    notes: Optional[str] = Field(default=None, description="Any detected payment notes or payment method")
