from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
import io
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_key_change_in_production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Models
class InvitationCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    created_by: str  # admin user id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_by: Optional[str] = None  # user id who used it
    used_at: Optional[datetime] = None
    is_active: bool = True

class CreateInvitationCode(BaseModel):
    count: int = 1  # number of codes to generate

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    state: Optional[str] = None
    invitation_code: str  # Required invitation code

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    state: Optional[str] = None
    role: str = "teacher"  # teacher or admin
    is_active: bool = True
    join_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class LessonPlanCreate(BaseModel):
    textbook: str
    start_date: str
    end_date: str
    lesson_range: str
    next_major_assessment: str
    state_standards: Optional[str] = None

class DayPlan(BaseModel):
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

class LessonPlan(BaseModel):
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

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_lesson_plans: int

class UserDetail(BaseModel):
    id: str
    email: str
    full_name: str
    state: Optional[str]
    is_active: bool
    join_code: Optional[str]
    created_at: str
    last_login: Optional[str]
    lesson_plan_count: int


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def generate_join_code() -> str:
    return str(uuid.uuid4())[:8].upper()

def get_weekdays_between(start_date_str: str, end_date_str: str):
    from datetime import datetime as dt
    start = dt.strptime(start_date_str, "%Y-%m-%d")
    end = dt.strptime(end_date_str, "%Y-%m-%d")
    days = []
    current = start
    while current <= end:
        # 0 = Monday, 6 = Sunday
        if current.weekday() < 5:  # Monday to Friday
            days.append({
                'date': current.strftime("%Y-%m-%d"),
                'day_name': current.strftime("%A")
            })
        current += timedelta(days=1)
    return days

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Validate invitation code
    invitation = await db.invitation_codes.find_one({
        "code": user_data.invitation_code,
        "is_active": True
    })
    
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or inactive invitation code")
    
    if invitation.get('used_by'):
        raise HTTPException(status_code=400, detail="This invitation code has already been used")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        state=user_data.state,
        join_code=None  # No longer needed
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['invitation_code'] = user_data.invitation_code
    
    await db.users.insert_one(user_dict)
    
    # Mark invitation code as used
    await db.invitation_codes.update_one(
        {"code": user_data.invitation_code},
        {
            "$set": {
                "used_by": user.id,
                "used_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create token
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "state": user.state
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create token
    token = create_access_token({"sub": user['id'], "email": user['email'], "role": user.get('role', 'teacher')})
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user.get('role', 'teacher'),
            "join_code": user.get('join_code'),
            "state": user.get('state')
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user['full_name'],
        "role": current_user.get('role', 'teacher'),
        "join_code": current_user.get('join_code'),
        "state": current_user.get('state'),
        "is_active": current_user.get('is_active', True)
    }


# Lesson plan routes
@api_router.post("/lesson-plans")
async def create_lesson_plan(plan_data: LessonPlanCreate, current_user: dict = Depends(get_current_user)):
    try:
        # Get weekdays between start and end date
        weekdays = get_weekdays_between(plan_data.start_date, plan_data.end_date)
        
        if not weekdays:
            raise HTTPException(status_code=400, detail="No weekdays found in the date range")
        
        # Initialize Claude chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        daily_plans = []
        
        # Generate plan for each day
        for idx, day_info in enumerate(weekdays):
            chat = LlmChat(
                api_key=api_key,
                session_id=f"lesson_plan_{current_user['id']}_{day_info['date']}",
                system_message="You are an expert education consultant helping teachers create detailed daily lesson plans."
            )
            chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
            
            state_standards_text = f"\nState Standards to Align With: {plan_data.state_standards}" if plan_data.state_standards else ""
            
            prompt = f"""Create a detailed lesson plan for {day_info['day_name']}, {day_info['date']} (Day {idx+1} of {len(weekdays)}) based on:

Textbook: {plan_data.textbook}
Lesson Range: {plan_data.lesson_range}
Overall Date Range: {plan_data.start_date} to {plan_data.end_date}
Next Major Assessment: {plan_data.next_major_assessment}{state_standards_text}

Provide specific, actionable content for THIS DAY ONLY for each section:

1. Learner Outcomes/Objectives
2. Standards (include the relevant state standards provided above, formatted clearly)
3. Materials Needed
4. Anticipatory Set
5. Teaching the Lesson
6. Modeling
7. Instructional Strategies
8. Check for Understanding
9. Guided Practice/Monitoring
10. Independent Practice
11. Closure
12. Summative Assessment
13. Formative Assessment
14. Extended Activities
15. Review and Reteach Activities
16. Early Finishers Activities

Make each section detailed and specific to day {idx+1}."""
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            response_text = response if isinstance(response, str) else str(response)
            
            # Parse AI response into sections
            sections = {
                'learner_outcomes': '',
                'standards': '',
                'materials_needed': '',
                'anticipatory_set': '',
                'teaching_lesson': '',
                'modeling': '',
                'instructional_strategies': '',
                'check_understanding': '',
                'guided_practice': '',
                'independent_practice': '',
                'closure': '',
                'summative_assessment': '',
                'formative_assessment': '',
                'extended_activities': '',
                'review_reteach': '',
                'early_finishers': ''
            }
            
            # Simple section parsing
            lines = response_text.split('\n')
            current_section = None
            current_text = []
            
            section_mapping = {
                'learner outcomes': 'learner_outcomes',
                'objectives': 'learner_outcomes',
                'standards': 'standards',
                'materials needed': 'materials_needed',
                'anticipatory set': 'anticipatory_set',
                'teaching the lesson': 'teaching_lesson',
                'modeling': 'modeling',
                'instructional strategies': 'instructional_strategies',
                'check for understanding': 'check_understanding',
                'guided practice': 'guided_practice',
                'monitoring': 'guided_practice',
                'independent practice': 'independent_practice',
                'closure': 'closure',
                'summative assessment': 'summative_assessment',
                'formative assessment': 'formative_assessment',
                'extended activities': 'extended_activities',
                'review and reteach': 'review_reteach',
                'reteach activities': 'review_reteach',
                'early finishers': 'early_finishers'
            }
            
            for line in lines:
                line_lower = line.lower().strip()
                found_section = False
                
                # Check if this line is a section header
                for keyword, section_key in section_mapping.items():
                    if keyword in line_lower and (line.startswith('#') or line.startswith('**') or line.endswith(':') or len(line) < 50):
                        if current_section and current_text:
                            sections[current_section] = '\n'.join(current_text).strip()
                        current_section = section_key
                        current_text = []
                        found_section = True
                        break
                
                if not found_section and current_section:
                    current_text.append(line)
            
            # Save any remaining section
            if current_section and current_text:
                sections[current_section] = '\n'.join(current_text).strip()
            
            # If parsing failed, store everything in teaching_lesson
            if not any(sections.values()):
                sections['teaching_lesson'] = response_text
            
            day_plan = DayPlan(
                day_name=day_info['day_name'],
                day_date=day_info['date'],
                learner_outcomes=sections['learner_outcomes'] or 'Content will be generated',
                standards=sections['standards'] or 'Content will be generated',
                materials_needed=sections['materials_needed'] or 'Content will be generated',
                anticipatory_set=sections['anticipatory_set'] or 'Content will be generated',
                teaching_lesson=sections['teaching_lesson'] or response_text,
                modeling=sections['modeling'] or 'Content will be generated',
                instructional_strategies=sections['instructional_strategies'] or 'Content will be generated',
                check_understanding=sections['check_understanding'] or 'Content will be generated',
                guided_practice=sections['guided_practice'] or 'Content will be generated',
                independent_practice=sections['independent_practice'] or 'Content will be generated',
                closure=sections['closure'] or 'Content will be generated',
                summative_assessment=sections['summative_assessment'] or 'Not applicable for today (next major assessment: ' + plan_data.next_major_assessment + ')',
                formative_assessment=sections['formative_assessment'] or 'Content will be generated',
                extended_activities=sections['extended_activities'] or 'Content will be generated',
                review_reteach=sections['review_reteach'] or 'Content will be generated',
                early_finishers=sections['early_finishers'] or 'Content will be generated'
            )
            daily_plans.append(day_plan)
        
        # Create lesson plan
        lesson_plan = LessonPlan(
            user_id=current_user['id'],
            textbook=plan_data.textbook,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            lesson_range=plan_data.lesson_range,
            next_major_assessment=plan_data.next_major_assessment,
            daily_plans=daily_plans
        )
        
        plan_dict = lesson_plan.model_dump()
        plan_dict['created_at'] = plan_dict['created_at'].isoformat()
        
        await db.lesson_plans.insert_one(plan_dict)
        
        return lesson_plan
    except Exception as e:
        logging.error(f"Error creating lesson plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating lesson plan: {str(e)}")

@api_router.get("/lesson-plans", response_model=List[LessonPlan])
async def get_lesson_plans(current_user: dict = Depends(get_current_user)):
    plans = await db.lesson_plans.find({"user_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for plan in plans:
        if isinstance(plan.get('created_at'), str):
            plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    return plans

@api_router.get("/lesson-plans/{plan_id}")
async def get_lesson_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    plan = await db.lesson_plans.find_one({"id": plan_id, "user_id": current_user['id']}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    if isinstance(plan.get('created_at'), str):
        plan['created_at'] = datetime.fromisoformat(plan['created_at'])
    
    return plan

@api_router.delete("/lesson-plans/{plan_id}")
async def delete_lesson_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.lesson_plans.delete_one({"id": plan_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    return {"message": "Lesson plan deleted successfully"}

@api_router.get("/lesson-plans/{plan_id}/export")
async def export_lesson_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    plan = await db.lesson_plans.find_one({"id": plan_id, "user_id": current_user['id']}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Create Word document
    doc = Document()
    
    # Title
    title = doc.add_heading('Lesson Plan', 0)
    title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    
    # Basic info
    doc.add_paragraph(f"Textbook: {plan['textbook']}")
    doc.add_paragraph(f"Lesson Range: {plan['lesson_range']}")
    doc.add_paragraph(f"Date Range: {plan['start_date']} to {plan['end_date']}")
    doc.add_paragraph(f"Next Major Assessment: {plan['next_major_assessment']}")
    doc.add_paragraph('')
    
    # Daily plans
    for day_plan in plan.get('daily_plans', []):
        doc.add_heading(f"{day_plan['day_name']} - {day_plan['day_date']}", level=1)
        
        sections = [
            ('Learner Outcomes/Objectives', day_plan.get('learner_outcomes', '')),
            ('Standards', day_plan.get('standards', '')),
            ('Materials Needed', day_plan.get('materials_needed', '')),
            ('Anticipatory Set', day_plan.get('anticipatory_set', '')),
            ('Teaching the Lesson', day_plan.get('teaching_lesson', '')),
            ('Modeling', day_plan.get('modeling', '')),
            ('Instructional Strategies', day_plan.get('instructional_strategies', '')),
            ('Check for Understanding', day_plan.get('check_understanding', '')),
            ('Guided Practice/Monitoring', day_plan.get('guided_practice', '')),
            ('Independent Practice', day_plan.get('independent_practice', '')),
            ('Closure', day_plan.get('closure', '')),
            ('Summative Assessment', day_plan.get('summative_assessment', '')),
            ('Formative Assessment', day_plan.get('formative_assessment', '')),
            ('**Extended Activities**', day_plan.get('extended_activities', '')),
            ('**Review and Reteach Activities**', day_plan.get('review_reteach', '')),
            ('**Early Finishers Activities**', day_plan.get('early_finishers', ''))
        ]
        
        for section_title, section_content in sections:
            heading = doc.add_heading(section_title, level=2)
            if '**' in section_title:
                heading.runs[0].bold = True
            doc.add_paragraph(section_content or 'N/A')
        
        doc.add_page_break()
    
    # Save to memory
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=lesson_plan_{plan_id}.docx"}
    )


# Admin routes - Invitation Codes
@api_router.post("/admin/invitation-codes")
async def create_invitation_codes(data: CreateInvitationCode, admin_user: dict = Depends(get_admin_user)):
    codes = []
    for _ in range(data.count):
        code = str(uuid.uuid4())[:8].upper()
        invitation = InvitationCode(
            code=code,
            created_by=admin_user['id']
        )
        inv_dict = invitation.model_dump()
        inv_dict['created_at'] = inv_dict['created_at'].isoformat()
        await db.invitation_codes.insert_one(inv_dict)
        codes.append(code)
    
    return {"codes": codes, "count": len(codes)}

@api_router.get("/admin/invitation-codes")
async def get_invitation_codes(admin_user: dict = Depends(get_admin_user)):
    codes = await db.invitation_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get user info for used codes
    for code in codes:
        if code.get('used_by'):
            user = await db.users.find_one({"id": code['used_by']}, {"_id": 0, "email": 1, "full_name": 1})
            if user:
                code['used_by_email'] = user.get('email')
                code['used_by_name'] = user.get('full_name')
    
    return codes

@api_router.delete("/admin/invitation-codes/{code}")
async def delete_invitation_code(code: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.invitation_codes.delete_one({"code": code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation code not found")
    return {"message": "Invitation code deleted successfully"}

@api_router.post("/admin/invitation-codes/{code}/deactivate")
async def deactivate_invitation_code(code: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.invitation_codes.update_one({"code": code}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invitation code not found")
    return {"message": "Invitation code deactivated successfully"}

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

# Quiz/Test Models
class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    student_id: Optional[str] = None  # Optional student ID/number
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Class(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    name: str
    description: Optional[str] = None
    class_code: str = Field(default_factory=lambda: ''.join(__import__('random').choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6)))
    student_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    options: List[str]  # 4 options
    correct_answer: int  # index of correct answer (0-3)
    skill: str  # The learning objective/skill being tested

class QuizTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    teacher_id: str
    lesson_plan_id: str
    questions: List[Question]
    status: str = "draft"  # "draft" or "published"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    class_ids: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentAnswer(BaseModel):
    question_id: str
    selected_answer: int

class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_id: str
    class_id: str
    answers: List[StudentAnswer]
    score: float
    skills_breakdown: Dict[str, Dict[str, Any]]  # {skill: {correct: int, total: int, percentage: float}}
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/auth/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    # Verify current password
    if not verify_password(data.current_password, current_user['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    new_hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "Password changed successfully"}

# Admin routes
@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": "teacher"})
    active_users = await db.users.count_documents({"role": "teacher", "is_active": True})
    inactive_users = total_users - active_users
    total_lesson_plans = await db.lesson_plans.count_documents({})
    
    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        total_lesson_plans=total_lesson_plans
    )

@api_router.get("/admin/users")
async def get_all_users(admin_user: dict = Depends(get_admin_user)):
    users = await db.users.find({"role": "teacher"}, {"_id": 0, "password": 0}).to_list(1000)
    
    user_details = []
    for user in users:
        plan_count = await db.lesson_plans.count_documents({"user_id": user['id']})
        user_details.append(UserDetail(
            id=user['id'],
            email=user['email'],
            full_name=user['full_name'],
            state=user.get('state'),
            is_active=user.get('is_active', True),
            join_code=user.get('join_code'),
            created_at=user.get('created_at', ''),
            last_login=user.get('last_login'),
            lesson_plan_count=plan_count
        ))
    
    return user_details

@api_router.post("/admin/users/{user_id}/activate")
async def activate_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated successfully"}

@api_router.post("/admin/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
