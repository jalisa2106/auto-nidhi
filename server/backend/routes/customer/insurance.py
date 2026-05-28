from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.utils import get_current_customer_profile
from backend.database import get_db
from backend.models import (
    Customer,
    SystemUser,
    FileRecord,
    InsuranceInfo,
    MasterInsuranceCompany,
)
from backend.utils import get_current_customer

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Insurance"])


@router.get("/insurance")
def customer_insurance(
    customer: Customer = Depends(get_current_customer_profile),
    db: Session = Depends(get_db),
):
    policies = (
        db.query(InsuranceInfo)
        .join(FileRecord, FileRecord.id == InsuranceInfo.file_id)
        .outerjoin(
            MasterInsuranceCompany,
            MasterInsuranceCompany.id == InsuranceInfo.insurance_company_id,
        )
        .filter(FileRecord.is_deleted == False)
        .filter(FileRecord.customer_id == customer.id)
        .order_by(InsuranceInfo.valid_to.desc().nullslast())
        .all()
    )

    return [
        {
            "file_number": policy.file.file_number if policy.file else "",
            "file_type": policy.file.file_type if policy.file else "",
            "company_name": (
                policy.insurance_company.company_name
                if policy.insurance_company
                else "Unknown Insurer"
            ),
            "policy_number": policy.policy_number or "",
            "valid_from": policy.valid_from.strftime("%Y-%m-%d") if policy.valid_from else None,
            "valid_to": policy.valid_to.strftime("%Y-%m-%d") if policy.valid_to else None,
            "premium_amount": float(policy.premium_amount or 0),
            "idv_amount": float(policy.idv_amount or 0),
        }
        for policy in policies
    ]