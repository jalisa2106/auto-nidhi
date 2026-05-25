from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Date, text, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base
import datetime

class MasterRole(Base):
    __tablename__ = "master_role"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    role_name = Column(String(50), nullable=False, unique=True)
    description = Column(String)

class SystemUser(Base):
    __tablename__ = "system_user"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("master_role.id"))
    first_name = Column(String(100), nullable=False, default="User")
    last_name = Column(String(100))
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(15))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)

    role = relationship("MasterRole")


class Customer(Base):
    __tablename__ = "customer"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    mobile_1 = Column(String(15), nullable=False, unique=True)
    mobile_2 = Column(String(15))
    address = Column(String)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    date_of_birth = Column(Date)
    aadhar_number = Column(String(20))
    pan_number = Column(String(10))
    # customer_type is an ENUM in DB, mapped as String in SQLAlchemy
    customer_type = Column(String, nullable=False, default='individual') 
    # Foreign Key linking to the user who created this customer
    created_by = Column(UUID(as_uuid=True), ForeignKey("system_user.id")) 
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    # Relationship to easily access the creator's details if needed
    creator = relationship("SystemUser", foreign_keys=[created_by])

class MasterDealer(Base):
    __tablename__ = "master_dealer"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    dealer_name = Column(String(255), nullable=False)

class MasterBroker(Base):
    __tablename__ = "master_broker"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    broker_name = Column(String(255), nullable=False)

class FileRecord(Base):
    __tablename__ = "file_record"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("system_user.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("system_user.id"))
    file_number = Column(String(50), unique=True)
    docket_date = Column(Date)
    file_type = Column(String) 
    status = Column(String, nullable=False, default='draft')
    remarks = Column(String)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))

    customer = relationship("Customer")
    creator = relationship("SystemUser", foreign_keys=[created_by_user_id])
    assignee = relationship("SystemUser", foreign_keys=[assigned_to])

class MasterCompanyBank(Base):
    __tablename__ = "master_company_bank"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    bank_name = Column(String(255), nullable=False)
    area = Column(String(255))
    account_number = Column(String(50), nullable=False, unique=True)
    ifsc_code = Column(String(20), nullable=False)

class PaymentIn(Base):
    __tablename__ = "payment_in"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    payment_amount = Column(DECIMAL(15,2), nullable=False)
    paid_amount = Column(DECIMAL(15,2))
    remaining_amount = Column(DECIMAL(15,2))
    round_up = Column(Boolean, default=False)
    payment_mode = Column(String, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_from = Column(String)
    cheque_bank_name = Column(String(255))
    branch_name = Column(String(255))
    cheque_no = Column(String(50))
    cheque_date = Column(Date)
    cheque_amount = Column(DECIMAL(15,2))
    utr_no = Column(String(100))
    company_bank_id = Column(UUID(as_uuid=True), ForeignKey("master_company_bank.id"))
    remarks = Column(String)
    # Relationships to fetch joined data easily
    file = relationship("FileRecord")
    company_bank = relationship("MasterCompanyBank")

class PaymentOut(Base):
    __tablename__ = "payment_out"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    amount = Column(DECIMAL(15,2), nullable=False)
    payment_mode = Column(String, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_to = Column(String)
    payee_dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"))
    payee_broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"))
    bank_account_no = Column(String(50))
    ifsc_code = Column(String(20))
    cheque_bank_name = Column(String(255))
    branch_name = Column(String(255))
    cheque_no = Column(String(50))
    cheque_date = Column(Date)
    cheque_amount = Column(DECIMAL(15,2))
    utr_no = Column(String(100))
    remarks = Column(String)
    # Relationships
    file = relationship("FileRecord")