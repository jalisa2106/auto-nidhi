import os
import shutil
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Customer, CustomerDocument
from backend.utils import get_current_customer_profile

router = APIRouter(prefix="/api/v1/portal/documents", tags=["Customer Documents"])

UPLOAD_DIR = "uploads/customer_documents"

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
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
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

    safe_name = upload.filename.replace("/", "_").replace("\\", "_")
    stored_name = f"{document_id}_{safe_name}"
    path = os.path.join(UPLOAD_DIR, stored_name)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(contents, buffer)

    doc.file_name = upload.filename
    doc.file_path = path
    doc.file_size = os.path.getsize(path)
    doc.content_type = upload.content_type
    doc.status = "pending_review"
    doc.rejection_reason = None
    doc.uploaded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(doc)

    return serialize(doc)


@router.delete("/{document_id}")
def remove_document(
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

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    doc.file_name = None
    doc.file_path = None
    doc.file_size = None
    doc.content_type = None
    doc.status = "missing"
    doc.rejection_reason = None
    doc.uploaded_at = None

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