from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Date, text, DECIMAL, Numeric, Integer, Text
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
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)

    role = relationship("MasterRole")

class MasterCompanyProfile(Base):
    __tablename__ = "master_company_profile"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    company_name = Column(String(255), nullable=False)
    address_1 = Column(Text, nullable=False)
    address_2 = Column(Text)
    mobile_no = Column(String(15), nullable=False)
    phone_no = Column(String(15))
    country = Column(String(100))
    state = Column(String(100))
    city = Column(String(100))
    pincode = Column(String(20))
    email_address = Column(String(255))
    fax_no = Column(String(50))
    website = Column(String(255))
    contact_person_1 = Column(String(255))
    contact_person_2 = Column(String(255))
    tin_no = Column(String(50))
    gst_no = Column(String(50))
    cst_no = Column(String(50))
    pan_no = Column(String(50))
    insurance_expiry_notification = Column(Text)
    opening_balance = Column(DECIMAL(15, 2))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


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
    address = Column(Text)
    city = Column(String(100))
    phone = Column(String(15), unique=True)
    email = Column(String(255))
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class MasterBroker(Base):
    __tablename__ = "master_broker"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    broker_name = Column(String(255), nullable=False)
    area = Column(String(100))
    district = Column(String(100))
    phone = Column(String(15), unique=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class Advance(Base):
    __tablename__ = "advances"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"), nullable=True)
    broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"), nullable=True)
    advance_date = Column(Date, nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False)
    mode = Column(String, nullable=False)
    utr_cheque_number = Column(String(50))
    purpose = Column(String(500))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=True)
    recovery_status = Column(String, nullable=False, default="pending")
    amount_recovered = Column(DECIMAL(15, 2), nullable=False, default=0)
    remarks = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("system_user.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    dealer = relationship("MasterDealer", foreign_keys=[dealer_id])
    broker = relationship("MasterBroker", foreign_keys=[broker_id])
    file = relationship("FileRecord", foreign_keys=[file_id])
    creator = relationship("SystemUser", foreign_keys=[created_by])

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
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))

    customer = relationship("Customer")
    creator = relationship("SystemUser", foreign_keys=[created_by_user_id])
    assignee = relationship("SystemUser", foreign_keys=[assigned_to])
    finance_info = relationship("FinanceInfo", uselist=False)

class MasterBank(Base):
    __tablename__ = "master_bank"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    bank_name = Column(String(255), nullable=False)
    area = Column(String(255))
    contact_no = Column(String(15))

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

class FinanceInfo(Base):
    __tablename__ = "finance_info"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False, unique=True)

    lan_number = Column(String(100))
    loan_amount = Column(DECIMAL(15,2))
    emi_amount = Column(DECIMAL(15,2))
    no_of_months = Column(Integer)
    irr_percentage = Column(DECIMAL(5,2))

    # Points to master_bank (external finance bank), NOT master_company_bank
    bank_id = Column(UUID(as_uuid=True), ForeignKey("master_bank.id"))

    bank = relationship("MasterBank")
    file = relationship("FileRecord")

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
    company_bank_id = Column(UUID(as_uuid=True), ForeignKey("master_company_bank.id"), nullable=True)
    remarks = Column(String)
    # Relationships
    file = relationship("FileRecord")
    payee_dealer = relationship("MasterDealer", foreign_keys=[payee_dealer_id])
    payee_broker = relationship("MasterBroker", foreign_keys=[payee_broker_id])
    company_bank = relationship("MasterCompanyBank", foreign_keys=[company_bank_id])

class RTOPayment(Base):
    __tablename__ = "rto_payment"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_mode = Column(String, nullable=False)
    payee_dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"))
    payee_broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"))
    amount = Column(DECIMAL(15,2), nullable=False)
    bank_account_no = Column(String(50))
    ifsc_code = Column(String(20))
    cheque_bank_name = Column(String(255))
    branch_name = Column(String(255))
    cheque_no = Column(String(50))
    cheque_date = Column(Date)
    cheque_amount = Column(DECIMAL(15,2))
    utr_no = Column(String(100))
    remarks = Column(String)
    file = relationship("FileRecord")
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    payee_dealer = relationship("MasterDealer", foreign_keys=[payee_dealer_id])
    payee_broker = relationship("MasterBroker", foreign_keys=[payee_broker_id])

class CommissionIn(Base):
    __tablename__ = "commission_in"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    payment_by = Column(String(100))
    amount = Column(DECIMAL(15, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    company_bank_id = Column(UUID(as_uuid=True), ForeignKey("master_company_bank.id"))
    remarks = Column(String)

    file = relationship("FileRecord")
    company_bank = relationship("MasterCompanyBank")


class CommissionOut(Base):
    __tablename__ = "commission_out"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    payee_type = Column(String, nullable=False)  # payee_type_enum in DB; keep as String mapping
    payee_dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"))
    payee_broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"))
    amount = Column(DECIMAL(15, 2), nullable=False)
    payment_mode = Column(String, nullable=False)
    payment_date = Column(Date, nullable=False)
    is_advance = Column(Boolean, default=False)
    bank_account_no = Column(String(50))
    ifsc_code = Column(String(20))
    cheque_bank_name = Column(String(255))
    branch_name = Column(String(255))
    cheque_no = Column(String(50))
    cheque_date = Column(Date)
    cheque_amount = Column(DECIMAL(15, 2))
    utr_no = Column(String(100))
    company_bank_id = Column(UUID(as_uuid=True), ForeignKey("master_company_bank.id"), nullable=True)
    remarks = Column(String)

    file = relationship("FileRecord")
    payee_dealer = relationship("MasterDealer", foreign_keys=[payee_dealer_id])
    payee_broker = relationship("MasterBroker", foreign_keys=[payee_broker_id])

class ExpenseLedger(Base):
    __tablename__ = "expense_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    amount = Column(Numeric(15,2))
    expense_date = Column(Date)
    remarks = Column(String)

    expense_category_id = Column(UUID(as_uuid=True), ForeignKey("master_expense_category.id"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("system_user.id"))

    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    is_deleted = Column(Boolean, default=False)

class MasterExpenseCategory(Base):
    __tablename__ = "master_expense_category"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    expense_name = Column(String(255), nullable=False)
    company_bank_id = Column(String, ForeignKey("master_company_bank.id"), nullable=True)
    
    company_bank = relationship("MasterCompanyBank", foreign_keys=[company_bank_id])

class InsurancePayment(Base):
    __tablename__ = "insurance_payment"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_record.id"), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_mode = Column(String, nullable=False)
    payee_dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"))
    payee_broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"))
    amount = Column(DECIMAL(15,2), nullable=False)
    bank_account_no = Column(String(50))
    ifsc_code = Column(String(20))
    cheque_bank_name = Column(String(255))
    branch_name = Column(String(255))
    cheque_no = Column(String(50))
    cheque_date = Column(Date)
    cheque_amount = Column(DECIMAL(15,2))
    utr_no = Column(String(100))
    remarks = Column(Text)
    is_deleted = Column(Boolean, default=False, nullable=False)
    payee_name = Column(String(255))
    valid_to = Column(Date)
    company_bank_id = Column(UUID(as_uuid=True), ForeignKey("master_company_bank.id"))
    
    file = relationship("FileRecord")
    payee_dealer = relationship("MasterDealer", foreign_keys=[payee_dealer_id])
    payee_broker = relationship("MasterBroker", foreign_keys=[payee_broker_id])
    company_bank = relationship("MasterCompanyBank", foreign_keys=[company_bank_id])