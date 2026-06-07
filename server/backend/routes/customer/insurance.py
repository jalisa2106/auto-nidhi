from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.utils import get_current_customer, get_customer_for_user
from backend.database import get_db
from backend.models import (
    Customer,
    FileRecord,
    InsuranceInfo,
    InsurancePayment,
    MasterInsuranceCompany,
    SystemUser,
)

router = APIRouter(prefix="/api/v1/portal", tags=["Customer Insurance"])

@router.get("/insurance")
def customer_insurance(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = get_customer_for_user(current_user, db)
    if not customer:
        return []

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

    payment_policies = (
        db.query(InsurancePayment)
        .join(FileRecord, FileRecord.id == InsurancePayment.file_id)
        .outerjoin(
            MasterInsuranceCompany,
            MasterInsuranceCompany.id == InsurancePayment.insurance_company_id,
        )
        .filter(FileRecord.is_deleted == False)
        .filter(InsurancePayment.is_deleted == False)
        .filter(FileRecord.customer_id == customer.id)
        .order_by(InsurancePayment.valid_to.desc().nullslast())
        .all()
    )

    info_rows = [
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

    payment_rows = [
        {
            "file_number": payment.file.file_number if payment.file else "",
            "file_type": payment.file.file_type if payment.file else "",
            "company_name": (
                payment.insurance_company.company_name
                if payment.insurance_company
                else payment.payee_name or "Unknown Insurer"
            ),
            "policy_number": f"IP-{str(payment.id)[-8:]}",
            "valid_from": payment.payment_date.strftime("%Y-%m-%d") if payment.payment_date else None,
            "valid_to": payment.valid_to.strftime("%Y-%m-%d") if payment.valid_to else None,
            "premium_amount": float(payment.amount or 0),
            "idv_amount": 0,
        }
        for payment in payment_policies
    ]

    return info_rows + payment_rows
