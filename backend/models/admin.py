"""Admin-specific models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class InvitationCode(BaseModel):
    """Invitation code for teacher registration"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    created_by: str  # admin user id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_by: Optional[str] = None  # user id who used it
    used_at: Optional[datetime] = None
    is_active: bool = True


class CreateInvitationCode(BaseModel):
    """Request model for creating invitation codes"""
    count: int = 1  # number of codes to generate


class AdminStats(BaseModel):
    """Admin dashboard statistics"""
    total_users: int
    active_users: int
    inactive_users: int
    total_lesson_plans: int
