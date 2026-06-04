from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from uuid import UUID

from backend.database import get_db
from backend.models import (
    SystemUser, MasterRole, FileRecord, Customer,
    PaymentIn, PaymentOut, ExpenseLedger, Advance,
    InsurancePayment, RTOPayment, FinanceInfo
)
from backend.utils import get_current_admin

router = APIRouter(prefix="/api/v1/admin/user-profiles", tags=["Admin User Profiles"])


def _role_name_to_filter(role: str) -> str:
    """Map frontend role param to DB role_name."""
    return {
        "staff": "Data_Entry", 
        "data_entry": "Data_Entry", 
        "accountant": "Accountant"
    }.get(role, role)


@router.get("/")
def list_users_by_role(
    role: str = "staff",
    db: Session = Depends(get_db),
    _: SystemUser = Depends(get_current_admin),
):
    """List all users of a given role with basic activity summary counts."""
    role_name = _role_name_to_filter(role)

    # Get the role record
    role_obj = db.query(MasterRole).filter(MasterRole.role_name == role_name).first()
    if not role_obj:
        return {"data": [], "total": 0}

    users = (
        db.query(SystemUser)
        .filter(SystemUser.role_id == role_obj.id, SystemUser.is_active == True)
        .order_by(SystemUser.first_name)
        .all()
    )

    results = []
    for u in users:
        files_created = db.query(func.count(FileRecord.id)).filter(
            FileRecord.created_by_user_id == u.id,
            FileRecord.is_deleted == False
        ).scalar() or 0

        customers_created = db.query(func.count(Customer.id)).filter(
            Customer.created_by == u.id
        ).scalar() or 0

        expenses_count = db.query(func.count(ExpenseLedger.id)).filter(
            ExpenseLedger.created_by == u.id,
            ExpenseLedger.is_deleted == False
        ).scalar() or 0

        results.append({
            "id": str(u.id),
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "full_name": f"{u.first_name or ''} {u.last_name or ''}".strip(),
            "email": u.email,
            "phone_number": u.phone_number or "—",
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "role": role_name,
            # Summary stats
            "files_created": files_created,
            "customers_created": customers_created,
            "expenses_count": expenses_count,
        })

    return {"data": results, "total": len(results)}


