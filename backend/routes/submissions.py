"""Assignment and submission routes"""
from fastapi import APIRouter, HTTPException

from models.quiz import Assignment, StudentAnswer, Submission
from utils.database import db

router = APIRouter(tags=["Submissions"])


@router.post("/assignments")
async def create_assignment(data: dict):
    """Assign a quiz to classes"""
    assignment = Assignment(
        test_id=data['test_id'],
        class_ids=data['class_ids']
    )
    
    assign_dict = assignment.model_dump()
    assign_dict['created_at'] = assign_dict['created_at'].isoformat()
    await db.assignments.insert_one(assign_dict)
    
    # Update quiz status to published
    await db.quizzes.update_one(
        {"id": data['test_id']},
        {"$set": {"status": "published"}}
    )
    
    return assignment


@router.get("/assignments/student/{student_id}")
async def get_student_assignments(student_id: str):
    """Get all assignments for a student"""
    # Get classes the student is in
    classes = await db.classes.find({"student_ids": student_id}, {"_id": 0, "id": 1}).to_list(1000)
    class_ids = [c['id'] for c in classes]
    
    # Get assignments for these classes
    assignments = await db.assignments.find({"class_ids": {"$in": class_ids}}, {"_id": 0}).to_list(1000)
    
    # Get quiz details and check if completed
    result = []
    for assign in assignments:
        quiz = await db.quizzes.find_one({"id": assign['test_id']}, {"_id": 0})
        if quiz:
            submission = await db.submissions.find_one({"test_id": quiz['id'], "student_id": student_id}, {"_id": 0})
            result.append({
                **assign,
                'quiz': quiz,
                'completed': submission is not None,
                'score': submission['score'] if submission else None
            })
    
    return result


@router.post("/submissions")
async def submit_quiz(data: dict):
    """Submit quiz answers"""
    test_id = data['test_id']
    student_id = data['student_id']
    answers = [StudentAnswer(**a) for a in data['answers']]
    
    # Get quiz
    quiz = await db.quizzes.find_one({"id": test_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Find the class_id(s) this quiz is assigned to and that this student is in
    assignments = await db.assignments.find({"test_id": test_id}, {"_id": 0}).to_list(1000)
    student_classes = await db.classes.find({"student_ids": student_id}, {"_id": 0, "id": 1}).to_list(1000)
    student_class_ids = [c['id'] for c in student_classes]
    
    # Find matching class
    class_id = None
    for assignment in assignments:
        for assigned_class_id in assignment.get('class_ids', []):
            if assigned_class_id in student_class_ids:
                class_id = assigned_class_id
                break
        if class_id:
            break
    
    if not class_id:
        class_id = student_class_ids[0] if student_class_ids else 'unknown'
    
    # Calculate score and skills breakdown
    correct = 0
    total = len(quiz['questions'])
    skills_breakdown = {}
    
    for answer in answers:
        question = next((q for q in quiz['questions'] if q['id'] == answer.question_id), None)
        if question:
            skill = question['skill']
            if skill not in skills_breakdown:
                skills_breakdown[skill] = {'correct': 0, 'total': 0, 'percentage': 0}
            
            skills_breakdown[skill]['total'] += 1
            
            if question['correct_answer'] == answer.selected_answer:
                correct += 1
                skills_breakdown[skill]['correct'] += 1
    
    # Calculate percentages
    for skill in skills_breakdown:
        skills_breakdown[skill]['percentage'] = (skills_breakdown[skill]['correct'] / skills_breakdown[skill]['total']) * 100
    
    score = (correct / total) * 100 if total > 0 else 0
    
    submission = Submission(
        test_id=test_id,
        student_id=student_id,
        class_id=class_id,
        answers=answers,
        score=score,
        skills_breakdown=skills_breakdown
    )
    
    sub_dict = submission.model_dump()
    sub_dict['submitted_at'] = sub_dict['submitted_at'].isoformat()
    await db.submissions.insert_one(sub_dict)
    
    return submission
