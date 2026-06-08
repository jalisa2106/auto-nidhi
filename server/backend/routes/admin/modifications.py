import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import MasterRole, ModificationRequest, SystemUser
from backend.utils import (
    get_current_admin,
    get_current_staff,
    record_dashboard_event,
    send_targeted_notification,
)

router = APIRouter(tags=["Modification Requests"])

VALID_ENTITY_TYPES = {
    "file_record",
    "customer_profile",
    "insurance_metadata",
    "payment_in_ledger",
    "payment_out_ledger",
    "commission_distribution",
    "advances_outstanding",
}
VALID_REQUEST_TYPES = {"update", "delete"}

# Updated Pipeline Stages
VALID_DECISIONS = {"verification", "in_progress", "completed", "rejected"}


class ModificationCreate(BaseModel):
    entity_type: str
    entity_id: str
    request_type: str
    reason: str

    @validator("entity_type")
    def validate_entity_type(cls, value: str) -> str:
        value = value.strip()
        if value not in VALID_ENTITY_TYPES:
            raise ValueError("Invalid entity type")
        return value

    @validator("entity_id")
    def validate_entity_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Target identifier is required")
        return value

    @validator("request_type")
    def validate_request_type(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in VALID_REQUEST_TYPES:
            raise ValueError("Invalid request type")
        return value

    @validator("reason")
    def validate_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Reason is required")
        return value


class ModificationDecision(BaseModel):
    decision: str
    note: Optional[str] = None

    @validator("decision")
    def validate_decision(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in VALID_DECISIONS:
            raise ValueError(f"Decision must be one of {VALID_DECISIONS}")
        return value


def _role_name(user: Optional[SystemUser]) -> str:
    if not user or not user.role:
        return "Staff"
    return user.role.role_name.replace("_", " ").title()


def _display_name(user: Optional[SystemUser]) -> str:
    if not user:
        return "Unknown User"
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return name or user.email


def _serialize(row: ModificationRequest) -> dict:
    return {
        "id": str(row.id),
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "request_type": row.request_type,
        "reason": row.reason,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "decision_note": row.decision_note,
        "submitted_by": str(row.submitted_by),
        "submitted_by_name": _display_name(row.submitter),
        "submitted_by_role": _role_name(row.submitter),
        "reviewed_by": str(row.reviewed_by) if row.reviewed_by else None,
        "reviewed_by_name": _display_name(row.reviewer) if row.reviewer else None,
    }


@router.get("/api/v1/customer/modifications")
def list_my_modifications(
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    rows = (
        db.query(ModificationRequest)
        .filter(ModificationRequest.submitted_by == current_user.id)
        .order_by(ModificationRequest.created_at.desc())
        .all()
    )
    return [_serialize(row) for row in rows]


@router.post("/api/v1/customer/modifications", status_code=status.HTTP_201_CREATED)
def create_modification(
    payload: ModificationCreate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff),
):
    request = ModificationRequest(
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        request_type=payload.request_type,
        reason=payload.reason,
        status="pending",
        submitted_by=current_user.id,
    )
    db.add(request)

    try:
        db.flush()
        record_dashboard_event(
            db,
            current_user,
            action="submitted modification request",
            table_name="modification_request",
            record_id=request.id,
            message=f"Modification request submitted for {request.entity_type}: {request.entity_id}",
            preference_key="added",
            new_values=_serialize(request),
        )

        admin_role = db.query(MasterRole).filter(MasterRole.role_name.ilike("admin")).first()
        if admin_role:
            admins = (
                db.query(SystemUser)
                .filter(SystemUser.role_id == admin_role.id, SystemUser.is_active == True)
                .all()
            )
            for admin in admins:
                send_targeted_notification(
                    db=db,
                    target_user_id=admin.id,
                    message=(
                        f"{_display_name(current_user)} requested {request.request_type} approval "
                        f"for {request.entity_type}: {request.entity_id}"
                    ),
                    notification_type="general",
                )

        db.commit()
        db.refresh(request)
        return _serialize(request)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/api/v1/admin/modifications/pipeline")
def list_admin_pipeline(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    query = db.query(ModificationRequest)

    if status_filter:
        query = query.filter(ModificationRequest.status == status_filter.strip().lower())

    rows = query.order_by(
        ModificationRequest.status.asc(),
        ModificationRequest.created_at.desc(),
    ).all()

    return [_serialize(row) for row in rows]


@router.post("/api/v1/admin/modifications/pipeline/{request_id}/evaluate")
def evaluate_modification(
    request_id: UUID,
    payload: ModificationDecision,
    db: Session = Depends(get_db),
    current_admin: SystemUser = Depends(get_current_admin),
):
    request = db.query(ModificationRequest).filter(ModificationRequest.id == request_id).first()

    if not request:
        raise HTTPException(status_code=404, detail="Modification request not found")

    # Prevent editing if it's already finalized
    if request.status in ["completed", "rejected"]:
        raise HTTPException(status_code=400, detail="Modification request is already finalized and cannot be changed.")

    old_values = _serialize(request)
    request.status = payload.decision
    request.reviewed_by = current_admin.id
    request.reviewed_at = datetime.datetime.utcnow()
    request.updated_at = datetime.datetime.utcnow()
    
    note = payload.note.strip() if payload.note else None
    request.decision_note = note
    if payload.decision == "rejected":
        request.rejection_reason = note
    else:
        request.admin_notes = note

    try:
        record_dashboard_event(
            db,
            current_admin,
            action=f"moved modification request to {request.status}",
            table_name="modification_request",
            record_id=request.id,
            message=f"Modification request {request.entity_id} was updated to {request.status.replace('_', ' ')}",
            preference_key="updated",
            old_values=old_values,
            new_values=_serialize(request),
        )
        send_targeted_notification(
            db=db,
            target_user_id=request.submitted_by,
            message=f"Your modification request for {request.entity_type}: {request.entity_id} is now {request.status.replace('_', ' ')}.",
            notification_type="general",
        )
        db.commit()
        db.refresh(request)
        return _serialize(request)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))