"""Lesson Plan models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class DayPlan(BaseModel):
    """Individual day's lesson plan"""
    day_name: str  # e.g., "Monday", "Tuesday"
    day_date: str  # e.g., "2025-01-15"
    learner_outcomes: str
    standards: str
    materials_needed: str
    anticipatory_set: str
    teaching_lesson: str
    modeling: str
    instructional_strategies: str
    check_understanding: str
    guided_practice: str
    independent_practice: str
    closure: str
    summative_assessment: str
    formative_assessment: str
    extended_activities: str
    review_reteach: str
    early_finishers: str


class LessonPlanCreate(BaseModel):
    """Request model for creating a lesson plan"""
    textbook: str
    start_date: str
    end_date: str
    lesson_range: str
    next_major_assessment: str
    state_standards: Optional[str] = None


class LessonPlan(BaseModel):
    """Full lesson plan model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    textbook: str
    start_date: str
    end_date: str
    lesson_range: str
    next_major_assessment: str
    daily_plans: List[DayPlan]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submission_status: str = "draft"  # draft, pending, approved, rejected
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    admin_feedback: Optional[str] = None
    reviewed_by: Optional[str] = None
