"""Analytics routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import os

from emergentintegrations.llm.chat import LlmChat, UserMessage

from utils.database import db
from utils.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/class/{class_id}")
async def get_class_analytics(class_id: str, current_user: dict = Depends(get_current_user)):
    """Get analytics for a class"""
    submissions = await db.submissions.find({"class_id": class_id}, {"_id": 0}).to_list(10000)
    
    if not submissions:
        return {"message": "No data yet"}
    
    # Get students
    class_data = await db.classes.find_one({"id": class_id}, {"_id": 0})
    students = await db.students.find({"id": {"$in": class_data['student_ids']}}, {"_id": 0}).to_list(1000)
    
    # Calculate analytics
    skill_stats = {}
    student_stats = {}
    
    for sub in submissions:
        if sub['student_id'] not in student_stats:
            student = next((s for s in students if s['id'] == sub['student_id']), None)
            student_stats[sub['student_id']] = {
                'student_name': student['name'] if student else 'Unknown',
                'total_score': 0,
                'count': 0,
                'skills': {}
            }
        
        student_stats[sub['student_id']]['total_score'] += sub['score']
        student_stats[sub['student_id']]['count'] += 1
        
        for skill, breakdown in sub['skills_breakdown'].items():
            if skill not in skill_stats:
                skill_stats[skill] = {
                    'skill': skill,
                    'total_attempts': 0,
                    'correct_count': 0,
                    'total_questions': 0,
                    'students_struggling': []
                }
            
            skill_stats[skill]['total_attempts'] += 1
            skill_stats[skill]['correct_count'] += breakdown['correct']
            skill_stats[skill]['total_questions'] += breakdown['total']
            
            if sub['student_id'] not in student_stats[sub['student_id']]['skills']:
                student_stats[sub['student_id']]['skills'][skill] = {'correct': 0, 'total': 0}
            
            student_stats[sub['student_id']]['skills'][skill]['correct'] += breakdown['correct']
            student_stats[sub['student_id']]['skills'][skill]['total'] += breakdown['total']
    
    # Calculate averages and identify struggling students
    for skill, stats in skill_stats.items():
        stats['class_average'] = (stats['correct_count'] / stats['total_questions']) * 100 if stats['total_questions'] > 0 else 0
        
        for student_id, student_data in student_stats.items():
            if skill in student_data['skills']:
                skill_perf = student_data['skills'][skill]
                percentage = (skill_perf['correct'] / skill_perf['total']) * 100
                if percentage < 70:
                    stats['students_struggling'].append({
                        'student_id': student_id,
                        'student_name': student_data['student_name'],
                        'percentage': percentage
                    })
    
    # Calculate overall student averages
    for student_id, stats in student_stats.items():
        stats['overall_average'] = stats['total_score'] / stats['count'] if stats['count'] > 0 else 0
    
    # Get unique quizzes taken in this class
    quiz_ids = list(set([sub['test_id'] for sub in submissions]))
    quizzes_data = []
    for quiz_id in quiz_ids:
        quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
        if quiz:
            quiz_submissions = [sub for sub in submissions if sub['test_id'] == quiz_id]
            avg_score = sum([s['score'] for s in quiz_submissions]) / len(quiz_submissions) if quiz_submissions else 0
            quizzes_data.append({
                'quiz_id': quiz_id,
                'quiz_title': quiz['title'],
                'submissions_count': len(quiz_submissions),
                'average_score': avg_score
            })
    
    return {
        'skill_stats': list(skill_stats.values()),
        'student_stats': list(student_stats.values()),
        'quizzes': quizzes_data
    }


@router.post("/remediation-suggestions")
async def get_remediation_suggestions(data: dict, current_user: dict = Depends(get_current_user)):
    """Get AI-generated remediation suggestions"""
    skill = data.get('skill')
    student_names = data.get('student_names', [])
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"remediation_{current_user['id']}_{datetime.now(timezone.utc).isoformat()}",
        system_message="You are an expert education interventionist providing targeted remediation strategies."
    )
    chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
    
    prompt = f"""Provide exactly 5 specific, actionable remediation activities for students struggling with the following standard/skill:

Standard/Skill: {skill}

Students needing help: {', '.join(student_names) if student_names else 'Multiple students'}

Requirements for EACH of the 5 activities:
- Be specific and immediately actionable in the classroom
- Include materials needed (common classroom items)
- Suggest duration (5-15 minutes)
- Make it engaging and age-appropriate
- Build from concrete to abstract understanding
- Focus on the specific standard/skill listed above

