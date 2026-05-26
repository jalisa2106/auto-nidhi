from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import FileRecord
from typing import Optional

router = APIRouter(prefix="/api/v1/files", tags=["Admin Files"])

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
        # Format 'new_vehicle' to 'New Vehicle' for cleaner UI display
        "type": f.file_type.replace('_', ' ').title() if f.file_type else "N/A",     
        "status": f.status.title(),
        # Fetch relationships added back to match the old UI
        "bank": f.finance_info.bank.bank_name if f.finance_info and f.finance_info.bank else "—",
        "assigned": f.assignee.first_name if f.assignee else "Unassigned",
        "created": f.created_at.strftime("%Y-%m-%d")
    } for f in files]
    
    return {"data": data, "total": total, "page": page, "limit": limit}