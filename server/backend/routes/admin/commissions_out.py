import json
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CommissionOut, FileRecord, MasterCompanyBank, SystemUser
from backend.utils import get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/commissions/out", tags=["Admin Commission OUT"])


class CommissionOutCreate(BaseModel):
    file_id: UUID
    payee_type: str
    payee_name: str
    amount: float
    advance: Optional[bool] = False
    tds_deducted: Optional[bool] = False
    mode: str
    payment_date: date
    company_bank_id: Optional[UUID] = None
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None


def _normalize_payee_type(t: str) -> str:
    """Map frontend payee types to DB enum values (dealer, broker, rto)."""
    t_norm = (t or "").strip().lower()
    if t_norm in ("dealer", "broker", "rto"):
        return t_norm
    if t_norm == "agent":
        return "rto"
    if t_norm == "other":
        return "rto"
    return "rto"


def _title_payee_type(t: str) -> str:
    mapping = {"dealer": "Dealer", "broker": "Broker", "rto": "Other", "agent": "Agent", "other": "Other"}
    return mapping.get((t or "").strip().lower(), t)


def _pack_extra(payload: CommissionOutCreate) -> str:
    """Pack extra fields (that have no dedicated column) into remarks JSON."""
    extra = {
        "payee_type_raw": payload.payee_type,
        "payee_name": payload.payee_name,
        "tds_deducted": bool(payload.tds_deducted),
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
        return {"remarks": raw}


@router.get("/")
def list_commissions_out(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    payee_type: Optional[str] = None,
    mode: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommissionOut).join(FileRecord)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FileRecord.file_number.ilike(search_term) | CommissionOut.remarks.ilike(search_term)
        )
    if date_from:
        query = query.filter(CommissionOut.payment_date >= date_from)
    if date_to:
        query = query.filter(CommissionOut.payment_date <= date_to)
    if mode:
        query = query.filter(CommissionOut.payment_mode == mode)
    if payee_type:
        normalized = _normalize_payee_type(payee_type)
        query = query.filter(CommissionOut.payee_type == normalized)

    total = query.count()
    rows = (
        query.order_by(CommissionOut.payment_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    data = []
    for r in rows:
        extra = _unpack_extra(r.remarks)
        payee_type_raw = extra.get("payee_type_raw")

        # Resolve company bank label
        company_bank_label = None
        if r.company_bank_id and r.company_bank:
            company_bank_label = f"{r.company_bank.bank_name} – {r.company_bank.account_number}"

        data.append({
            "id": str(r.id),
            "file_id": str(r.file_id),
            "file_number": r.file.file_number if r.file else "N/A",
            "payee_type": _title_payee_type(payee_type_raw or r.payee_type),
            "payee_name": extra.get("payee_name") or "Unknown",
            "amount": float(r.amount),
            "advance": bool(r.is_advance),
            "tds_deducted": bool(extra.get("tds_deducted", False)),
            "mode": r.payment_mode,
            "payment_date": r.payment_date.strftime("%Y-%m-%d"),
            "company_bank_id": str(r.company_bank_id) if r.company_bank_id else None,
            "company_bank_label": company_bank_label,
            "cheque_bank_name": r.cheque_bank_name,
            "branch_name": r.branch_name,
            "cheque_no": r.cheque_no,
            "cheque_date": r.cheque_date.strftime("%Y-%m-%d") if r.cheque_date else None,
            "utr_no": r.utr_no,
            "remarks": extra.get("remarks"),
        })

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_commission_out(
    payload: CommissionOutCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    # Validate company_bank_id if provided
    if payload.company_bank_id:
        bank = db.query(MasterCompanyBank).filter(MasterCompanyBank.id == payload.company_bank_id).first()
        if not bank:
            raise HTTPException(status_code=400, detail="Invalid company bank account ID")

    new_row = CommissionOut(
        file_id=payload.file_id,
        payee_type=_normalize_payee_type(payload.payee_type),
        amount=payload.amount,
        payment_mode=payload.mode.lower(),
        payment_date=payload.payment_date,
        is_advance=bool(payload.advance),
        company_bank_id=payload.company_bank_id,
        cheque_bank_name=payload.cheque_bank_name,
        branch_name=payload.branch_name,
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        utr_no=payload.utr_no,
        remarks=_pack_extra(payload),
    )
    db.add(new_row)
    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created commission out",
            table_name="commission_out",
            record_id=new_row.id,
            message=f"Commission out of {new_row.amount} was recorded",
            preference_key="added",
            new_values={
                "id": str(new_row.id),
                "file_id": str(new_row.file_id),
                "payee_type": new_row.payee_type,
                "amount": float(new_row.amount),
                "payment_mode": new_row.payment_mode,
                "payment_date": str(new_row.payment_date),
            },
        )
        db.commit()
        db.refresh(new_row)
        return {"status": "success", "id": str(new_row.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


class CommissionOutUpdate(BaseModel):
    payee_type: Optional[str] = None
    payee_name: Optional[str] = None
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
def update_commission_out(
    commission_id: UUID,
    payload: CommissionOutUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    row = db.query(CommissionOut).filter(CommissionOut.id == commission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Commission OUT record not found")

    old_values = {"amount": float(row.amount), "payee_type": row.payee_type}

    # Merge extra JSON fields
    extra = _unpack_extra(row.remarks)
    if payload.payee_type is not None:
        extra["payee_type_raw"] = payload.payee_type
        row.payee_type = _normalize_payee_type(payload.payee_type)
    if payload.payee_name is not None:
        extra["payee_name"] = payload.payee_name
    if payload.tds_deducted is not None:
        extra["tds_deducted"] = payload.tds_deducted
    if payload.remarks is not None:
        extra["remarks"] = payload.remarks

    if payload.amount is not None:
        row.amount = payload.amount
    if payload.advance is not None:
        row.is_advance = payload.advance
    if payload.mode is not None:
        row.payment_mode = payload.mode.lower()
    if payload.payment_date is not None:
        row.payment_date = payload.payment_date
    if payload.company_bank_id is not None:
        row.company_bank_id = payload.company_bank_id
    if payload.cheque_bank_name is not None:
        row.cheque_bank_name = payload.cheque_bank_name
    if payload.branch_name is not None:
        row.branch_name = payload.branch_name
    if payload.cheque_no is not None:
        row.cheque_no = payload.cheque_no
    if payload.cheque_date is not None:
        row.cheque_date = payload.cheque_date
    if payload.utr_no is not None:
        row.utr_no = payload.utr_no

    row.remarks = json.dumps(extra, ensure_ascii=False)

    try:
        record_dashboard_event(
            db, current_admin,
            action="updated commission out",
            table_name="commission_out",
            record_id=row.id,
            message=f"Commission OUT {commission_id} was updated",
            preference_key="updated",
            old_values=old_values,
            new_values={"amount": float(row.amount), "payee_type": row.payee_type},
        )
        db.commit()
        db.refresh(row)
        return {"status": "success", "id": str(row.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{commission_id}", status_code=200)
def delete_commission_out(
    commission_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    row = db.query(CommissionOut).filter(CommissionOut.id == commission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Commission OUT record not found")

    try:
        record_dashboard_event(
            db, current_admin,
            action="deleted commission out",
            table_name="commission_out",
            record_id=row.id,
            message=f"Commission OUT {commission_id} was deleted",
            preference_key="deleted",
            old_values={"amount": float(row.amount)},
        )
        db.delete(row)
        db.commit()
        return {"status": "success", "message": "Commission OUT deleted"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
