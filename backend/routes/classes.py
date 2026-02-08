"""Class management routes"""
from fastapi import APIRouter, HTTPException, Depends, Request

from models.student import Class
from utils.database import db
from utils.auth import get_current_user, get_current_student

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post("")
async def create_class(class_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new class"""
    new_class = Class(
        teacher_id=current_user['id'],
        name=class_data['name'],
        description=class_data.get('description')
    )
    class_dict = new_class.model_dump()
    class_dict['created_at'] = class_dict['created_at'].isoformat()
    await db.classes.insert_one(class_dict)
    return new_class


@router.get("")
async def get_classes(current_user: dict = Depends(get_current_user)):
    """Get all classes for current teacher"""
    classes = await db.classes.find({"teacher_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Get student counts
    for cls in classes:
        students = await db.students.find({"id": {"$in": cls['student_ids']}}, {"_id": 0, "name": 1, "email": 1}).to_list(1000)
        cls['students'] = students
        cls['student_count'] = len(students)
    
    return classes


@router.delete("/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a class"""
    result = await db.classes.delete_one({"id": class_id, "teacher_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"message": "Class deleted successfully"}


@router.post("/join")
async def join_class(data: dict, request: Request):
    """Student joins a class with class code"""
    # Get authenticated student
    student = await get_current_student(request)
    
    class_code = data.get('class_code')
    student_id_number = data.get('student_id')
    
    class_data = await db.classes.find_one({"class_code": class_code}, {"_id": 0})
    if not class_data:
        raise HTTPException(status_code=404, detail="Class code not found")
    
    # Update student with student_id if provided
    if student_id_number:
        await db.students.update_one(
            {"id": student['id']},
            {"$set": {"student_id": student_id_number}}
        )
    
    # Add student to class if not already there
    if student['id'] not in class_data['student_ids']:
        await db.classes.update_one(
            {"class_code": class_code},
            {"$push": {"student_ids": student['id']}}
        )
    
    return {"message": "Joined class successfully", "class_name": class_data['name'], "student_id": student['id']}
