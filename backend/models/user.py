"""User models for authentication and user management"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    state: Optional[str] = None
    school: Optional[str] = None
    invitation_code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    state: Optional[str] = None
    school: Optional[str] = None
    role: str = "teacher"  # teacher or admin
    is_active: bool = True
    join_code: Optional[str] = None
    supervised_teacher_ids: List[str] = []  # For admins: teachers they supervise
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None


class UserDetail(BaseModel):
    """User detail response model for admin views"""
    id: str
    email: str
    full_name: str
    state: Optional[str]
    is_active: bool
    join_code: Optional[str]
    created_at: str
    last_login: Optional[str]
    lesson_plan_count: int


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
