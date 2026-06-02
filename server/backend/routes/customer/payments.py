from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentIn, FileRecord, SystemUser
from backend.utils import get_current_customer

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Portal"])


@router.get("/payments")
def customer_payments_status(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Return the payment history for the current customer user."""
    
    # Get payments for files created by this customer user
    # (similar to how dashboard works: files where created_by_user_id = current_user.id)
    payments = (
        db.query(PaymentIn)
        .join(FileRecord, FileRecord.id == PaymentIn.file_id)
        .filter(FileRecord.created_by_user_id == current_user.id)
        .order_by(PaymentIn.payment_date.desc())
        .all()
    )

    return [
        {
            "file_number": p.file.file_number if p.file else None,
            "file_type": p.file.file_type if p.file else None,
            "payment_amount": float(p.payment_amount) if p.payment_amount is not None else 0.0,
            "paid_amount": float(p.paid_amount) if p.paid_amount is not None else 0.0,
            "remaining_amount": float(p.remaining_amount) if p.remaining_amount is not None else 0.0,
            "payment_mode": p.payment_mode,
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "remarks": p.remarks,
        }
        for p in payments
    ]
