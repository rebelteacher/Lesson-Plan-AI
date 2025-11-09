import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudentJoin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [classCode, setClassCode] = useState(searchParams.get('code') || '');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check if session_id in URL fragment
    const fragment = window.location.hash;
    if (fragment.includes('session_id=')) {
      const sessionId = fragment.split('session_id=')[1].split('&')[0];
      await processSession(sessionId);
      window.location.hash = ''; // Clean URL
      return;
    }

    // Check existing session
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/student/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const processSession = async (sessionId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/student/session`, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Set cookie
        document.cookie = `student_session_token=${data.session_token}; path=/; max-age=${7*24*60*60}; secure; samesite=none`;
        setStudent(data.student);
        toast.success(`Welcome, ${data.student.name}!`);
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/classes/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Joined ${data.class_name} successfully!`);
        // Store student ID in session
        sessionStorage.setItem('student_id', data.student_id);
        sessionStorage.setItem('student_name', formData.student_name);
        navigate('/student/assignments');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to join class');
      }
    } catch (error) {
      toast.error('Error joining class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
            Join Class
          </h1>
          <p className="text-gray-600">Enter your information to join</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>Fill in your details to join the class</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-code">Class Code</Label>
                <Input
                  id="class-code"
                  placeholder="Enter class code"
                  value={formData.class_code}
                  onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-name">Your Name</Label>
                <Input
                  id="student-name"
                  placeholder="Enter your full name"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-email">Email (Optional)</Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder="your.email@school.edu"
                  value={formData.student_email}
                  onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID (Optional)</Label>
                <Input
                  id="student-id"
                  placeholder="Your student ID number"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {loading ? 'Joining...' : 'Join Class'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentJoin;
