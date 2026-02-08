"""Authentication routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import aiohttp

from models.user import UserRegister, UserLogin, User, ChangePassword
from models.student import Student, StudentSession
from utils.database import db
from utils.auth import (
    hash_password, verify_password, create_access_token, 
    get_current_user, get_current_student
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(user_data: UserRegister):
    """Register a new teacher account"""
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
        school=user_data.school,
        join_code=None
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


@router.post("/login")
async def login(credentials: UserLogin):
    """Login with email and password"""
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


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "full_name": current_user['full_name'],
        "role": current_user.get('role', 'teacher'),
        "join_code": current_user.get('join_code'),
        "state": current_user.get('state'),
        "is_active": current_user.get('is_active', True)
    }


@router.post("/change-password")
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    """Change user password"""
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


# Student Auth Routes
@router.post("/student/session")
async def process_student_session(request: Request):
    """Process student Google OAuth session"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent auth service
    async with aiohttp.ClientSession() as session:
        async with session.get(
            'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
            headers={'X-Session-ID': session_id}
        ) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            user_data = await resp.json()
    
    # Create or get student
    existing_student = await db.students.find_one({"email": user_data['email']}, {"_id": 0})
    if existing_student:
        student = existing_student
    else:
        student = Student(
            name=user_data['name'],
            email=user_data['email'],
            picture=user_data.get('picture')
        )
        student_dict = student.model_dump()
        student_dict['created_at'] = student_dict['created_at'].isoformat()
        await db.students.insert_one(student_dict)
        student = student_dict
    
    # Create session
    session_token = user_data['session_token']
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    student_session = StudentSession(
        student_id=student['id'],
        session_token=session_token,
        expires_at=expires_at
    )
    session_dict = student_session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    await db.student_sessions.insert_one(session_dict)
    
    return {
        "student": student,
        "session_token": session_token
    }


@router.get("/student/me")
async def get_student_me(request: Request):
    """Get current student info"""
    student = await get_current_student(request)
    return student


@router.post("/student/logout")
async def student_logout(request: Request):
    """Logout student"""
    session_token = request.cookies.get('student_session_token')
    if session_token:
        await db.student_sessions.delete_one({"session_token": session_token})
    return {"message": "Logged out"}
