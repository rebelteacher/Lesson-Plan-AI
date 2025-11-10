import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Plus, LogOut, Trash2, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TeacherDashboard = ({ user, onLogout }) => {
  const [lessonPlans, setLessonPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLessonPlans();
  }, []);

  const fetchLessonPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessonPlans(data);
      }
    } catch (error) {
      toast.error('Error loading lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Lesson plan deleted');
        setLessonPlans(lessonPlans.filter(p => p.id !== planId));
      } else {
        toast.error('Failed to delete lesson plan');
      }
    } catch (error) {
      toast.error('Error deleting lesson plan');
    }
  };

  const handleSubmitToAdmin = async (planId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${planId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Lesson plan submitted to admin for review!');
        fetchLessonPlans(); // Refresh to show updated status
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to submit lesson plan');
      }
    } catch (error) {
      toast.error('Error submitting lesson plan');
    }
  };

  const getStatusBadge = (status) => {
    if (!status || status === 'draft') return null;
    
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', text: '⏳ Pending Review' },
      approved: { color: 'bg-green-100 text-green-700 border-green-300', text: '✓ Approved' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-300', text: '✗ Needs Revision' }
    };
    
    const badge = badges[status];
    if (!badge) return null;
    
    return (
      <div className={`text-xs px-2 py-1 rounded-full border ${badge.color} font-medium`}>
        {badge.text}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
              Welcome, {user.full_name}
            </h1>
            <p className="text-gray-600">Create and manage your lesson plans</p>
          </div>
          <Button 
            onClick={onLogout} 
            data-testid="logout-btn"
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Total Lesson Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-bold mb-2" data-testid="total-plans-count">{lessonPlans.length}</div>
              <div className="text-indigo-100">Plans created and saved</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/classes')}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Manage Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">Classes & Students</div>
              <div className="text-emerald-100">Create and manage your classes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/analytics')}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Quiz Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">Student Performance</div>
              <div className="text-orange-100">Track progress and skills</div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Tools */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/standards-coverage')}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Standards Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">Track Assessment Coverage</div>
              <div className="text-blue-100">See which standards you've tested</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/at-risk-students')}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                At-Risk Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">Intervention & Tutoring</div>
              <div className="text-red-100">Priority students who need help</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>Your Lesson Plans</h2>
          <Button 
            onClick={() => navigate('/create')} 
            data-testid="create-lesson-plan-btn"
            className="flex items-center gap-2 text-lg px-6 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Create New Plan
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading lesson plans...</div>
          </div>
        ) : lessonPlans.length === 0 ? (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertDescription>
              You haven't created any lesson plans yet. Click "Create New Plan" to get started!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="lesson-plans-grid">
            {lessonPlans.map((plan, index) => {
              const colors = [
                'from-rose-100 to-pink-100 border-rose-300',
                'from-blue-100 to-cyan-100 border-blue-300',
                'from-amber-100 to-yellow-100 border-amber-300',
                'from-purple-100 to-indigo-100 border-purple-300',
                'from-green-100 to-emerald-100 border-green-300',
                'from-orange-100 to-red-100 border-orange-300'
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <Card key={plan.id} className={`hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer bg-gradient-to-br ${colorClass} border-2`} data-testid={`lesson-plan-card-${plan.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-1 text-gray-800">{plan.textbook}</CardTitle>
                      {getStatusBadge(plan.submission_status)}
                    </div>
                    <CardDescription className="font-medium text-gray-700">Lessons: {plan.lesson_range}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-sm">
                        <span className="text-gray-600 font-medium">Date Range:</span>
                        <div className="font-semibold text-gray-800">{plan.start_date} - {plan.end_date}</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-sm">
                        <span className="text-gray-600 font-medium">Next Assessment:</span>
                        <div className="font-semibold text-gray-800">{plan.next_major_assessment}</div>
                      </div>
                    </div>
                    {plan.admin_feedback && plan.submission_status === 'rejected' && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="font-medium text-red-700 mb-1">Admin Feedback:</div>
                        <div className="text-red-600">{plan.admin_feedback}</div>
                      </div>
                    )}
                    {plan.admin_feedback && plan.submission_status === 'approved' && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                        <div className="font-medium text-green-700 mb-1">Admin Feedback:</div>
                        <div className="text-green-600">{plan.admin_feedback}</div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => navigate(`/lesson/${plan.id}`)} 
                          data-testid={`view-plan-btn-${plan.id}`}
                          className="flex-1"
                          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                        >
                          View Details
                        </Button>
                        <Button 
                          onClick={() => handleDelete(plan.id)} 
                          data-testid={`delete-plan-btn-${plan.id}`}
                          variant="destructive"
                          size="icon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button 
                        onClick={() => navigate(`/quiz/create/${plan.id}`)} 
                        className="w-full"
                        variant="outline"
                        style={{ borderColor: '#10b981', color: '#10b981' }}
                      >
                        📝 Create Quiz
                      </Button>
                      {(!plan.submission_status || plan.submission_status === 'draft' || plan.submission_status === 'rejected') && (
                        <Button 
                          onClick={() => handleSubmitToAdmin(plan.id)} 
                          className="w-full"
                          variant="outline"
                          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                        >
                          📤 Submit to Admin
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;