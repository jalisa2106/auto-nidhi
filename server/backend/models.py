from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
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