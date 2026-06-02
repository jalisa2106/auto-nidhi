from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import datetime

from backend.database import get_db
from backend.models import FileRecord, SystemUser, FinanceInfo
from backend.utils import get_current_staff, get_current_admin, record_dashboard_event

router = APIRouter(prefix="/api/v1/files", tags=["Admin Files"])

class FileCreate(BaseModel):
    customer_id: UUID
    bank_id: UUID
    file_type: str
    status: str
    docket_date: Optional[str] = None
    remarks: Optional[str] = None

class FileUpdate(BaseModel):
    file_type: Optional[str] = None
    status: Optional[str] = None
    docket_date: Optional[str] = None
    remarks: Optional[str] = None
    assigned_to: Optional[UUID] = None

def generate_file_number(db: Session) -> str:
    current_year = datetime.datetime.now().year
    prefix = f"FILE/{current_year}/"
    
    # Find the highest existing file number for the current year
    highest_file = db.query(FileRecord).filter(
        FileRecord.file_number.like(f"{prefix}%")
    ).order_by(FileRecord.file_number.desc()).first()

    if highest_file and highest_file.file_number.startswith(prefix):
        try:
            last_seq = int(highest_file.file_number.split('/')[-1])
            new_seq = last_seq + 1
        except ValueError:
            new_seq = 1
    else:
        new_seq = 1

    return f"{prefix}{new_seq:03d}"

@router.get("/")
def list_files(
    page: int = 1, 
    limit: int = 20, 
    status: Optional[str] = None, 
    file_type: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(FileRecord).filter(FileRecord.is_deleted == False)
    
    if status:
        query = query.filter(FileRecord.status == status)
    if file_type:
        query = query.filter(FileRecord.file_type == file_type)

    total = query.count()
    files = query.offset((page - 1) * limit).limit(limit).all()
    
    data = [{
        "id": str(f.id),              
        "file_number": f.file_number, 
        "customer": f.customer.full_name if f.customer else "N/A",
        "type": f.file_type.replace('_', ' ').title() if f.file_type else "N/A",     
        "status": f.status.title(),
        "bank": f.finance_info.bank.bank_name if f.finance_info and f.finance_info.bank else "—",
        "assigned": f.assignee.first_name if f.assignee else "Unassigned",
        "created": f.created_at.strftime("%Y-%m-%d")
    } for f in files]
    
    return {"data": data, "total": total, "page": page, "limit": limit}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_file(payload: FileCreate, db: Session = Depends(get_db), current_user: SystemUser = Depends(get_current_staff)):
    
    # Auto-generate the file number securely
    new_file_num = generate_file_number(db)

    new_file = FileRecord(
        customer_id=payload.customer_id,
        created_by_user_id=current_user.id,
        assigned_to=current_user.id,
        file_number=new_file_num,
        file_type=payload.file_type,
        status=payload.status,
        remarks=payload.remarks
    )
    db.add(new_file)
    db.flush() # Flush to get the file ID for FinanceInfo

    # Create the associated FinanceInfo to link the bank
    new_finance_info = FinanceInfo(
        file_id=new_file.id,
        bank_id=payload.bank_id
    )
    db.add(new_finance_info)

    try:
        record_dashboard_event(
            db,
            current_user,
            action="created file",
            table_name="file_record",
            record_id=new_file.id,
            message=f"File {new_file.file_number} was created",
            preference_key="added",
            new_values={
                "id": str(new_file.id),
                "file_number": new_file.file_number,
                "customer_id": str(new_file.customer_id),
                "file_type": new_file.file_type,
                "status": new_file.status,
                "bank_id": str(payload.bank_id),
            },
        )
        db.commit()
        db.refresh(new_file)
        return {"status": "success", "id": str(new_file.id), "file_number": new_file.file_number}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{file_id}/", status_code=200)
def update_file(
    file_id: UUID,
    payload: FileUpdate,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff)
):
    file = db.query(FileRecord).filter(
        FileRecord.id == file_id,
        FileRecord.is_deleted == False
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if payload.file_type is not None:
        file.file_type = payload.file_type
    if payload.status is not None:
        file.status = payload.status
    if payload.remarks is not None:
        file.remarks = payload.remarks
    if payload.docket_date is not None:
        try:
            file.docket_date = datetime.date.fromisoformat(payload.docket_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid docket_date format. Use YYYY-MM-DD.")
    if payload.assigned_to is not None:
        file.assigned_to = payload.assigned_to

    file.updated_at = datetime.datetime.utcnow()

    try:
        record_dashboard_event(
            db,
            current_user,
            action="updated file",
            table_name="file_record",
            record_id=file.id,
            message=f"File {file.file_number} was updated",
            preference_key="updated",
        )
        db.commit()
        db.refresh(file)
        return {"status": "success", "id": str(file.id), "file_number": file.file_number}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{file_id}/", status_code=200)
def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_admin)
):
    file = db.query(FileRecord).filter(
        FileRecord.id == file_id,
        FileRecord.is_deleted == False
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file.is_deleted = True
    file.updated_at = datetime.datetime.utcnow()

    try:
        record_dashboard_event(
            db,
            current_user,
            action="deleted file",
            table_name="file_record",
            record_id=file.id,
            message=f"File {file.file_number} was deleted",
            preference_key="deleted",
        )
        db.commit()
        return {"status": "success", "message": f"File {file.file_number} deleted"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