Format: Return exactly 5 activities as a clear numbered list (1-5). Each activity should be 2-3 sentences."""

    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    response_text = response if isinstance(response, str) else str(response)
    
    return {"skill": skill, "suggestions": response_text}


@router.get("/test/{quiz_id}")
async def get_test_report(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed test report for a quiz"""
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    submissions = await db.submissions.find({"test_id": quiz_id}, {"_id": 0}).to_list(10000)
    
    if not submissions:
        return {"message": "No submissions yet"}
    
    student_ids = [sub['student_id'] for sub in submissions]
    students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0}).to_list(1000)
    student_map = {s['id']: s for s in students}
    
    scores = [sub['score'] for sub in submissions]
    class_average = sum(scores) / len(scores) if scores else 0
    highest_score = max(scores) if scores else 0
    lowest_score = min(scores) if scores else 0
    
    # Calculate standards performance
    standards_stats = {}
    for sub in submissions:
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            if standard not in standards_stats:
                standards_stats[standard] = {
                    'standard': standard,
                    'total_correct': 0,
                    'total_attempts': 0,
                    'students_struggling': []
                }
            
            standards_stats[standard]['total_correct'] += breakdown['correct']
            standards_stats[standard]['total_attempts'] += breakdown['total']
            
            percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
            if percentage < 70:
                student_name = student_map.get(sub['student_id'], {}).get('name', 'Unknown')
                standards_stats[standard]['students_struggling'].append(student_name)
    
    standards_list = []
    for std_code, stats in standards_stats.items():
        class_avg = (stats['total_correct'] / stats['total_attempts'] * 100) if stats['total_attempts'] > 0 else 0
        standards_list.append({
            'standard': std_code,
            'class_average': class_avg,
            'students_struggling': len(set(stats['students_struggling']))
        })
    
    # Student results
    student_results = []
    for sub in submissions:
        student_name = student_map.get(sub['student_id'], {}).get('name', 'Unknown')
        
        standards_performance = []
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
            standards_performance.append({
                'standard': standard,
                'percentage': percentage
            })
        
        student_results.append({
            'student_id': sub['student_id'],
            'name': student_name,
            'score': sub['score'],
            'standards_performance': standards_performance
        })
    
    student_results.sort(key=lambda x: x['score'], reverse=True)
    
    # Question analysis
    question_stats = {}
    for question in quiz['questions']:
        question_stats[question['id']] = {
            'question_text': question['question_text'],
            'standard': question['skill'],
            'correct_count': 0,
            'total_count': 0
        }
    
    for sub in submissions:
        for answer in sub['answers']:
            if answer['question_id'] in question_stats:
                question_stats[answer['question_id']]['total_count'] += 1
                
                question = next((q for q in quiz['questions'] if q['id'] == answer['question_id']), None)
                if question and question['correct_answer'] == answer['selected_answer']:
                    question_stats[answer['question_id']]['correct_count'] += 1
    
    questions_analysis = []
    for q_id, stats in question_stats.items():
        percent_correct = (stats['correct_count'] / stats['total_count'] * 100) if stats['total_count'] > 0 else 0
        questions_analysis.append({
            'question_text': stats['question_text'],
            'standard': stats['standard'],
            'percent_correct': percent_correct
        })
    
    return {
        'quiz_title': quiz['title'],
        'total_students': len(submissions),
        'class_average': class_average,
        'highest_score': highest_score,
        'lowest_score': lowest_score,
        'standards': standards_list,
        'students': student_results,
        'questions': questions_analysis
    }


