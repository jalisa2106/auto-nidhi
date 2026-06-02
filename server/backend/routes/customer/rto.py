from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from backend.database import get_db
from backend.models import SystemUser, RTOPayment, FileRecord, Customer, MasterRole
from backend.utils import get_current_customer, send_targeted_notification

router = APIRouter(prefix="/api/v1/portal/rto", tags=["Customer RTO"])

class RTORequestPayload(BaseModel):
    file_id: str
    service_type: str
    remarks: Optional[str] = ""

# FIX 1: Use "" instead of "/" to prevent 307 Redirects and 401 Logouts
@router.get("")
def get_customer_rto_details(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    # 1. Get the customer profile linked to the logged-in user
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []

    # 2. Get all file IDs associated with this customer
    files = db.query(FileRecord.id, FileRecord.file_number).filter(
        FileRecord.customer_id == customer.id,
        FileRecord.is_deleted == False
    ).all()
    
    if not files:
        return []

    file_ids = [f.id for f in files]

    # 3. Fetch all RTO payments linked to those files
    rto_records = db.query(RTOPayment).filter(
        RTOPayment.file_id.in_(file_ids),
        RTOPayment.is_deleted == False
    ).order_by(RTOPayment.payment_date.desc()).all()

    # 4. Serialize the data for the frontend
    return [
        {
            "id": str(r.id),
            "file_id": str(r.file_id),
            "file_number": r.file.file_number if r.file else None,
            "payment_date": r.payment_date.isoformat() if r.payment_date else None,
            "amount": float(r.amount),
            "payment_mode": r.payment_mode,
            "remarks": r.remarks
        } for r in rto_records
    ]


# FIX 2: Add the missing POST route for the RTO Request Modal
@router.post("/request")
def submit_rto_request(
    payload: RTORequestPayload,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    file_record = db.query(FileRecord).filter(FileRecord.id == payload.file_id).first()

    # Find admins to notify them of the RTO request
    admin_roles = db.query(MasterRole.id).filter(MasterRole.role_name == "admin").all()
    admin_role_ids = [r[0] for r in admin_roles]
    
    admins = db.query(SystemUser).filter(
        SystemUser.role_id.in_(admin_role_ids), 
        SystemUser.is_active == True
    ).all()

    service_name = payload.service_type.replace('_', ' ').title()
    customer_name = customer.full_name if customer else "A customer"
    file_num = file_record.file_number if file_record else "Unknown File"

    # Send Notification to Admins
    for admin in admins:
        send_targeted_notification(
            db=db,
            target_user_id=admin.id,
            message=f"RTO Request: {customer_name} requested {service_name} for file {file_num}.",
            notification_type="general",
            file_id=payload.file_id
        )
    
    db.commit()

    return {
        "status": "success", 
        "message": "RTO Service Request logged and queued successfully.",
        "data": {
            "file_id": payload.file_id,
            "rto_transfer_status": "Submitted",
            "remarks": payload.remarks
        }
    }