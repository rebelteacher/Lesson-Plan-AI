import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, [quizId]);

  const checkAuthAndFetch = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/student/me`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
        fetchQuiz();
      } else {
        navigate('/student/join');
      }
    } catch (error) {
      navigate('/student/join');
    }
  };

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/quizzes/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    } catch (error) {
      toast.error('Error loading quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      toast.error('Please answer all questions');
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([question_id, selected_answer]) => ({
        question_id,
        selected_answer: parseInt(selected_answer)
      }));

      const response = await fetch(`${BACKEND_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: quizId,
          student_id: student.id,
          class_id: 'temp', // Will be handled by backend
          answers: formattedAnswers
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Quiz submitted! Score: ${result.score.toFixed(0)}%`);
        navigate('/student/assignments');
      } else {
        toast.error('Failed to submit quiz');
      }
    } catch (error) {
      toast.error('Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}><div className="text-2xl">Loading quiz...</div></div>;
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-2xl mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-2">{quiz.questions.length} Questions</p>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {quiz.questions.map((q, index) => (
              <Card key={q.id} className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <p className="text-gray-700 mt-2">{q.question_text}</p>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={answers[q.id]?.toString()} onValueChange={(value) => handleAnswerChange(q.id, value)}>
                    {q.options.map((option, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={optIdx.toString()} id={`q${index}-opt${optIdx}`} />
                        <Label htmlFor={`q${index}-opt${optIdx}`} className="flex-1 cursor-pointer">
                          {String.fromCharCode(65 + optIdx)}. {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-2xl mt-6">
            <CardContent className="pt-6">
              <Button onClick={handleSubmit} disabled={submitting} className="w-full" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
