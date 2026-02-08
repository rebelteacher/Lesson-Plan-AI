"""Quiz routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging
import os
import json
import uuid
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage

from models.quiz import QuizTest, Question, Assignment
from utils.database import db
from utils.auth import get_current_user

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.post("/extract-objectives")
async def extract_objectives(data: dict, current_user: dict = Depends(get_current_user)):
    """Extract objectives and standards from a lesson plan"""
    lesson_plan_id = data.get('lesson_plan_id')
    
    # Get lesson plan
    plan = await db.lesson_plans.find_one({"id": lesson_plan_id, "user_id": current_user['id']}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Extract objectives and collect all standards
    objectives = []
    all_standards_text = []
    
    for day_plan in plan.get('daily_plans', []):
        # Collect standards from the standards field
        standards_text = day_plan.get('standards', '')
        if standards_text and 'see full plan below' not in standards_text.lower():
            all_standards_text.append(standards_text)
        
        # ALSO check teaching_lesson field for "2. Standards" section
        teaching_lesson = day_plan.get('teaching_lesson', '')
        if teaching_lesson and '2. Standards' in teaching_lesson:
            standards_section_pattern = r'(?:###\s*)?2\.\s*Standards?\s*\n(.*?)(?=\n(?:###\s*)?\d+\.|$)'
            match = re.search(standards_section_pattern, teaching_lesson, re.IGNORECASE | re.DOTALL)
            if match:
                all_standards_text.append(match.group(1))
        
        if day_plan.get('learner_outcomes'):
            # Parse objectives
            text = day_plan['learner_outcomes']
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            for line in lines:
                clean_line = line.lstrip('•-*123456789.() ').strip()
                if len(clean_line) > 10:
                    objectives.append({
                        'id': str(uuid.uuid4()),
                        'text': clean_line,
                        'day': day_plan['day_name'],
                        'date': day_plan['day_date'],
                        'selected': True
                    })
    
    # Parse and deduplicate standards
    unique_standards = set()
    for standards_text in all_standards_text:
        if 'see full plan below' in standards_text.lower() or 'content will be generated' in standards_text.lower():
            continue
        
        lines = standards_text.split('\n')
        for line in lines:
            # Pattern 1: Standard code before a colon
            colon_pattern = r'^[\s\-\*\•]*([A-Z0-9][A-Z0-9\.\-]+[0-9A-Z])(?:\s*[:)]|$)'
            match = re.match(colon_pattern, line.strip(), re.IGNORECASE)
            if match:
                code = match.group(1).strip()
                if re.search(r'\d', code) and '.' in code:
                    unique_standards.add(code)
                continue
            
            # Pattern 2: Standard codes in brackets or bold
            bracket_pattern = r'[\[\*]+([A-Z0-9][A-Z0-9\.\-]+[0-9A-Z])[\]\*]+'
            matches = re.findall(bracket_pattern, line, re.IGNORECASE)
            for code in matches:
                if re.search(r'\d', code) and '.' in code:
                    unique_standards.add(code.strip())
    
    # Create standards list
    standards_list = [
        {
            'id': str(uuid.uuid4()),
            'text': std,
            'selected': True
        }
        for std in sorted(unique_standards)
    ]
    
    return {
        "objectives": objectives,
        "standards": standards_list
    }


@router.post("/generate-questions")
async def generate_questions(data: dict, current_user: dict = Depends(get_current_user)):
    """Generate quiz questions from standards using AI"""
    standards_data = data.get('standards', [])
    count = data.get('count', 3)
    
    if not standards_data:
        raise HTTPException(status_code=400, detail="No standards provided")
    
    # Initialize Claude
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"quiz_gen_{current_user['id']}_{datetime.now(timezone.utc).isoformat()}",
        system_message="You are an expert education assessment creator. Generate high-quality multiple choice questions aligned with state educational standards."
    )
    chat.with_model("anthropic", "claude-3-7-sonnet-20250219")
    
    all_questions = []
    
    for standard_code in standards_data:
        prompt = f"""Generate {count} multiple choice questions to assess student understanding of this educational standard:

Standard: {standard_code}

For each question:
1. Make it grade-appropriate and aligned with the standard
2. Provide exactly 4 answer options
3. Indicate which option (0-3) is correct
4. Ensure distractors are plausible but clearly wrong
5. Questions should test knowledge, comprehension, or application related to this standard

Return ONLY a JSON array in this exact format:
[
  {{
    "question_text": "question here",
    "options": ["option 1", "option 2", "option 3", "option 4"],
    "correct_answer": 0,
    "skill": "{standard_code}"
  }}
]

Return ONLY the JSON array, no other text."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        response_text = response if isinstance(response, str) else str(response)
        
        # Parse JSON response
        try:
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            if json_start != -1 and json_end > json_start:
                json_text = response_text[json_start:json_end]
                questions = json.loads(json_text)
                
                for q in questions:
                    all_questions.append({
                        'id': str(uuid.uuid4()),
                        'question_text': q['question_text'],
                        'options': q['options'],
                        'correct_answer': q['correct_answer'],
                        'skill': standard_code
                    })
        except Exception as e:
            logging.error(f"Error parsing questions: {str(e)}")
            continue
    
    return {"questions": all_questions}


@router.post("")
async def create_quiz(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new quiz"""
    quiz = QuizTest(
        title=data['title'],
        teacher_id=current_user['id'],
        lesson_plan_id=data['lesson_plan_id'],
        questions=[Question(**q) for q in data['questions']],
        status=data.get('status', 'draft')
    )
    
    quiz_dict = quiz.model_dump()
    quiz_dict['created_at'] = quiz_dict['created_at'].isoformat()
    await db.quizzes.insert_one(quiz_dict)
    
    return quiz


@router.get("")
async def get_quizzes(current_user: dict = Depends(get_current_user)):
    """Get all quizzes for current teacher"""
    quizzes = await db.quizzes.find({"teacher_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quizzes


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str):
    """Get a specific quiz"""
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.put("/{quiz_id}")
async def update_quiz(quiz_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a quiz"""
    result = await db.quizzes.update_one(
        {"id": quiz_id, "teacher_id": current_user['id']},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"message": "Quiz updated successfully"}


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a quiz"""
    result = await db.quizzes.delete_one({"id": quiz_id, "teacher_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"message": "Quiz deleted successfully"}
