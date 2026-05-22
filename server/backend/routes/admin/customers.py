from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID
import datetime

from backend.database import get_db, engine

router = APIRouter(prefix="/api/v1/customers", tags=["Admin Customers"])


class CustomerCreate(BaseModel):
	name: str = Field(..., alias="full_name")
	mobile: str = Field(..., alias="mobile_1")
	email: Optional[str] = None
	city: Optional[str] = None


class CustomerOut(BaseModel):
	id: UUID
	full_name: str
	email: Optional[str] = None
	mobile_1: str
	city: Optional[str] = None
	created_at: datetime.datetime

	class Config:
		orm_mode = True


@router.get("/", response_model=List[CustomerOut])
def list_customers(page: int = 1, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
	"""Return list of customers. Supports simple search on name/mobile/email."""
	base_sql = "SELECT id, full_name, email, mobile_1, city, created_at FROM customer"
	params = {}
	where_clauses = []
	if search:
		where_clauses.append("(full_name ILIKE :s OR mobile_1 ILIKE :s OR email ILIKE :s)")
		params['s'] = f"%{search}%"
	if where_clauses:
		base_sql += " WHERE " + " AND ".join(where_clauses)
	base_sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
	params['limit'] = limit
	params['offset'] = (page - 1) * limit

	result = db.execute(text(base_sql), params)
	rows = [dict(r) for r in result.mappings().all()]
	return rows


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: UUID, db: Session = Depends(get_db)):
	sql = "SELECT id, full_name, email, mobile_1, city, created_at FROM customer WHERE id = :id"
	res = db.execute(text(sql), {"id": str(customer_id)})
	row = res.mappings().first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
	return dict(row)


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
	# Map incoming minimal fields to DB columns
	insert_sql = text(
		"""
		INSERT INTO customer (full_name, email, mobile_1, city)
		VALUES (:full_name, :email, :mobile_1, :city)
		RETURNING id, full_name, email, mobile_1, city, created_at
		"""
	)
	params = {
		"full_name": payload.name or payload.__dict__.get('full_name') or payload.__dict__.get('name'),
		"email": payload.email,
		"mobile_1": payload.mobile or payload.__dict__.get('mobile_1'),
		"city": payload.city,
	}

	try:
		res = db.execute(insert_sql, params)
		db.commit()
		created = res.mappings().first()
		return dict(created)
	except Exception as e:
		db.rollback()
		# Unique violation on mobile or other DB constraint
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))