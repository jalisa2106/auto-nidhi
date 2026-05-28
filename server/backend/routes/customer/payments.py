from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PaymentIn, FileRecord, SystemUser
from backend.utils import get_current_customer

router = APIRouter(prefix="/portal", tags=["Customer Portal"])


@router.get("/payments")
def customer_payments_status(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Return the payment history for the current customer user."""
    from backend.models import Customer
    
    # Find the customer record linked to this system user (by email)
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    
    if not customer:
        return []
    
    # Get payments for files owned by this customer
    payments = (
        db.query(PaymentIn)
        .join(FileRecord, FileRecord.id == PaymentIn.file_id)
        .filter(FileRecord.customer_id == customer.id)
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
