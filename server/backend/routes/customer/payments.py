from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentIn, FileRecord, SystemUser, Customer
from backend.utils import get_current_customer

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Portal"])


@router.get("/payments")
def customer_payments_status(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    # Step 1: Find the customer record linked to this system_user by email
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []

    # Step 2: Get all payment_in records for this customer's files
    payments = (
        db.query(PaymentIn)
        .join(FileRecord, FileRecord.id == PaymentIn.file_id)
        .filter(
            FileRecord.customer_id == customer.id,
            FileRecord.is_deleted == False,
        )
        .order_by(PaymentIn.payment_date.desc())
        .all()
    )

    return [
        {
            "file_number": p.file.file_number if p.file else None,
            "file_type": p.file.file_type if p.file else None,
            "payment_amount": float(p.payment_amount or 0),
            "paid_amount": float(p.paid_amount or 0),
            "remaining_amount": float(p.remaining_amount or 0),
            "payment_mode": p.payment_mode,
            "payment_date": p.payment_date.isoformat() if hasattr(p.payment_date, "isoformat") else str(p.payment_date) if p.payment_date else None,
            "remarks": p.remarks,
        }
        for p in payments
    ]
