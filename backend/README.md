# LessonPlan AI - Reusable Modules

A modular full-stack education platform built with FastAPI + React + MongoDB.

## Module Structure

```
/app/backend/
├── server.py           # Main entry point - imports all routers
├── models/             # Pydantic data models
│   ├── __init__.py     # Package exports
│   ├── user.py         # User authentication models
│   ├── lesson_plan.py  # Lesson plan models
│   ├── quiz.py         # Quiz and submission models
│   ├── student.py      # Student and class models
│   └── admin.py        # Admin-specific models
├── routes/             # API route handlers
│   ├── __init__.py     # Package exports
│   ├── auth.py         # Authentication (JWT + Google OAuth)
│   ├── lesson_plans.py # AI lesson plan generation
│   ├── classes.py      # Class management
│   ├── quizzes.py      # Quiz CRUD + AI question generation
│   ├── submissions.py  # Quiz submissions and grading
│   ├── analytics.py    # Performance analytics
│   └── admin.py        # Admin dashboard routes
└── utils/              # Shared utilities
    ├── __init__.py     # Package exports
    ├── database.py     # MongoDB connection
    ├── auth.py         # Auth helpers (JWT, password hashing)
    └── helpers.py      # General utilities
```

## How to Reuse Modules

### Option 1: Copy Entire Backend
Copy the `/app/backend/` folder to your new project.

### Option 2: Copy Specific Modules
Each module is designed to be standalone. Copy the folders you need:

| Module | Dependencies | Description |
|--------|-------------|-------------|
| `models/` | None | Pydantic models - works anywhere |
| `utils/database.py` | `motor`, MongoDB | Database connection |
| `utils/auth.py` | `passlib`, `jwt`, `utils/database.py` | JWT + password auth |
| `routes/auth.py` | `models/user.py`, `utils/auth.py` | Full auth flow |
| `routes/lesson_plans.py` | `models/lesson_plan.py`, Claude AI | AI lesson generation |
| `routes/quizzes.py` | `models/quiz.py`, Claude AI | Quiz + AI questions |
| `routes/analytics.py` | `utils/database.py` | Performance analytics |

### Adapting for New Projects

1. **Change Collection Names**: Edit `utils/database.py` or pass collection names as parameters
2. **Modify Models**: Update Pydantic models in `models/` to match your data structure
3. **Update AI Prompts**: Edit prompts in `routes/lesson_plans.py` and `routes/quizzes.py`
4. **Change Auth Flow**: Modify `routes/auth.py` if you need different user fields

## Required Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=your_database
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
EMERGENT_LLM_KEY=your-key  # For AI features
```

## Dependencies

```
fastapi
motor
pydantic
passlib
python-jose[cryptography]
python-docx
emergentintegrations  # For AI features
aiohttp  # For Google OAuth
```

## Example: Adding to a New Project

```python
# new_project/server.py
from fastapi import FastAPI

# Copy the routes folder from LessonPlan AI
from routes.auth import router as auth_router
from routes.quizzes import router as quiz_router

app = FastAPI()

# Include only the routes you need
app.include_router(auth_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
```

## Module Details

### Authentication Module (`routes/auth.py`)
- JWT-based teacher/admin login
- Google OAuth for students
- Password hashing with bcrypt
- Session management

**Key Endpoints:**
- `POST /auth/register` - Register with invitation code
- `POST /auth/login` - Email/password login
- `POST /auth/student/session` - Google OAuth for students

### Lesson Plan Module (`routes/lesson_plans.py`)
- AI-powered daily lesson plan generation using Claude
- Word document export
- Submission workflow (draft → pending → approved/rejected)

**Key Endpoints:**
- `POST /lesson-plans` - Generate AI lesson plan
- `GET /lesson-plans/{id}/export` - Export to Word
- `POST /lesson-plans/{id}/submit` - Submit for review

### Quiz Module (`routes/quizzes.py`)
- Extract standards from lesson plans
- AI question generation aligned to standards
- Quiz CRUD operations

**Key Endpoints:**
- `POST /quizzes/extract-objectives` - Parse standards from plan
- `POST /quizzes/generate-questions` - AI creates questions
- `POST /quizzes` - Save quiz

### Analytics Module (`routes/analytics.py`)
- Class performance tracking
- Individual student profiles
- AI-powered remediation suggestions
- Standards coverage tracking
- At-risk student identification

**Key Endpoints:**
- `GET /analytics/class/{id}` - Class performance
- `GET /analytics/student/{id}` - Student profile
- `POST /analytics/remediation-suggestions` - AI suggestions
- `GET /analytics/at-risk-students` - Identify struggling students

## Frontend Pages (React)

Key frontend pages that pair with these modules:
- `AuthPage.js` - Login/registration
- `CreateLessonPlan.js` - Lesson plan form
- `CreateQuiz.js` - Quiz creation wizard
- `QuizAnalytics.js` - View class performance
- `StudentProfile.js` - Individual student data
- `TakeQuiz.js` - Student quiz interface
