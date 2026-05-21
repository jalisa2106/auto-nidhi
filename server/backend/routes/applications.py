from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class ApplicationItem(BaseModel):
    id: str
    customer: str
    phone: str
    service: str
    provider: str
    date: str
    status: str
    badge: str


@router.get("/applications", response_model=List[ApplicationItem])
def get_applications():
    """Return a list of applications.

    This is a lightweight demo endpoint that returns the same shape
    of data expected by the frontend `Applications.tsx` page. You can
    replace the hardcoded list with a DB query (SQLAlchemy) when an
    `applications` table or model exists.
    """

    demo = [
        {"id": "APP/25/089", "customer": "Rajesh Kumar", "phone": "+91 9876543210", "service": "Used Car Loan", "provider": "HDFC Bank", "date": "20 May, 2026", "status": "Approved", "badge": "Loan"},
        {"id": "APP/25/088", "customer": "Priya Mehta", "phone": "+91 8765432109", "service": "Comprehensive", "provider": "New India", "date": "19 May, 2026", "status": "Completed", "badge": "Insurance"},
        {"id": "APP/25/087", "customer": "Suresh Patel", "phone": "+91 7654321098", "service": "Ownership Transfer", "provider": "RTO Gujarat", "date": "18 May, 2026", "status": "Action Needed", "badge": "RTO"},
        {"id": "APP/25/086", "customer": "Anita Shah", "phone": "+91 6543210987", "service": "New Car Loan", "provider": "ICICI Bank", "date": "18 May, 2026", "status": "Under Process", "badge": "Loan"},
    ]

    return demo
