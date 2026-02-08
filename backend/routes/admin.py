"""Admin routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from models.admin import InvitationCode, CreateInvitationCode, AdminStats
from models.user import UserDetail
from utils.database import db
from utils.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
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


@router.get("/users")
async def get_all_users(admin_user: dict = Depends(get_admin_user)):
    """Get all teacher users"""
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


@router.post("/users/{user_id}/activate")
async def activate_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Activate a user"""
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated successfully"}


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Deactivate a user"""
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}


# Invitation Code Management
@router.post("/invitation-codes")
async def create_invitation_codes(data: CreateInvitationCode, admin_user: dict = Depends(get_admin_user)):
    """Create new invitation codes"""
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


@router.get("/invitation-codes")
async def get_invitation_codes(admin_user: dict = Depends(get_admin_user)):
    """Get all invitation codes"""
    codes = await db.invitation_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for code in codes:
        if code.get('used_by'):
            user = await db.users.find_one({"id": code['used_by']}, {"_id": 0, "email": 1, "full_name": 1})
            if user:
                code['used_by_email'] = user.get('email')
                code['used_by_name'] = user.get('full_name')
    
    return codes


@router.delete("/invitation-codes/{code}")
async def delete_invitation_code(code: str, admin_user: dict = Depends(get_admin_user)):
    """Delete an invitation code"""
    result = await db.invitation_codes.delete_one({"code": code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation code not found")
    return {"message": "Invitation code deleted successfully"}


@router.post("/invitation-codes/{code}/deactivate")
async def deactivate_invitation_code(code: str, admin_user: dict = Depends(get_admin_user)):
    """Deactivate an invitation code"""
    result = await db.invitation_codes.update_one({"code": code}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invitation code not found")
    return {"message": "Invitation code deactivated successfully"}


# Teacher Supervision
@router.get("/teachers")
async def get_all_teachers(admin_user: dict = Depends(get_admin_user)):
    """Get list of all teachers for supervision assignment"""
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0}).to_list(1000)
    
    admin = await db.users.find_one({"id": admin_user['id']}, {"_id": 0})
    supervised_ids = admin.get('supervised_teacher_ids', [])
    
    for teacher in teachers:
        teacher['is_supervised'] = teacher['id'] in supervised_ids
    
    return {
        'teachers': teachers,
        'supervised_ids': supervised_ids
    }


@router.post("/update-supervision")
async def update_teacher_supervision(data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update which teachers this admin supervises"""
    teacher_ids = data.get('teacher_ids', [])
    
    await db.users.update_one(
        {"id": admin_user['id']},
        {"$set": {"supervised_teacher_ids": teacher_ids}}
    )
    
    return {"message": "Supervision updated successfully"}


# Lesson Plan Review
@router.get("/lesson-plans/pending")
async def get_pending_submissions(admin_user: dict = Depends(get_admin_user)):
    """Admin views all pending lesson plan submissions"""
    admin = await db.users.find_one({"id": admin_user['id']}, {"_id": 0})
    supervised_ids = admin.get('supervised_teacher_ids', [])
    
    query = {"submission_status": "pending"}
    if supervised_ids:
        query["user_id"] = {"$in": supervised_ids}
    
    pending_plans = await db.lesson_plans.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    
    for plan in pending_plans:
        teacher = await db.users.find_one({"id": plan['user_id']}, {"_id": 0, "full_name": 1, "email": 1})
        if teacher:
            plan['teacher_name'] = teacher['full_name']
            plan['teacher_email'] = teacher['email']
    
    return pending_plans


@router.get("/lesson-plans/all")
async def get_all_lesson_plans(admin_user: dict = Depends(get_admin_user)):
    """Admin views all lesson plans regardless of status"""
    admin = await db.users.find_one({"id": admin_user['id']}, {"_id": 0})
    supervised_ids = admin.get('supervised_teacher_ids', [])
    
    query = {}
    if supervised_ids:
        query["user_id"] = {"$in": supervised_ids}
    
    all_plans = await db.lesson_plans.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for plan in all_plans:
        teacher = await db.users.find_one({"id": plan['user_id']}, {"_id": 0, "full_name": 1, "email": 1})
        if teacher:
            plan['teacher_name'] = teacher['full_name']
            plan['teacher_email'] = teacher['email']
    
    return all_plans


@router.post("/lesson-plans/{plan_id}/review")
async def review_lesson_plan(
    plan_id: str, 
    review_data: dict,
    admin_user: dict = Depends(get_admin_user)
):
    """Admin approves or rejects a lesson plan with feedback"""
    plan = await db.lesson_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    status = review_data.get('status')
    feedback = review_data.get('feedback', '')
    
    if status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.lesson_plans.update_one(
        {"id": plan_id},
        {"$set": {
            "submission_status": status,
            "admin_feedback": feedback,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin_user['id']
        }}
    )
    
    return {"message": f"Lesson plan {status}"}


