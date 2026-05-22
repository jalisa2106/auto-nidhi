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
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


class FileRecord(Base):
    __tablename__ = "file_record"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("system_user.id"), nullable=False)
    file_number = Column(String(50), unique=True)
    docket_date = Column(Date)
    service_type = Column(String(50))
    reference_dealer_id = Column(UUID(as_uuid=True), ForeignKey("master_dealer.id"))
    reference_broker_id = Column(UUID(as_uuid=True), ForeignKey("master_broker.id"))
    remarks = Column(String)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))

    customer = relationship("Customer")
    creator = relationship("SystemUser")