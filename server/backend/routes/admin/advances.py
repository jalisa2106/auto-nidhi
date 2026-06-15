import datetime
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Advance, MasterDealer, MasterBroker, SystemUser
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event


router = APIRouter(prefix="/api/v1/advances", tags=["Admin Advances"])

VALID_MODES = {"cash", "cheque", "rtgs", "neft", "imps", "upi"}


class AdvanceCreate(BaseModel):
    dealer_id: Optional[UUID] = None
    broker_id: Optional[UUID] = None
    advance_date: date
    amount: float
    mode: str
    utr_cheque_number: Optional[str] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None

    @validator("mode")
    def validate_mode(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in VALID_MODES:
            raise ValueError("Invalid payment mode")
        return value

    @validator("amount")
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Amount must be greater than zero")
        return value


class AdvanceUpdate(BaseModel):
    amount_recovered: Optional[float] = None
    remarks: Optional[str] = None
    is_deleted: Optional[bool] = None


def _derive_recovery_status(amount: float, recovered: float) -> str:
    if recovered <= 0:
        return "pending"
    if recovered >= amount:
        return "fully_recovered"
    return "partial"


def _serialize(row: Advance) -> dict:
    party_type = "dealer" if row.dealer_id else "broker"
    party_name = ""

    if row.dealer:
        party_name = row.dealer.dealer_name
    elif row.broker:
        party_name = row.broker.broker_name

    return {
        "id": str(row.id),
        "dealer_id": str(row.dealer_id) if row.dealer_id else None,
        "broker_id": str(row.broker_id) if row.broker_id else None,
        "party_type": party_type,
        "party_name": party_name,
        "advance_date": row.advance_date.strftime("%Y-%m-%d"),
        "amount": float(row.amount),
        "mode": row.mode,
        "utr_cheque_number": row.utr_cheque_number or "",
        "purpose": row.purpose or "",
        "recovery_status": row.recovery_status,
        "amount_recovered": float(row.amount_recovered or 0),
        "remarks": row.remarks or "",
    }


@router.get("/")
def list_advances(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Advance).filter(Advance.is_deleted == False)

    if search:
        search_term = f"%{search.strip()}%"
        query = (
            query
            .outerjoin(MasterDealer, Advance.dealer_id == MasterDealer.id)
            .outerjoin(MasterBroker, Advance.broker_id == MasterBroker.id)
            .filter(
                MasterDealer.dealer_name.ilike(search_term)
                | MasterBroker.broker_name.ilike(search_term)
                | Advance.purpose.ilike(search_term)
                | Advance.remarks.ilike(search_term)
                | Advance.recovery_status.ilike(search_term)
            )
        )

    rows = query.order_by(Advance.advance_date.desc()).all()
    return [_serialize(row) for row in rows]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_advance(
    payload: AdvanceCreate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    has_dealer = payload.dealer_id is not None
    has_broker = payload.broker_id is not None

    if has_dealer == has_broker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select exactly one party: dealer or broker",
        )

    if payload.dealer_id:
        dealer = db.query(MasterDealer).filter(MasterDealer.id == payload.dealer_id).first()
        if not dealer:
            raise HTTPException(status_code=400, detail="Invalid dealer ID")

    if payload.broker_id:
        broker = db.query(MasterBroker).filter(
            MasterBroker.id == payload.broker_id,
            MasterBroker.is_deleted == False,
        ).first()
        if not broker:
            raise HTTPException(status_code=400, detail="Invalid broker ID")

    ref = (payload.utr_cheque_number or "").strip()

    if payload.mode == "cheque" and not ref:
        raise HTTPException(status_code=400, detail="Cheque number is required")

    if payload.mode in {"upi", "neft", "rtgs", "imps"} and not ref:
        raise HTTPException(status_code=400, detail="UTR / reference number is required")

    advance = Advance(
        dealer_id=payload.dealer_id,
        broker_id=payload.broker_id,
        advance_date=payload.advance_date,
        amount=payload.amount,
        mode=payload.mode,
        utr_cheque_number=ref,
        purpose=payload.purpose,
        remarks=payload.remarks,
        recovery_status="pending",
        amount_recovered=0,
        created_by=current_admin.id,
    )

    db.add(advance)

    try:
        db.flush()
        record_dashboard_event(
            db,
            current_admin,
            action="created advance",
            table_name="advances",
            record_id=advance.id,
            message=f"Advance of {advance.amount} was added for {advance.dealer.dealer_name if advance.dealer else advance.broker.broker_name}",
            preference_key="added",
            new_values=_serialize(advance),
        )
        db.commit()
        db.refresh(advance)
        return _serialize(advance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{advance_id}")
def update_advance(
    advance_id: UUID,
    payload: AdvanceUpdate,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    advance = db.query(Advance).filter(
        Advance.id == advance_id,
        Advance.is_deleted == False,
    ).first()

    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    old_values = _serialize(advance)

    if payload.is_deleted is True:
        advance.is_deleted = True
        advance.deleted_at = datetime.datetime.utcnow()
        record_dashboard_event(
            db,
            current_admin,
            action="deleted advance",
            table_name="advances",
            record_id=advance.id,
            message=f"Advance of {advance.amount} was deleted",
            preference_key="deleted",
            old_values=old_values,
        )
        db.commit()
        return {"status": "success"}

    if payload.amount_recovered is not None:
        if payload.amount_recovered < 0:
            raise HTTPException(status_code=400, detail="Recovered amount cannot be negative")

        if payload.amount_recovered > float(advance.amount):
            raise HTTPException(status_code=400, detail="Recovered amount cannot exceed advance amount")

        advance.amount_recovered = payload.amount_recovered
        advance.recovery_status = _derive_recovery_status(
            float(advance.amount),
            payload.amount_recovered,
        )

    if payload.remarks is not None:
        advance.remarks = payload.remarks

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="updated advance",
            table_name="advances",
            record_id=advance.id,
            message=f"Advance recovery was updated to {advance.recovery_status}",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(advance),
        )
        db.commit()
        db.refresh(advance)
        return _serialize(advance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{advance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_advance(
    advance_id: UUID,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    advance = db.query(Advance).filter(
        Advance.id == advance_id,
        Advance.is_deleted == False,
    ).first()

    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")

    advance.is_deleted = True
    advance.deleted_at = datetime.datetime.utcnow()

    try:
        record_dashboard_event(
            db,
            current_admin,
            action="deleted advance",
            table_name="advances",
            record_id=advance.id,
            message=f"Advance of {advance.amount} was deleted",
            preference_key="deleted",
            old_values=_serialize(advance),
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


# ==========================================================
# ML RISK PREDICTION ENDPOINT
# ==========================================================

class AdvancePredictionRequest(BaseModel):
    party_type: str  # "dealer" or "broker"
    party_id: UUID
    amount: float
    mode: Optional[str] = "cash"
    utr_cheque_number: Optional[str] = ""
    purpose: Optional[str] = ""


@router.post("/predict-risk")
def predict_risk(
    payload: AdvancePredictionRequest,
    db: Session = Depends(get_db),
    current_staff: SystemUser = Depends(get_current_staff),
):
    from sqlalchemy import text
    import time
    import pandas as pd
    from backend.ml.predict import predict_advance
    from backend.ml.rules import calculate_risk_score

    party_type = payload.party_type.lower()
    party_id = payload.party_id
    proposed_amount = payload.amount

    # 1. Fetch historical advances for the party to aggregate advances details
    past_advances_query = db.execute(
        text("""
            SELECT COALESCE(SUM(a.amount), 0) as total_past_amount,
                   COALESCE(SUM(a.amount_recovered), 0) as total_past_recovered
            FROM advances a
            LEFT JOIN file_record f ON a.file_id = f.id
            WHERE a.is_deleted = FALSE
              AND (
                  (a.dealer_id = :party_id AND :party_type = 'dealer')
                  OR (a.broker_id = :party_id AND :party_type = 'broker')
                  OR (f.customer_id = :party_id AND :party_type = 'customer')
              )
        """),
        {"party_id": str(party_id), "party_type": party_type}
    ).mappings().first()

    total_past_amount = float(past_advances_query["total_past_amount"] or 0)
    total_past_recovered = float(past_advances_query["total_past_recovered"] or 0)

    # 2. Fetch latest file details for this party to get loan/financial history
    file_query = text("""
        SELECT 
            f.id, f.customer_id, f.created_by_user_id, f.assigned_to, f.file_number, f.docket_date, f.file_type, f.status as file_status, f.reference_dealer_id, f.reference_broker_id, f.remarks, f.created_at, f.updated_at, f.is_deleted,
            c.id as id_customer, c.full_name, c.email, c.mobile_1, c.mobile_2, c.address, c.city, c.state, c.pincode, c.date_of_birth, c.aadhar_number, c.pan_number, c.customer_type, c.created_by, c.created_at as created_at_customer,
            fi.id as id_finance, fi.file_id, fi.lan_number, fi.loan_amount, fi.no_of_months, fi.emi_amount, fi.bank_id, fi.area, fi.fc_sc_gst_amount, fi.gap_interest, fi.old_loan_amount, fi.irr_percentage, fi.ls_amount, fi.disbursement_amount, fi.rto_hold_amount, fi.total_amount, fi.company_bank_id,
            pi.id as id_payment_in, pi.file_id as file_id_payment_in, pi.payment_amount, pi.paid_amount, pi.remaining_amount, pi.round_up, pi.payment_mode, pi.payment_date, pi.payment_from, pi.cheque_bank_name, pi.branch_name, pi.cheque_no, pi.cheque_date, pi.cheque_amount, pi.utr_no, pi.company_bank_id as company_bank_id_payment_in, pi.remarks as remarks_payment_in,
            po.id as id_payment_out, po.file_id as file_id_payment_out, po.amount, po.payment_mode as payment_mode_payment_out, po.payment_date as payment_date_payment_out, po.payment_to, po.payee_dealer_id, po.payee_broker_id, po.bank_account_no, po.ifsc_code, po.cheque_bank_name as cheque_bank_name_payment_out, po.branch_name as branch_name_payment_out, po.cheque_no as cheque_no_payment_out, po.cheque_date as cheque_date_payment_out, po.cheque_amount as cheque_amount_payment_out, po.utr_no as utr_no_payment_out, po.remarks as remarks_payment_out, po.company_bank_id as company_bank_id_payment_out, po.status
        FROM file_record f
        LEFT JOIN customer c ON f.customer_id = c.id
        LEFT JOIN finance_info fi ON f.id = fi.file_id
        LEFT JOIN (
            SELECT DISTINCT ON (file_id) * FROM payment_in 
            ORDER BY file_id, payment_date DESC, id
        ) pi ON f.id = pi.file_id
        LEFT JOIN (
            SELECT DISTINCT ON (file_id) * FROM payment_out 
            ORDER BY file_id, payment_date DESC, id
        ) po ON f.id = po.file_id
        WHERE f.is_deleted = FALSE
          AND (
              (f.reference_dealer_id = :party_id AND :party_type = 'dealer')
              OR (f.reference_broker_id = :party_id AND :party_type = 'broker')
              OR (f.customer_id = :party_id AND :party_type = 'customer')
          )
        ORDER BY f.created_at DESC
        LIMIT 1
    """)

    db_row = db.execute(file_query, {"party_id": str(party_id), "party_type": party_type}).mappings().first()

    raw_input = {}
    if db_row:
        # Populate raw_input with database row keys
        for key, val in db_row.items():
            if val is not None:
                if hasattr(val, "isoformat"):  # date / datetime
                    raw_input[key] = float(pd.Timestamp(val).timestamp())
                elif hasattr(val, "to_eng_string") or isinstance(val, (int, float)):  # decimals
                    raw_input[key] = float(val)
                else:
                    raw_input[key] = str(val)
            else:
                raw_input[key] = 0.0 if key in ["loan_amount", "emi_amount", "remaining_amount", "amount_recovered", "old_loan_amount", "paid_amount"] else ""
    else:
        # Defaults if no file matches
        raw_input = {
            "loan_amount": 0.0,
            "emi_amount": 0.0,
            "remaining_amount": 0.0,
            "old_loan_amount": 0.0,
        }

    # Add/Override advances columns with proposed + historical aggregates
    if party_type == "customer":
        raw_input["amount_advances"] = total_past_amount
        raw_input["loan_amount"] = proposed_amount
    else:
        raw_input["amount_advances"] = proposed_amount + total_past_amount
        raw_input["loan_amount"] = float(raw_input.get("loan_amount") or 0)

    raw_input["amount_recovered"] = total_past_recovered
    raw_input["advance_date"] = float(time.time())
    raw_input["payment_mode_advances"] = payload.mode
    raw_input["utr_cheque_number"] = payload.utr_cheque_number
    raw_input["purpose"] = payload.purpose
    raw_input["recovery_status"] = "pending"

    if party_type == "dealer":
        raw_input["dealer_id"] = str(party_id)
        raw_input["broker_id"] = ""
    elif party_type == "broker":
        raw_input["dealer_id"] = ""
        raw_input["broker_id"] = str(party_id)
    else:
        # customer - set dealer and broker from their most recent file if it exists
        raw_input["dealer_id"] = str(db_row.get("reference_dealer_id") or "") if db_row else ""
        raw_input["broker_id"] = str(db_row.get("reference_broker_id") or "") if db_row else ""

    # Compute custom feature engineering
    # Tenure
    created_at_customer = raw_input.get("created_at_customer")
    if created_at_customer:
        tenure_days = (time.time() - created_at_customer) / (60 * 60 * 24)
        raw_input["customer_tenure_months"] = max(0, int(tenure_days / 30))
    else:
        raw_input["customer_tenure_months"] = 0

    # Risk Score & Decision
    loan_amount = float(raw_input.get("loan_amount") or 0)
    emi_amount = float(raw_input.get("emi_amount") or 0)
    remaining_amount = float(raw_input.get("remaining_amount") or 0)
    amount_recovered = float(raw_input.get("amount_recovered") or 0)
    old_loan_amount = float(raw_input.get("old_loan_amount") or 0)
    amount_advances = float(raw_input.get("amount_advances") or 0)

    risk_score = calculate_risk_score(
        loan_amount=loan_amount,
        emi_amount=emi_amount,
        remaining_amount=remaining_amount,
        amount_recovered=amount_recovered,
        old_loan_amount=old_loan_amount
    )
    raw_input["risk_score"] = risk_score

    # Ratios
    raw_input["loan_burden_score"] = emi_amount / loan_amount if loan_amount > 0 else 0
    raw_input["advance_ratio"] = amount_advances / loan_amount if loan_amount > 0 else 0
    raw_input["overdue_severity"] = remaining_amount / emi_amount if emi_amount > 0 else 0
    raw_input["recovery_percentage"] = (amount_recovered / amount_advances * 100) if amount_advances > 0 else 0

    try:
        # Run prediction
        prediction = predict_advance(raw_input)
        prediction["risk_score"] = risk_score
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ML Prediction failed: {str(exc)}"
        )

    # Construct clean metrics breakdown for UI
    prediction["key_metrics"] = {
        "loan_amount": loan_amount,
        "emi_amount": emi_amount,
        "remaining_amount": remaining_amount,
        "past_advances_amount": total_past_amount,
        "past_recovered_amount": total_past_recovered,
        "tenure_months": raw_input["customer_tenure_months"],
        "recovery_percentage": round(raw_input["recovery_percentage"], 1)
    }

    return prediction