@router.get("/{user_id}")
def get_user_detail(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: SystemUser = Depends(get_current_admin),
):
    """Get full activity detail for a single user."""
    user = db.query(SystemUser).filter(SystemUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_obj = db.query(MasterRole).filter(MasterRole.id == user.role_id).first()
    role_name = role_obj.role_name if role_obj else "unknown"

    # ── Files created ─────────────────────────────────────────────────────────
    files_q = db.query(FileRecord).filter(
        FileRecord.created_by_user_id == user_id,
        FileRecord.is_deleted == False
    )
    files_total = files_q.count()

    # Files by status
    file_status_counts = (
        db.query(FileRecord.status, func.count(FileRecord.id))
        .filter(FileRecord.created_by_user_id == user_id, FileRecord.is_deleted == False)
        .group_by(FileRecord.status)
        .all()
    )
    files_by_status = {status: count for status, count in file_status_counts}

    # ── Customers created ─────────────────────────────────────────────────────
    customers_created = db.query(func.count(Customer.id)).filter(
        Customer.created_by == user_id
    ).scalar() or 0

    # ── Get file IDs created by this user (for payment lookups) ───────────────
    file_ids_subq = db.query(FileRecord.id).filter(
        FileRecord.created_by_user_id == user_id,
        FileRecord.is_deleted == False
    ).subquery()

    # ── Payment IN (on files created by user) ─────────────────────────────────
    payment_in_stats = db.query(
        func.count(PaymentIn.id),
        func.coalesce(func.sum(PaymentIn.payment_amount), 0)
    ).filter(PaymentIn.file_id.in_(file_ids_subq)).one()
    payment_in_count = payment_in_stats[0] or 0
    payment_in_total = float(payment_in_stats[1] or 0)

    # ── Payment OUT (on files created by user) ────────────────────────────────
    payment_out_stats = db.query(
        func.count(PaymentOut.id),
        func.coalesce(func.sum(PaymentOut.amount), 0)
    ).filter(PaymentOut.file_id.in_(file_ids_subq)).one()
    payment_out_count = payment_out_stats[0] or 0
    payment_out_total = float(payment_out_stats[1] or 0)

    # ── Insurance Payments (on files created by user) ─────────────────────────
    insurance_stats = db.query(
        func.count(InsurancePayment.id),
        func.coalesce(func.sum(InsurancePayment.amount), 0)
    ).filter(
        InsurancePayment.file_id.in_(file_ids_subq),
        InsurancePayment.is_deleted == False
    ).one()
    insurance_count = insurance_stats[0] or 0
    insurance_total = float(insurance_stats[1] or 0)

    # ── RTO Payments (on files created by user) ───────────────────────────────
    rto_stats = db.query(
        func.count(RTOPayment.id),
        func.coalesce(func.sum(RTOPayment.amount), 0)
    ).filter(
        RTOPayment.file_id.in_(file_ids_subq),
        RTOPayment.is_deleted == False
    ).one()
    rto_count = rto_stats[0] or 0
    rto_total = float(rto_stats[1] or 0)

    # ── Loans (FinanceInfo on files created by user) ──────────────────────────
    loan_stats = db.query(
        func.count(FinanceInfo.id),
        func.coalesce(func.sum(FinanceInfo.loan_amount), 0)
    ).filter(FinanceInfo.file_id.in_(file_ids_subq)).one()
    loans_count = loan_stats[0] or 0
    loans_total = float(loan_stats[1] or 0)

    # ── Expenses (directly tracked by created_by) ─────────────────────────────
    expense_stats = db.query(
        func.count(ExpenseLedger.id),
        func.coalesce(func.sum(ExpenseLedger.amount), 0)
    ).filter(
        ExpenseLedger.created_by == user_id,
        ExpenseLedger.is_deleted == False
    ).one()
    expenses_count = expense_stats[0] or 0
    expenses_total = float(expense_stats[1] or 0)

    # ── Advances (directly tracked by created_by) ─────────────────────────────
    advance_stats = db.query(
        func.count(Advance.id),
        func.coalesce(func.sum(Advance.amount), 0)
    ).filter(
        Advance.created_by == user_id,
        Advance.is_deleted == False
    ).one()
    advances_count = advance_stats[0] or 0
    advances_total = float(advance_stats[1] or 0)

    # ── Recent 5 files created ────────────────────────────────────────────────
    recent_files = (
        db.query(FileRecord)
        .filter(FileRecord.created_by_user_id == user_id, FileRecord.is_deleted == False)
        .order_by(FileRecord.created_at.desc())
        .limit(5)
        .all()
    )
    recent_files_data = []
    for f in recent_files:
        recent_files_data.append({
            "id": str(f.id),
            "file_number": f.file_number or "—",
            "customer": f.customer.full_name if f.customer else "—",
            "status": f.status or "—",
            "file_type": f.file_type or "—",
            "created_at": f.created_at.strftime("%Y-%m-%d") if f.created_at else "—",
        })

    return {
        # Profile
        "id": str(user.id),
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "full_name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
        "email": user.email,
        "phone_number": user.phone_number or "—",
        "is_active": user.is_active,
        "role": role_name,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "joined": user.created_at.strftime("%d %b %Y") if user.created_at else "—",
        # Activity
        "files_created": files_total,
        "files_by_status": files_by_status,
        "customers_created": customers_created,
        "payment_in_count": payment_in_count,
        "payment_in_total": payment_in_total,
        "payment_out_count": payment_out_count,
        "payment_out_total": payment_out_total,
        "insurance_count": insurance_count,
        "insurance_total": insurance_total,
        "rto_count": rto_count,
        "rto_total": rto_total,
        "loans_count": loans_count,
        "loans_total": loans_total,
        "expenses_count": expenses_count,
        "expenses_total": expenses_total,
        "advances_count": advances_count,
        "advances_total": advances_total,
        # Recent activity
        "recent_files": recent_files_data,
    }