@router.get("/student/{student_id}")
async def get_student_profile(student_id: str, current_user: dict = Depends(get_current_user)):
    """Get student performance profile"""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    submissions = await db.submissions.find({"student_id": student_id}, {"_id": 0}).sort("submitted_at", 1).to_list(10000)
    
    if not submissions:
        return {
            'student_name': student['name'],
            'tests_taken': 0,
            'overall_average': 0,
            'highest_score': 0,
            'standards_mastered': 0,
            'standards': [],
            'test_history': [],
            'needs_support': []
        }
    
    scores = [sub['score'] for sub in submissions]
    overall_average = sum(scores) / len(scores) if scores else 0
    highest_score = max(scores) if scores else 0
    
    # Calculate standards performance
    standards_data = {}
    for sub in submissions:
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            if standard not in standards_data:
                standards_data[standard] = {
                    'standard': standard,
                    'total_correct': 0,
                    'total_attempts': 0,
                    'scores': []
                }
            
            percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
            standards_data[standard]['scores'].append(percentage)
            standards_data[standard]['total_correct'] += breakdown['correct']
            standards_data[standard]['total_attempts'] += breakdown['total']
    
    standards_list = []
    standards_mastered = 0
    needs_support = []
    
    for std_code, data in standards_data.items():
        average = (data['total_correct'] / data['total_attempts'] * 100) if data['total_attempts'] > 0 else 0
        
        if average >= 80:
            standards_mastered += 1
        elif average < 70:
            needs_support.append(std_code)
        
        standards_list.append({
            'standard': std_code,
            'average': average,
            'attempts': len(data['scores'])
        })
    
    standards_list.sort(key=lambda x: x['average'], reverse=True)
    
    # Test history
    test_history = []
    for idx, sub in enumerate(submissions):
        quiz = await db.quizzes.find_one({"id": sub['test_id']}, {"_id": 0})
        
        trend = 'stable'
        if idx > 0:
            prev_score = submissions[idx - 1]['score']
            if sub['score'] > prev_score + 5:
                trend = 'up'
            elif sub['score'] < prev_score - 5:
                trend = 'down'
        
        standards_performance = []
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
            standards_performance.append({
                'standard': standard,
                'percentage': percentage
            })
        
        test_history.append({
            'quiz_id': sub['test_id'],
            'quiz_title': quiz['title'] if quiz else 'Unknown Quiz',
            'score': sub['score'],
            'date': sub['submitted_at'][:10] if isinstance(sub['submitted_at'], str) else str(sub['submitted_at'])[:10],
            'trend': trend,
            'standards_performance': standards_performance
        })
    
    return {
        'student_name': student['name'],
        'tests_taken': len(submissions),
        'overall_average': overall_average,
        'highest_score': highest_score,
        'standards_mastered': standards_mastered,
        'standards': standards_list,
        'test_history': test_history,
        'needs_support': needs_support
    }


@router.get("/groupings/{class_id}")
async def get_groupings(class_id: str, current_user: dict = Depends(get_current_user)):
    """Get student groupings based on performance"""
    class_data = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not class_data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    submissions = await db.submissions.find({"class_id": class_id}, {"_id": 0}).to_list(10000)
    
    if not submissions:
        return {"class_name": class_data['name'], "groupings": []}
    
    students = await db.students.find({"id": {"$in": class_data['student_ids']}}, {"_id": 0}).to_list(1000)
    student_map = {s['id']: s for s in students}
    
    # Calculate standards performance per student
    standards_data = {}
    for sub in submissions:
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            if standard not in standards_data:
                standards_data[standard] = {}
            
            student_id = sub['student_id']
            if student_id not in standards_data[standard]:
                standards_data[standard][student_id] = {
                    'total_correct': 0,
                    'total_attempts': 0
                }
            
            standards_data[standard][student_id]['total_correct'] += breakdown['correct']
            standards_data[standard][student_id]['total_attempts'] += breakdown['total']
    
    # Create groupings for students who need support (<70%)
    groupings = []
    for standard, student_data in standards_data.items():
        students_struggling = []
        total_percentage = 0
        
        for student_id, data in student_data.items():
            percentage = (data['total_correct'] / data['total_attempts'] * 100) if data['total_attempts'] > 0 else 0
            
            if percentage < 70:
                student_name = student_map.get(student_id, {}).get('name', 'Unknown')
                students_struggling.append({
                    'student_id': student_id,
                    'name': student_name,
                    'percentage': percentage
                })
                total_percentage += percentage
        
        if students_struggling:
            students_struggling.sort(key=lambda x: x['percentage'])
            average = total_percentage / len(students_struggling) if students_struggling else 0
            
            groupings.append({
                'standard': standard,
                'students': students_struggling,
                'average': average
            })
    
    groupings.sort(key=lambda x: len(x['students']), reverse=True)
    
    return {
        'class_name': class_data['name'],
        'groupings': groupings
    }


