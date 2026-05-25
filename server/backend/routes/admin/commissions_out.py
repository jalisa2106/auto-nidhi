import json
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CommissionOut, FileRecord

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
    company_bank_id: Optional[UUID] = None  # not present in DB table; stored in remarks JSON for now
    cheque_bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    cheque_no: Optional[str] = None
    cheque_date: Optional[date] = None
    utr_no: Optional[str] = None
    remarks: Optional[str] = None


def _normalize_payee_type(t: str) -> str:
    """
    DB enum currently supports: dealer, broker, rto.
    Frontend page supports: Dealer, Broker, Agent, Other.
    We map unknown values to 'rto' but preserve original type in remarks JSON.
    """
    t_norm = (t or "").strip().lower()
    if t_norm in ("dealer", "broker", "rto"):
        return t_norm
    if t_norm == "agent":
        return "rto"
    if t_norm == "other":
        return "rto"
    return "rto"


def _pack_extra(payload: CommissionOutCreate) -> str:
    extra = {
        "payee_type_raw": payload.payee_type,
        "payee_name": payload.payee_name,
        "tds_deducted": bool(payload.tds_deducted),
        "company_bank_id": str(payload.company_bank_id) if payload.company_bank_id else None,
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

def _title_payee_type(t: str) -> str:
    t_norm = (t or "").strip().lower()
    if t_norm == "dealer":
        return "Dealer"
    if t_norm == "broker":
        return "Broker"
    if t_norm == "agent":
        return "Agent"
    if t_norm == "other":
        return "Other"
    if t_norm == "rto":
        return "Other"
    return t


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

    # payee_type is an enum in DB and we store raw type in remarks JSON.
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
        data.append(
            {
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
                "company_bank_id": extra.get("company_bank_id"),
                "cheque_bank_name": r.cheque_bank_name,
                "branch_name": r.branch_name,
                "cheque_no": r.cheque_no,
                "cheque_date": r.cheque_date.strftime("%Y-%m-%d") if r.cheque_date else None,
                "utr_no": r.utr_no,
                "remarks": extra.get("remarks"),
            }
        )

    return {"data": data, "total": total, "page": page, "limit": limit}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_commission_out(payload: CommissionOutCreate, db: Session = Depends(get_db)):
    new_row = CommissionOut(
        file_id=payload.file_id,
        payee_type=_normalize_payee_type(payload.payee_type),
        amount=payload.amount,
        payment_mode=payload.mode,
        payment_date=payload.payment_date,
        is_advance=bool(payload.advance),
        cheque_bank_name=payload.cheque_bank_name,
        branch_name=payload.branch_name,
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        utr_no=payload.utr_no,
        remarks=_pack_extra(payload),
    )
    db.add(new_row)
    try:
        db.commit()
        db.refresh(new_row)
        return {"status": "success", "id": str(new_row.id)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
