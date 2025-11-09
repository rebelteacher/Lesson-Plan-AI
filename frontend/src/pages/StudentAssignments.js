import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/student/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
        fetchAssignments(data.id);
      } else {
        navigate('/student/join');
      }
    } catch (error) {
      navigate('/student/join');
    }
  };

  const fetchAssignments = async (studentId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/assignments/student/${studentId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      toast.error('Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}><div className="text-2xl">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
            Welcome, {studentName}!
          </h1>
          <p className="text-gray-600">Your quiz assignments</p>
        </div>

        {assignments.length === 0 ? (
          <Card><CardContent className="py-16 text-center"><BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-xl font-semibold mb-2">No Assignments Yet</h3><p className="text-gray-600">Check back later for new quizzes</p></CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {assignments.map((assign) => (
              <Card key={assign.id} className="shadow-xl">
                <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50">
                  <CardTitle>{assign.quiz.title}</CardTitle>
                  <CardDescription>{assign.quiz.questions.length} questions</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {assign.completed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Completed - Score: {assign.score.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <Button onClick={() => navigate(`/student/quiz/${assign.quiz.id}`)} className="w-full" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                      Take Quiz
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;
