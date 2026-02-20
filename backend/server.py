"""
LessonPlan AI - Modular Backend Server
======================================
A FastAPI application for AI-powered lesson planning and assessment management.

This is the main entry point that combines all modular routes.
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routers
from routes.auth import router as auth_router
from routes.lesson_plans import router as lesson_plans_router
from routes.classes import router as classes_router
from routes.quizzes import router as quizzes_router
from routes.submissions import router as submissions_router
from routes.analytics import router as analytics_router
from routes.admin import router as admin_router

# Import database client for shutdown
from utils.database import client

# Create the main app
app = FastAPI(
    title="LessonPlan AI",
    description="AI-powered lesson planning and assessment management system",
    version="2.0.0"
)

# Include all routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(lesson_plans_router, prefix="/api")
app.include_router(classes_router, prefix="/api")
app.include_router(quizzes_router, prefix="/api")
app.include_router(submissions_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# CORS middleware
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
    """Close database connection on shutdown"""
    client.close()


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}
