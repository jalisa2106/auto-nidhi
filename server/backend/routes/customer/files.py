from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.models import Customer, FileRecord, SystemUser, MasterRole
from backend.utils import get_current_customer, get_customer_for_user, send_targeted_notification

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Portal"])

def _get_customer_by_user(db: Session, current_user: SystemUser) -> Optional[Customer]:
    return get_customer_for_user(current_user, db)


@router.get("/files")
def customer_file_list(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)

    query = db.query(FileRecord).filter(FileRecord.is_deleted == False)
    if customer:
        query = query.filter(
            or_(
                FileRecord.created_by_user_id == current_user.id,
                FileRecord.customer_id == customer.id,
            )
        )
    else:
        query = query.filter(FileRecord.created_by_user_id == current_user.id)

    files = query.order_by(FileRecord.created_at.desc()).all()

    return [
        {
            "id": str(f.id),
            "file_number": f.file_number,
            "file_type": f.file_type,
            "status": f.status,
            "assigned_to": f.assignee.first_name if f.assignee else None,
            "customer_name": f.customer.full_name if f.customer else None,
            "finance_amount": float(f.finance_info.loan_amount) if f.finance_info and f.finance_info.loan_amount is not None else None,
            "finance_bank": f.finance_info.bank.bank_name if f.finance_info and f.finance_info.bank else None,
            "created_at": f.created_at.isoformat() if hasattr(f.created_at, "isoformat") else str(f.created_at) if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if hasattr(f.updated_at, "isoformat") else str(f.updated_at) if f.updated_at else None,
        }
        for f in files
    ]


@router.get("/files/{file_id}")
def customer_file_detail(
    file_id: str,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)

    query = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.is_deleted == False)
    if customer:
        query = query.filter(
            or_(
                FileRecord.created_by_user_id == current_user.id,
                FileRecord.customer_id == customer.id,
            )
        )
    else:
        query = query.filter(FileRecord.created_by_user_id == current_user.id)

    file = query.first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Fetch Payment Summary
    from backend.models import PaymentIn
    payments = db.query(PaymentIn).filter(PaymentIn.file_id == file.id).all()
    # Handle the fact that PaymentIn might not have is_deleted
    total_paid = sum([float(p.paid_amount) for p in payments if p.paid_amount is not None])
    latest_remaining = float(payments[0].remaining_amount) if payments and payments[0].remaining_amount is not None else 0.0

    return {
        "id": str(file.id),
        "file_number": file.file_number,
        "file_type": file.file_type,
        "status": file.status,
        "assigned_to": file.assignee.first_name if file.assignee else None,
        "customer_name": file.customer.full_name if file.customer else None,
        "customer_email": file.customer.email if file.customer else None,
        "remarks": file.remarks,
        "finance_amount": float(file.finance_info.loan_amount) if file.finance_info and file.finance_info.loan_amount is not None else None,
        "finance_bank": file.finance_info.bank.bank_name if file.finance_info and file.finance_info.bank else None,
        "lan_number": file.finance_info.lan_number if file.finance_info else None,
        "insurance_policy_number": file.insurance_info.policy_number if file.insurance_info else None,
        "insurance_valid_to": str(file.insurance_info.valid_to) if file.insurance_info and file.insurance_info.valid_to else None,
        "payment_paid": total_paid,
        "payment_outstanding": latest_remaining,
        "created_at": file.created_at.isoformat() if hasattr(file.created_at, "isoformat") else str(file.created_at) if file.created_at else None,
        "updated_at": file.updated_at.isoformat() if hasattr(file.updated_at, "isoformat") else str(file.updated_at) if file.updated_at else None,
    }

class CustomerApplicationSubmit(BaseModel):
    file_type: str
    bank_id: str
    assigned_to: Optional[str] = None
    remarks: Optional[str] = None

@router.post("/submit")
def submit_application(
    payload: CustomerApplicationSubmit,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = _get_customer_by_user(db, current_user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile required to submit applications.")

    # 1. Handle Auto-Assignment Logic
    assigned_staff_id = payload.assigned_to
    
    if not assigned_staff_id:
        # Find active Data Entry / Admin staff with the fewest assigned files
        staff_roles = db.query(MasterRole.id).filter(
            MasterRole.role_name.in_(["data_entry", "admin"])
        ).all()
        staff_role_ids = [r[0] for r in staff_roles]

        staff_counts = db.query(
            SystemUser.id, func.count(FileRecord.id).label('file_count')
        ).outerjoin(
            FileRecord, FileRecord.assigned_to == SystemUser.id
        ).filter(
            SystemUser.role_id.in_(staff_role_ids),
            SystemUser.is_active == True
        ).group_by(SystemUser.id).order_by('file_count').first()

        if staff_counts:
            assigned_staff_id = staff_counts[0]
        else:
            raise HTTPException(status_code=500, detail="No eligible staff members found for assignment.")

    # 2. Create the File (Application)
    from backend.routes.admin.files import generate_file_number # Import your existing generator
    new_file_num = generate_file_number(db)

    new_file = FileRecord(
        customer_id=customer.id,
        created_by_user_id=current_user.id,
        assigned_to=assigned_staff_id,
        file_number=new_file_num,
        file_type=payload.file_type,
        status="draft",
        remarks=payload.remarks
    )
    db.add(new_file)
    db.flush()

    # 3. Target the Notification ONLY to the assigned staff member
    send_targeted_notification(
        db=db,
        target_user_id=assigned_staff_id,
        message=f"New application ({new_file_num}) submitted by {customer.full_name}.",
        notification_type="general",
        file_id=new_file.id
    )

    db.commit()
    return {"status": "success", "file_number": new_file_num, "assigned_to": assigned_staff_id}