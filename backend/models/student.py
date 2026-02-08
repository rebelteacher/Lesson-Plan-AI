"""Student and class models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import random


class Student(BaseModel):
    """Student model (uses Google OAuth)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    student_id: Optional[str] = None  # Optional student ID/number
    email: str  # Required for Google OAuth
    picture: Optional[str] = None  # Google profile picture
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentSession(BaseModel):
    """Student session for authentication"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def generate_class_code():
    """Generate a random 6-character class code"""
    return ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6))


class Class(BaseModel):
    """Class model for teacher's classes"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    name: str
    description: Optional[str] = None
    class_code: str = Field(default_factory=generate_class_code)
    student_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
