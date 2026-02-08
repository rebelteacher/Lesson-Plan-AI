"""Quiz and assessment models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid


class Question(BaseModel):
    """Individual quiz question"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    options: List[str]  # 4 options
    correct_answer: int  # index of correct answer (0-3)
    skill: str  # The learning objective/skill being tested


class QuizTest(BaseModel):
    """Quiz/Test model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    teacher_id: str
    lesson_plan_id: str
    questions: List[Question]
    status: str = "draft"  # "draft" or "published"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Assignment(BaseModel):
    """Quiz assignment to classes"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    class_ids: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentAnswer(BaseModel):
    """Student's answer to a question"""
    question_id: str
    selected_answer: int


class Submission(BaseModel):
    """Quiz submission by student"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_id: str
    class_id: str
    answers: List[StudentAnswer]
    score: float
    skills_breakdown: Dict[str, Dict[str, Any]]  # {skill: {correct: int, total: int, percentage: float}}
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