# Admin Reports
@router.get("/reports/lesson-plans")
async def get_lesson_plan_reports(admin_user: dict = Depends(get_admin_user)):
    """Get comprehensive lesson plan status report"""
    admin = await db.users.find_one({"id": admin_user['id']}, {"_id": 0})
    supervised_ids = admin.get('supervised_teacher_ids', [])
    
    if supervised_ids:
        all_plans = await db.lesson_plans.find({"user_id": {"$in": supervised_ids}}, {"_id": 0}).to_list(10000)
    else:
        all_plans = await db.lesson_plans.find({}, {"_id": 0}).to_list(10000)
    
    status_counts = {
        'draft': 0,
        'pending': 0,
        'approved': 0,
        'rejected': 0
    }
    
    for plan in all_plans:
        status = plan.get('submission_status', 'draft')
        if status in status_counts:
            status_counts[status] += 1
    
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0}).to_list(1000)
    teacher_stats = []
    
    for teacher in teachers:
        teacher_plans = [p for p in all_plans if p['user_id'] == teacher['id']]
        total = len(teacher_plans)
        
        if total == 0:
            continue
        
        draft = len([p for p in teacher_plans if p.get('submission_status', 'draft') == 'draft'])
        pending = len([p for p in teacher_plans if p.get('submission_status') == 'pending'])
        approved = len([p for p in teacher_plans if p.get('submission_status') == 'approved'])
        rejected = len([p for p in teacher_plans if p.get('submission_status') == 'rejected'])
        
        submission_rate = ((approved + pending) / total * 100) if total > 0 else 0
        
        teacher_stats.append({
            'teacher_id': teacher['id'],
            'name': teacher['full_name'],
            'school': teacher.get('school', 'N/A'),
            'total': total,
            'draft': draft,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'submission_rate': round(submission_rate, 1)
        })
    
    teacher_stats.sort(key=lambda x: x['submission_rate'])
    
    return {
        **status_counts,
        'teachers': teacher_stats
    }


@router.get("/reports/test-results")
async def get_test_results_reports(admin_user: dict = Depends(get_admin_user)):
    """Get comprehensive test results with school/class/student drill-down"""
    admin = await db.users.find_one({"id": admin_user['id']}, {"_id": 0})
    supervised_ids = admin.get('supervised_teacher_ids', [])
    
    if supervised_ids:
        classes = await db.classes.find({"teacher_id": {"$in": supervised_ids}}, {"_id": 0}).to_list(1000)
    else:
        classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0}).to_list(1000)
    teacher_map = {t['id']: t for t in teachers}
    
    submissions = await db.submissions.find({}, {"_id": 0}).to_list(10000)
    
    students = await db.students.find({}, {"_id": 0}).to_list(10000)
    student_map = {s['id']: s for s in students}
    
    schools_data = {}
    
    for cls in classes:
        teacher = teacher_map.get(cls['teacher_id'], {})
        school_name = teacher.get('school', 'Unknown School')
        
        if school_name not in schools_data:
            schools_data[school_name] = {
                'name': school_name,
                'classes': [],
                'total_classes': 0,
                'total_students': 0,
                'total_quizzes': 0,
                'total_score': 0,
                'submission_count': 0
            }
        
        class_submissions = [s for s in submissions if s.get('class_id') == cls['id']]
        
        if not class_submissions:
            continue
        
        class_scores = [s['score'] for s in class_submissions]
        class_average = sum(class_scores) / len(class_scores) if class_scores else 0
        
        unique_quizzes = len(set([s['test_id'] for s in class_submissions]))
        
        student_stats = []
        for student_id in cls.get('student_ids', []):
            student = student_map.get(student_id)
            if not student:
                continue
            
            student_submissions = [s for s in class_submissions if s['student_id'] == student_id]
            if not student_submissions:
                continue
            
            scores = [s['score'] for s in student_submissions]
            
            standards_data = {}
            for sub in student_submissions:
                for standard, breakdown in sub.get('skills_breakdown', {}).items():
                    if standard not in standards_data:
                        standards_data[standard] = {'correct': 0, 'total': 0}
                    standards_data[standard]['correct'] += breakdown['correct']
                    standards_data[standard]['total'] += breakdown['total']
            
            standards_mastered = sum(1 for std in standards_data.values() if std['total'] > 0 and (std['correct'] / std['total'] * 100) >= 80)
            
            student_stats.append({
                'student_id': student_id,
                'name': student['name'],
                'quizzes_taken': len(student_submissions),
                'average': sum(scores) / len(scores) if scores else 0,
                'highest': max(scores) if scores else 0,
                'lowest': min(scores) if scores else 0,
                'standards_mastered': standards_mastered
            })
        
        class_info = {
            'class_id': cls['id'],
            'class_name': cls['name'],
            'teacher_name': teacher.get('full_name', 'Unknown'),
            'student_count': len(cls.get('student_ids', [])),
            'quiz_count': unique_quizzes,
            'class_average': class_average,
            'students': student_stats
        }
        
        schools_data[school_name]['classes'].append(class_info)
        schools_data[school_name]['total_classes'] += 1
        schools_data[school_name]['total_students'] += len(cls.get('student_ids', []))
        schools_data[school_name]['total_quizzes'] += unique_quizzes
        schools_data[school_name]['total_score'] += sum(class_scores)
        schools_data[school_name]['submission_count'] += len(class_submissions)
    
    schools_list = []
    for school_name, school_data in schools_data.items():
        if school_data['submission_count'] > 0:
            school_data['average_score'] = school_data['total_score'] / school_data['submission_count']
        else:
            school_data['average_score'] = 0
        del school_data['total_score']
        del school_data['submission_count']
        schools_list.append(school_data)
    
    schools_list.sort(key=lambda x: x['average_score'], reverse=True)
    
    return {
        'schools': schools_list
    }