@router.get("/standards-coverage")
async def get_standards_coverage(timeframe: str = 'quarter', current_user: dict = Depends(get_current_user)):
    """Track which standards have been assessed"""
    quizzes = await db.quizzes.find({"teacher_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    assessed_standards = {}
    for quiz in quizzes:
        for question in quiz.get('questions', []):
            standard = question.get('skill')
            if standard:
                if standard not in assessed_standards:
                    assessed_standards[standard] = {'times_assessed': 0, 'total_score': 0, 'count': 0}
                assessed_standards[standard]['times_assessed'] += 1
    
    quiz_ids = [q['id'] for q in quizzes]
    submissions = await db.submissions.find({"test_id": {"$in": quiz_ids}}, {"_id": 0}).to_list(10000)
    
    for sub in submissions:
        for standard, breakdown in sub.get('skills_breakdown', {}).items():
            if standard in assessed_standards:
                percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
                assessed_standards[standard]['total_score'] += percentage
                assessed_standards[standard]['count'] += 1
    
    assessed_list = []
    for standard, data in assessed_standards.items():
        avg_score = (data['total_score'] / data['count']) if data['count'] > 0 else 0
        assessed_list.append({
            'standard': standard,
            'times_assessed': data['times_assessed'],
            'average_score': avg_score
        })
    
    assessed_list.sort(key=lambda x: x['standard'])
    
    return {
        'assessed': assessed_list,
        'assessed_count': len(assessed_list),
        'not_assessed': [],
        'not_assessed_count': 0,
        'coverage_percentage': 100
    }


@router.get("/at-risk-students")
async def get_at_risk_students(threshold: int = 70, current_user: dict = Depends(get_current_user)):
    """Identify students who need intervention"""
    classes = await db.classes.find({"teacher_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    at_risk_students = []
    
    for cls in classes:
        submissions = await db.submissions.find({"class_id": cls['id']}, {"_id": 0}).to_list(10000)
        
        student_data = {}
        for sub in submissions:
            student_id = sub['student_id']
            if student_id not in student_data:
                student_data[student_id] = {'scores': [], 'standards': {}}
            
            student_data[student_id]['scores'].append(sub['score'])
            
            for standard, breakdown in sub.get('skills_breakdown', {}).items():
                if standard not in student_data[student_id]['standards']:
                    student_data[student_id]['standards'][standard] = {'correct': 0, 'total': 0}
                student_data[student_id]['standards'][standard]['correct'] += breakdown['correct']
                student_data[student_id]['standards'][standard]['total'] += breakdown['total']
        
        for student_id, data in student_data.items():
            if not data['scores']:
                continue
            
            avg_score = sum(data['scores']) / len(data['scores'])
            
            if avg_score < threshold:
                student = await db.students.find_one({"id": student_id}, {"_id": 0})
                if not student:
                    continue
                
                trend = 'stable'
                if len(data['scores']) >= 3:
                    recent_avg = sum(data['scores'][-3:]) / 3
                    earlier_avg = sum(data['scores'][:-3]) / len(data['scores'][:-3]) if len(data['scores']) > 3 else avg_score
                    if recent_avg < earlier_avg - 5:
                        trend = 'declining'
                
                if avg_score < 60 or trend == 'declining':
                    priority = 'Critical'
                elif avg_score < 65:
                    priority = 'High'
                else:
                    priority = 'Medium'
                
                struggling_standards = []
                for standard, breakdown in data['standards'].items():
                    percentage = (breakdown['correct'] / breakdown['total'] * 100) if breakdown['total'] > 0 else 0
                    if percentage < 70:
                        struggling_standards.append({
                            'standard': standard,
                            'percentage': percentage
                        })
                
                struggling_standards.sort(key=lambda x: x['percentage'])
                
                at_risk_students.append({
                    'student_id': student_id,
                    'name': student['name'],
                    'class_name': cls['name'],
                    'average_score': avg_score,
                    'quizzes_taken': len(data['scores']),
                    'trend': trend,
                    'priority_level': priority,
                    'struggling_standards': struggling_standards
                })
    
    priority_order = {'Critical': 0, 'High': 1, 'Medium': 2}
    at_risk_students.sort(key=lambda x: (priority_order[x['priority_level']], x['average_score']))
    
    critical_count = sum(1 for s in at_risk_students if s['priority_level'] == 'Critical')
    high_count = sum(1 for s in at_risk_students if s['priority_level'] == 'High')
    medium_count = sum(1 for s in at_risk_students if s['priority_level'] == 'Medium')
    
    return {
        'students': at_risk_students,
        'total_count': len(at_risk_students),
        'critical_count': critical_count,
        'high_count': high_count,
        'medium_count': medium_count
    }
