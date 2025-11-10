import React, { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from '@/pages/AuthPage';
import TeacherDashboard from '@/pages/TeacherDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import CreateLessonPlan from '@/pages/CreateLessonPlan';
import ViewLessonPlan from '@/pages/ViewLessonPlan';
import InvitationCodes from '@/pages/InvitationCodes';
import AdminSettings from '@/pages/AdminSettings';
import ClassManagement from '@/pages/ClassManagement';
import CreateQuiz from '@/pages/CreateQuiz';
import QuizAnalytics from '@/pages/QuizAnalytics';
import TestReport from '@/pages/TestReport';
import StudentProfile from '@/pages/StudentProfile';
import StudentJoin from '@/pages/StudentJoin';
import StudentAssignments from '@/pages/StudentAssignments';
import TakeQuiz from '@/pages/TakeQuiz';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-2xl font-light text-indigo-600">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={!user ? <AuthPage onLogin={handleLogin} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />} 
            />
            <Route 
              path="/dashboard" 
              element={user && user.role === 'teacher' ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/create" 
              element={user && user.role === 'teacher' ? <CreateLessonPlan user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/lesson/:id" 
              element={user && user.role === 'teacher' ? <ViewLessonPlan user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin" 
              element={user && user.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/invitation-codes" 
              element={user && user.role === 'admin' ? <InvitationCodes user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/settings" 
              element={user && user.role === 'admin' ? <AdminSettings user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/classes" 
              element={user && user.role === 'teacher' ? <ClassManagement user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/quiz/create/:lessonPlanId" 
              element={user && user.role === 'teacher' ? <CreateQuiz user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/analytics" 
              element={user && user.role === 'teacher' ? <QuizAnalytics user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/test-report/:quizId" 
              element={user && user.role === 'teacher' ? <TestReport user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/student-profile/:studentId" 
              element={user && user.role === 'teacher' ? <StudentProfile user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/student/join" 
              element={<StudentJoin />} 
            />
            <Route 
              path="/student/assignments" 
              element={<StudentAssignments />} 
            />
            <Route 
              path="/student/quiz/:quizId" 
              element={<TakeQuiz />} 
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

export default App;