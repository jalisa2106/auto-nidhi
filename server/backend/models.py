from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Date, text
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

# Update FileRecord class
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