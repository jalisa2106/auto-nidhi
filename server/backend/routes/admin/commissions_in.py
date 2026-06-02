import json
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CommissionIn, FileRecord, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/commissions/in", tags=["Admin Commission IN"])


class CommissionInCreate(BaseModel):
    file_id: UUID
    source_type: Optional[str] = None
    source_name: str
    amount: float
    advance: Optional[bool] = False
    tds_deducted: Optional[bool] = False
    mode: Optional[str] = None
    payment_date: date
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None


def _pack_extra(payload: CommissionInCreate) -> str:
    """
    commission_in table is minimal; store page-specific fields in remarks as JSON.
    This keeps backend forward-compatible with the frontend Commission IN page contract
    without changing DB schema right now.
    """
    extra = {
        "source_type": payload.source_type,
        "advance": bool(payload.advance),
        "tds_deducted": bool(payload.tds_deducted),
        "mode": payload.mode,
        "cheque_bank_name": payload.cheque_bank_name,
        "branch_name": payload.branch_name,
        "cheque_no": payload.cheque_no,
        "cheque_date": payload.cheque_date.strftime("%Y-%m-%d") if payload.cheque_date else None,
        "utr_no": payload.utr_no,
        "remarks": payload.remarks,
    }
    return json.dumps(extra, ensure_ascii=False)


def _unpack_extra(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        # Backward compatibility: if remarks was plain text previously
        return {"remarks": raw}


@router.get("/")
def list_commissions_in(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    mode: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommissionIn).join(FileRecord)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term)
            | CommissionIn.payment_by.ilike(search_term)
            | CommissionIn.remarks.ilike(search_term)
        )
    if date_from:
        query = query.filter(CommissionIn.payment_date >= date_from)
    if date_to:
        query = query.filter(CommissionIn.payment_date <= date_to)

    # source_type/mode are stored in JSON remarks, so we filter by simple text match.
    # This is not perfect, but works and avoids DB schema changes.
    if source_type:
        query = query.filter(CommissionIn.remarks.ilike(f'%\"source_type\": \"{source_type}\"%'))
    if mode:
        query = query.filter(CommissionIn.remarks.ilike(f'%\"mode\": \"{mode}\"%'))

    total = query.count()
    rows = (
        query.order_by(CommissionIn.payment_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    data = []
    for r in rows:
        extra = _unpack_extra(r.remarks)
        data.append(
            {
                "id": str(r.id),
                "file_id": str(r.file_id),
                "file_number": r.file.file_number if r.file else "N/A",
                "source_type": extra.get("source_type") or "Other",
                "source_name": r.payment_by,
                "amount": float(r.amount),
                "advance": bool(extra.get("advance", False)),
                "tds_deducted": bool(extra.get("tds_deducted", False)),
                "mode": extra.get("mode") or "UPI",
                "payment_date": r.payment_date.strftime("%Y-%m-%d"),
                "company_bank_id": str(r.company_bank_id) if r.company_bank_id else None,
                "cheque_bank_name": extra.get("cheque_bank_name"),
                "branch_name": extra.get("branch_name"),
                "cheque_no": extra.get("cheque_no"),
                "cheque_date": extra.get("cheque_date"),
                "utr_no": extra.get("utr_no"),
                "remarks": extra.get("remarks"),
            }
        )

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_commission_in(
    payload: CommissionInCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    new_row = CommissionIn(
        file_id=payload.file_id,
        payment_by=payload.source_name,
        amount=payload.amount,
        payment_date=payload.payment_date,
        company_bank_id=payload.company_bank_id,
        remarks=_pack_extra(payload),
    )
    db.add(new_row)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created commission in",
            table_name="commission_in",
            record_id=new_row.id,
            message=f"Commission in of {new_row.amount} was recorded",
            preference_key="added",
            new_values={
                "id": str(new_row.id),
                "file_id": str(new_row.file_id),
                "payment_by": new_row.payment_by,
                "amount": float(new_row.amount),
                "payment_date": str(new_row.payment_date),
            },
        )
        db.commit()
        db.refresh(new_row)
        return {"status": "success", "id": str(new_row.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


class CommissionInUpdate(BaseModel):
    source_type: Optional[str] = None
    source_name: Optional[str] = None
    amount: Optional[float] = None
    advance: Optional[bool] = None
    tds_deducted: Optional[bool] = None
    mode: Optional[str] = None
    payment_date: Optional[date] = None
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None


@router.put("/{commission_id}")
def update_commission_in(
    commission_id: UUID,
    payload: CommissionInUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_staff),
):
    row = db.query(CommissionIn).filter(CommissionIn.id == commission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Commission IN record not found")

    old_values = {"amount": float(row.amount), "payment_by": row.payment_by}

    # Unpack existing extra data and merge with new payload
    extra = _unpack_extra(row.remarks)
    if payload.source_type is not None:
        extra["source_type"] = payload.source_type
    if payload.advance is not None:
        extra["advance"] = payload.advance
    if payload.tds_deducted is not None:
        extra["tds_deducted"] = payload.tds_deducted
    if payload.mode is not None:
        extra["mode"] = payload.mode
    if payload.cheque_bank_name is not None:
        extra["cheque_bank_name"] = payload.cheque_bank_name
    if payload.branch_name is not None:
        extra["branch_name"] = payload.branch_name
    if payload.cheque_no is not None:
        extra["cheque_no"] = payload.cheque_no
    if payload.cheque_date is not None:
        extra["cheque_date"] = payload.cheque_date.strftime("%Y-%m-%d")
    if payload.utr_no is not None:
        extra["utr_no"] = payload.utr_no
    if payload.remarks is not None:
        extra["remarks"] = payload.remarks

    if payload.source_name is not None:
        row.payment_by = payload.source_name
    if payload.amount is not None:
        row.amount = payload.amount
    if payload.payment_date is not None:
        row.payment_date = payload.payment_date
    if payload.company_bank_id is not None:
        row.company_bank_id = payload.company_bank_id

    row.remarks = json.dumps(extra, ensure_ascii=False)

    try:
        record_dashboard_event(
            db, current_admin,
            action="updated commission in",
            table_name="commission_in",
            record_id=row.id,
            message=f"Commission IN {commission_id} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values={"amount": float(row.amount), "payment_by": row.payment_by},
        )
        db.commit()
        db.refresh(row)
        return {"status": "success", "id": str(row.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{commission_id}", status_code=200)
def delete_commission_in(
    commission_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    row = db.query(CommissionIn).filter(CommissionIn.id == commission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Commission IN record not found")

    try:
        record_dashboard_event(
            db, current_admin,
            action="deleted commission in",
            table_name="commission_in",
            record_id=row.id,
            message=f"Commission IN {commission_id} was deleted",
            preference_key="deleted",
            old_values={"amount": float(row.amount)},
        )
        db.delete(row)
        db.commit()
        return {"status": "success", "message": "Commission IN deleted"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
