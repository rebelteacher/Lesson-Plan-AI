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
    
    if (!student) {
      toast.error('Please login with Google first');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/classes/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_code: classCode,
          student_id: studentIdNumber
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Joined ${data.class_name} successfully!`);
        navigate('/student/assignments');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to join class');
      }
    } catch (error) {
      toast.error('Error joining class');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

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
            <CardTitle>Join Class</CardTitle>
            <CardDescription>Sign in with your school Google account</CardDescription>
          </CardHeader>
          <CardContent>
            {!student ? (
              <div className="space-y-4">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <p className="text-gray-700 mb-4">You must sign in with your school Google account to join a class and take quizzes.</p>
                </div>
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2"
                  style={{ background: '#4285f4' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <form onSubmit={handleJoinClass} className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg mb-4">
                  {student.picture && <img src={student.picture} alt={student.name} className="w-12 h-12 rounded-full" />}
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-600">{student.email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class-code">Class Code</Label>
                  <Input
                    id="class-code"
                    placeholder="Enter class code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-id">Student ID (Optional)</Label>
                  <Input
                    id="student-id"
                    placeholder="Your student ID number"
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={joining}
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {joining ? 'Joining...' : 'Join Class'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentJoin;
