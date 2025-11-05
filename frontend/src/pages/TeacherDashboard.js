import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Plus, LogOut, Share2, Trash2, FileDown } from 'lucide-react';
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

        <div className="grid md:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Plans</div>
                  <div className="text-3xl font-bold text-indigo-600" data-testid="total-plans-count">{lessonPlans.length}</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">State</div>
                  <div className="text-3xl font-bold text-blue-600">{user.state || 'N/A'}</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Account Status</div>
                  <div className="text-lg font-bold text-green-600">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>Your Lesson Plans</h2>
          <Button 
            onClick={() => navigate('/create')} 
            data-testid="create-lesson-plan-btn"
            className="flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Plus className="w-4 h-4" />
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
            {lessonPlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-xl transition-shadow cursor-pointer" data-testid={`lesson-plan-card-${plan.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{plan.textbook}</CardTitle>
                  <CardDescription>Lessons: {plan.lesson_range}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-600">Date Range:</span>
                      <div className="font-medium">{plan.start_date} - {plan.end_date}</div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Next Assessment:</span>
                      <div className="font-medium">{plan.next_major_assessment}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => navigate(`/lesson/${plan.id}`)} 
                      data-testid={`view-plan-btn-${plan.id}`}
                      className="flex-1"
                      variant="outline"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;