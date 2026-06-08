import os
import shutil
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Customer, CustomerDocument, SystemUser
from backend.utils import get_current_customer, get_current_customer_profile, record_dashboard_event, get_current_staff, send_targeted_notification, get_system_user_for_customer
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/portal/documents", tags=["Customer Documents"])

class DocumentVerifyPayload(BaseModel):
    status: str
    rejection_reason: str = ""

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOAD_DIR = os.getenv("CUSTOMER_DOCUMENT_UPLOAD_DIR") or os.path.join(
    BACKEND_DIR, "uploads", "customer_documents"
)

# Keep in sync with frontend guardrails (CustomerDocumentsPage.tsx)
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB

DEFAULT_SLOTS = [
    ("aadhar_front", "Aadhaar Card (Front)", "kyc"),
    ("aadhar_back", "Aadhaar Card (Back)", "kyc"),
    ("pan_card", "PAN Card Official Copy", "kyc"),
    ("passport_photo", "Passport Size Photograph", "kyc"),
    ("address_proof", "Permanent Address Proof", "kyc"),
    ("vehicle_rc", "Vehicle RC Book", "transactional"),
    ("insurance_copy", "Motor Insurance Policy Copy", "transactional"),
    ("dealer_invoice", "Commercial Proforma Invoice", "transactional"),
]


def serialize(doc: CustomerDocument):
    return {
        "id": str(doc.id),
        "document_type": doc.document_type,
        "label": doc.label,
        "category": doc.category,
        "status": doc.status,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "uploaded_at": doc.uploaded_at.isoformat() if hasattr(doc.uploaded_at, "isoformat") else str(doc.uploaded_at) if doc.uploaded_at else None,
        "rejection_reason": doc.rejection_reason,
    }


def ensure_slots(db: Session, customer: Customer):
    existing_types = {
        row.document_type
        for row in db.query(CustomerDocument)
        .filter(CustomerDocument.customer_id == customer.id)
        .all()
    }

    for document_type, label, category in DEFAULT_SLOTS:
        if document_type not in existing_types:
            db.add(CustomerDocument(
                customer_id=customer.id,
                document_type=document_type,
                label=label,
                category=category,
                status="missing",
            ))

    db.commit()


@router.get("")
def list_documents(
    customer: Customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    ensure_slots(db, customer)

    docs = (
        db.query(CustomerDocument)
        .filter(CustomerDocument.customer_id == customer.id)
        .order_by(CustomerDocument.category, CustomerDocument.created_at)
        .all()
    )

    return [serialize(doc) for doc in docs]


@router.post("/{document_id}/upload")
def upload_document(
    document_id: UUID,
    upload: UploadFile = File(...),
    current_user: SystemUser = Depends(get_current_customer),
    customer: Customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    if upload.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, and PNG files are allowed")

    contents = upload.file
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    doc = (
        db.query(CustomerDocument)
        .filter(
            CustomerDocument.id == document_id,
            CustomerDocument.customer_id == customer.id,
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document slot not found")

    old_values = {
        "status": doc.status,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "uploaded_at": doc.uploaded_at.isoformat() if hasattr(doc.uploaded_at, "isoformat") else str(doc.uploaded_at) if doc.uploaded_at else None,
    }

    safe_name = upload.filename.replace("/", "_").replace("\\", "_")
    stored_name = f"{document_id}_{safe_name}"
    path = os.path.join(UPLOAD_DIR, stored_name)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(contents, buffer)

    size = os.path.getsize(path)
    if size > MAX_UPLOAD_BYTES:
        # cleanup and fail fast
        os.remove(path)
        raise HTTPException(status_code=400, detail="File size must be 5MB or less")

    doc.file_name = upload.filename
    doc.file_path = path
    doc.file_size = size
    doc.content_type = upload.content_type
    doc.status = "pending_review"
    doc.rejection_reason = None
    doc.uploaded_at = datetime.now(timezone.utc)

    record_dashboard_event(
        db,
        current_user,
        action="uploaded",
        table_name="customer_document",
        record_id=doc.id,
        message=f"Customer uploaded document: {doc.label}",
        preference_key="document",
        old_values=old_values,
        new_values={
            "status": doc.status,
            "file_name": doc.file_name,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at.isoformat() if hasattr(doc.uploaded_at, "isoformat") else str(doc.uploaded_at) if doc.uploaded_at else None,
        },
    )

    db.commit()
    db.refresh(doc)

    return serialize(doc)


@router.delete("/{document_id}")
def remove_document(
    document_id: UUID,
    current_user: SystemUser = Depends(get_current_customer),
    customer: Customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(CustomerDocument)
        .filter(
            CustomerDocument.id == document_id,
            CustomerDocument.customer_id == customer.id,
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    old_values = {
        "status": doc.status,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "uploaded_at": doc.uploaded_at.isoformat() if hasattr(doc.uploaded_at, "isoformat") else str(doc.uploaded_at) if doc.uploaded_at else None,
    }

    doc.file_name = None
    doc.file_path = None
    doc.file_size = None
    doc.content_type = None
    doc.status = "missing"
    doc.rejection_reason = None
    doc.uploaded_at = None

    record_dashboard_event(
        db,
        current_user,
        action="deleted",
        table_name="customer_document",
        record_id=doc.id,
        message=f"Customer removed document: {doc.label}",
        preference_key="document",
        old_values=old_values,
        new_values={"status": doc.status, "file_name": None, "file_size": None, "uploaded_at": None},
    )

    db.commit()

    return {"message": "Document removed"}


@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    customer: Customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(CustomerDocument)
        .filter(
            CustomerDocument.id == document_id,
            CustomerDocument.customer_id == customer.id,
        )
        .first()
    )

    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        doc.file_path,
        filename=doc.file_name,
        media_type=doc.content_type,
    )

@router.patch("/{document_id}/verify")
def verify_document(
    document_id: UUID,
    payload: DocumentVerifyPayload,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff)
):
    doc = db.query(CustomerDocument).filter(CustomerDocument.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
        
    doc.status = payload.status
    doc.reviewed_by = current_user.id
    doc.reviewed_at = datetime.now(timezone.utc)
    if payload.status == 'rejected':
        doc.rejection_reason = payload.rejection_reason
    else:
        doc.rejection_reason = None
        
    db.commit()

    customer_user = get_system_user_for_customer(db, doc.customer_id)
    if customer_user:
        notif_type = 'document_approved' if payload.status == 'verified' else 'document_rejected'
        send_targeted_notification(db, customer_user.id, f"Your document '{doc.label}' has been {payload.status}.", notif_type)
        
    return {"updated": True}
