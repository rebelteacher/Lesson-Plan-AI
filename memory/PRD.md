# LessonPlan AI - Product Requirements Document

## Original Problem Statement
Build an AI-powered lesson planning platform for educators with:
- AI-generated daily lesson plans aligned to state standards
- Quiz creation with AI-generated questions
- Student performance analytics
- Admin oversight and reporting
- Teacher supervision workflow

## User Personas
1. **Teachers** - Create lesson plans, quizzes, track student performance
2. **Students** - Join classes, take quizzes via Google OAuth
3. **Administrators** - Review lesson plans, supervise teachers, view reports

## Core Requirements

### Completed Features ✅
- [x] Teacher/Admin JWT authentication with invitation codes
- [x] Student Google OAuth authentication
- [x] AI-powered lesson plan generation (Claude Sonnet)
- [x] Word document export for lesson plans
- [x] Lesson plan submission/review workflow
- [x] Quiz creation from lesson plan standards
- [x] AI question generation (5 per standard)
- [x] Question/answer randomization for students
- [x] Class management with join codes
- [x] Quiz assignment to classes
- [x] Student quiz taking and submission
- [x] Class performance analytics
- [x] Individual test reports
- [x] Student performance profiles with charts
- [x] AI remediation suggestions
- [x] Standards coverage tracking (placeholder)
- [x] At-risk student identification (placeholder)
- [x] Student grouping by skill
- [x] Admin teacher supervision
- [x] Admin drill-down reports (School → Class → Student)
- [x] Marketing materials (presentation, one-pager)
- [x] **Backend code modularization** (NEW - December 2025)

### Architecture (Post-Modularization)

```
/app/backend/
├── server.py           # Main entry (~70 lines)
├── models/             # Pydantic models
│   ├── user.py         # User auth models
│   ├── lesson_plan.py  # Lesson plan models
│   ├── quiz.py         # Quiz/submission models
│   ├── student.py      # Student/class models
│   └── admin.py        # Admin models
├── routes/             # API handlers
│   ├── auth.py         # Authentication
│   ├── lesson_plans.py # Lesson plan CRUD + AI
│   ├── classes.py      # Class management
│   ├── quizzes.py      # Quiz CRUD + AI
│   ├── submissions.py  # Quiz submissions
│   ├── analytics.py    # Performance analytics
│   └── admin.py        # Admin functions
└── utils/              # Shared utilities
    ├── database.py     # MongoDB connection
    ├── auth.py         # Auth helpers
    └── helpers.py      # General utilities
```

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **AI**: Claude Sonnet 4 (via Emergent LLM Key)
- **Auth**: JWT (teachers/admins), Google OAuth (students)
- **Data Viz**: Recharts, Victory

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register with invitation code
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/student/session` - Student OAuth

### Lesson Plans
- `POST /api/lesson-plans` - Generate AI lesson plan
- `GET /api/lesson-plans/{id}/export` - Export to Word
- `POST /api/lesson-plans/{id}/submit` - Submit for review

### Quizzes
- `POST /api/quizzes/extract-objectives` - Parse standards
- `POST /api/quizzes/generate-questions` - AI questions
- `POST /api/quizzes` - Save quiz

### Analytics
- `GET /api/analytics/class/{id}` - Class performance
- `GET /api/analytics/student/{id}` - Student profile
- `GET /api/analytics/at-risk-students` - Intervention alerts

## P0/P1/P2 Backlog

### P1 - High Priority
- [ ] Build At-Risk Students UI (backend exists)
- [ ] Build Standards Coverage UI (backend exists)
- [ ] Notification system (lesson plan approval alerts)

### P2 - Medium Priority
- [ ] Intervention tracking (log actions for at-risk students)
- [ ] Date range filtering in reports
- [ ] CSV export for reports

### P3 - Future
- [ ] Quiz-over-quiz comparison
- [ ] Student vs. class average charts
- [ ] Parent portal
- [ ] Mobile app

## Database Collections
- `users` - Teachers/Admins
- `students` - Student accounts (Google OAuth)
- `student_sessions` - Student auth sessions
- `classes` - Teacher classes
- `lesson_plans` - Generated lesson plans
- `quizzes` - Quiz tests
- `assignments` - Quiz-class assignments
- `submissions` - Student quiz submissions
- `invitation_codes` - Registration codes

## Notes
- Server.py reduced from 2175 lines to ~70 lines
- All modules are independently testable
- README.md in /app/backend explains reuse patterns
