from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class MiniCard(BaseModel):
    id: str
    label: str
    value: str
    color: str | None = None


class PaymentItem(BaseModel):
    label: str
    amt: str
    color: str | None = None


class DashboardResponse(BaseModel):
    activeFiles: int
    activeFilesDeltaWeek: int
    heroStats: dict
    miniCards: list[MiniCard]
    todaysPayments: list[PaymentItem]
    updatedAt: str


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard():
    # Demo data — replace with DB queries/aggregations
    return {
        "activeFiles": 248,
        "activeFilesDeltaWeek": 12,
        "heroStats": {
            "filesManaged": "10K+",
            "loansProcessed": "₹500Cr+",
            "uptime": "99.9%",
        },
        "miniCards": [
            {"id": "commission", "label": "Commission In", "value": "₹42L", "color": "#15803d"},
            {"id": "expiring", "label": "Expiring Soon", "value": "18", "color": "#f59e0b"},
            {"id": "disbursed", "label": "Disbursed", "value": "96", "color": "#15803d"},
        ],
        "todaysPayments": [
            {"label": "HDFC Bank — Commission", "amt": "₹38,500", "color": "#15803d"},
            {"label": "New India — Insurance", "amt": "₹12,200", "color": "#15803d"},
            {"label": "Dealer Payout", "amt": "-₹8,000", "color": "#ef4444"},
        ],
        "updatedAt": datetime.utcnow().isoformat(),
    }
