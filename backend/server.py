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
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    state: Optional[str] = None

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
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    join_code = generate_join_code()
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        state=user_data.state,
        join_code=join_code
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "join_code": user.join_code,
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
        # Initialize Claude chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"lesson_plan_{current_user['id']}_{datetime.now(timezone.utc).isoformat()}",
            system_message="You are an expert education consultant helping teachers create comprehensive lesson plans."
        )
        chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
        
        # Create prompt
        prompt = f"""Create a detailed lesson plan based on the following information:

Textbook: {plan_data.textbook}
Lesson Range: {plan_data.lesson_range}
Start Date: {plan_data.start_date}
End Date: {plan_data.end_date}
Next Major Assessment: {plan_data.next_major_assessment}

Please provide detailed responses for each of the following sections:

1. Learner Outcomes/Objectives (to be written on the board for students and visitors)
2. Standards (e.g., RI 8.2)
3. Materials Needed
4. Anticipatory Set (activities that help focus students on the lesson - the "hook")
5. Teaching the Lesson
6. Modeling (how will you demonstrate the skill or competency?)
7. Instructional Strategies (how will you deliver the lesson?)
8. Check for Understanding (how will you ensure the skill is understood?)
9. Guided Practice/Monitoring (activity supervised by instructor)
10. Independent Practice (question/problem for students to work on)
11. Closure (statements to help students make sense of what was taught)
12. Formative Assessment (should be done daily)
13. Extended Activities (additional enrichment)
14. Review and Reteach Activities (for students who need reinforcement)
15. Early Finishers Activities (for students who complete work early)

Format each section clearly with the section name followed by detailed, practical suggestions."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response (simplified - in production, use more sophisticated parsing)
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
            'formative_assessment': '',
            'extended_activities': '',
            'review_reteach': '',
            'early_finishers': ''
        }
        
        # Simple parsing - split by numbered sections
        response_text = response if isinstance(response, str) else str(response)
        lines = response_text.split('\n')
        current_section = None
        current_text = []
        
        section_keywords = {
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
            'independent practice': 'independent_practice',
            'closure': 'closure',
            'formative assessment': 'formative_assessment',
            'extended activities': 'extended_activities',
            'review and reteach': 'review_reteach',
            'early finishers': 'early_finishers'
        }
        
        for line in lines:
            line_lower = line.lower().strip()
            found_section = False
            
            for keyword, section_key in section_keywords.items():
                if keyword in line_lower and (line.startswith(str(list(section_keywords.keys()).index(keyword) + 1)) or line.startswith('#') or line.startswith('**')):
                    if current_section and current_text:
                        sections[current_section] = '\n'.join(current_text).strip()
                    current_section = section_key
                    current_text = []
                    found_section = True
                    break
            
            if not found_section and current_section:
                current_text.append(line)
        
        if current_section and current_text:
            sections[current_section] = '\n'.join(current_text).strip()
        
        # If parsing didn't work well, use the whole response for key sections
        if not any(sections.values()):
            sections['teaching_lesson'] = response_text
        
        # Create lesson plan
        lesson_plan = LessonPlan(
            user_id=current_user['id'],
            textbook=plan_data.textbook,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            lesson_range=plan_data.lesson_range,
            next_major_assessment=plan_data.next_major_assessment,
            learner_outcomes=sections['learner_outcomes'],
            standards=sections['standards'],
            materials_needed=sections['materials_needed'],
            anticipatory_set=sections['anticipatory_set'],
            teaching_lesson=sections['teaching_lesson'],
            modeling=sections['modeling'],
            instructional_strategies=sections['instructional_strategies'],
            check_understanding=sections['check_understanding'],
            guided_practice=sections['guided_practice'],
            independent_practice=sections['independent_practice'],
            closure=sections['closure'],
            formative_assessment=sections['formative_assessment'],
            extended_activities=sections['extended_activities'],
            review_reteach=sections['review_reteach'],
            early_finishers=sections['early_finishers']
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
    
    # Sections
    sections = [
        ('Learner Outcomes/Objectives', plan.get('learner_outcomes', '')),
        ('Standards', plan.get('standards', '')),
        ('Materials Needed', plan.get('materials_needed', '')),
        ('Anticipatory Set', plan.get('anticipatory_set', '')),
        ('Teaching the Lesson', plan.get('teaching_lesson', '')),
        ('Modeling', plan.get('modeling', '')),
        ('Instructional Strategies', plan.get('instructional_strategies', '')),
        ('Check for Understanding', plan.get('check_understanding', '')),
        ('Guided Practice/Monitoring', plan.get('guided_practice', '')),
        ('Independent Practice', plan.get('independent_practice', '')),
        ('Closure', plan.get('closure', '')),
        ('Formative Assessment', plan.get('formative_assessment', '')),
        ('**Extended Activities**', plan.get('extended_activities', '')),
        ('**Review and Reteach Activities**', plan.get('review_reteach', '')),
        ('**Early Finishers Activities**', plan.get('early_finishers', ''))
    ]
    
    for section_title, section_content in sections:
        heading = doc.add_heading(section_title, level=2)
        if '**' in section_title:
            heading.runs[0].bold = True
        doc.add_paragraph(section_content or 'N/A')
        doc.add_paragraph('')
    
    # Save to memory
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=lesson_plan_{plan_id}.docx"}
    )


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