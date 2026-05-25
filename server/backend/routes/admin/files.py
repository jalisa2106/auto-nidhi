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
        "id": str(f.id),              # Keep ID as the UUID for navigation
        "file_number": f.file_number, # This is for display
        "customer": f.customer.full_name if f.customer else "N/A",
        "file_type": f.file_type,     # Changed from 'type' to match column key
        "status": f.status.capitalize(),
        "created": f.created_at.strftime("%Y-%m-%d")
    } for f in files]
    
    return {"data": data, "total": total, "page": page, "limit": limit}