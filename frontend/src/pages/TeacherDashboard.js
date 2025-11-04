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

  const copyJoinCode = () => {
    const joinLink = `${window.location.origin}?join=${user.join_code}`;
    navigator.clipboard.writeText(joinLink);
    toast.success('Join link copied to clipboard!');
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
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Your Join Code</CardTitle>
              <CardDescription>Share this link with others to invite them</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                  <div className="text-sm text-gray-600 mb-1">Your unique join code:</div>
                  <div className="text-2xl font-bold text-indigo-600" data-testid="join-code-display">{user.join_code}</div>
                </div>
                <Button onClick={copyJoinCode} data-testid="copy-join-code-btn" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Plans:</span>
                  <span className="font-bold text-indigo-600" data-testid="total-plans-count">{lessonPlans.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="font-bold">{user.state || 'N/A'}</span>
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