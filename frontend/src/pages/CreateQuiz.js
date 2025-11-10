import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Sparkles, Trash2, Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CreateQuiz = ({ user }) => {
  const { lessonPlanId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: select objectives, 2: review questions, 3: publish
  const [lessonPlan, setLessonPlan] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [standards, setStandards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);

  useEffect(() => {
    fetchLessonPlan();
    fetchClasses();
  }, [lessonPlanId]);

  const fetchLessonPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${lessonPlanId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessonPlan(data);
        setQuizTitle(`Quiz: ${data.textbook}`);
        extractObjectives();
      }
    } catch (error) {
      toast.error('Error loading lesson plan');
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error loading classes');
    }
  };

  const extractObjectives = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/quizzes/extract-objectives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lesson_plan_id: lessonPlanId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setObjectives(data.objectives);
        setStandards(data.standards || []);
      } else {
        toast.error('Failed to extract objectives');
      }
    } catch (error) {
      toast.error('Error extracting objectives');
    } finally {
      setLoading(false);
    }
  };

  const toggleObjective = (id) => {
    setObjectives(objectives.map(obj => 
      obj.id === id ? { ...obj, selected: !obj.selected } : obj
    ));
  };

  const generateQuestions = async () => {
    const selectedObjectives = objectives.filter(obj => obj.selected).map(obj => ({
      text: obj.text,
      standards: obj.standards
    }));
    
    if (selectedObjectives.length === 0) {
      toast.error('Please select at least one objective');
      return;
    }

    setLoading(true);
    toast.info('Generating questions aligned with standards... This may take a minute.');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/quizzes/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ objectives: selectedObjectives, count: 3 })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions);
        setStep(2);
        toast.success(`Generated ${data.questions.length} questions!`);
      } else {
        toast.error('Failed to generate questions');
      }
    } catch (error) {
      toast.error('Error generating questions');
    } finally {
      setLoading(false);
    }
  };

  const generateMoreQuestions = async (skill) => {
    setLoading(true);
    toast.info('Generating more questions...');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/quizzes/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ objectives: [skill], count: 3 })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions([...questions, ...data.questions]);
        toast.success(`Added ${data.questions.length} more questions!`);
      }
    } catch (error) {
      toast.error('Error generating questions');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    toast.success('Question deleted');
  };

  const publishQuiz = async () => {
    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    if (selectedClasses.length === 0) {
      toast.error('Select at least one class');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create quiz
      const quizResponse = await fetch(`${BACKEND_URL}/api/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: quizTitle,
          lesson_plan_id: lessonPlanId,
          questions: questions,
          status: 'published'
        })
      });
      
      if (quizResponse.ok) {
        const quiz = await quizResponse.json();
        
        // Create assignment
        await fetch(`${BACKEND_URL}/api/assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            test_id: quiz.id,
            class_ids: selectedClasses
          })
        });
        
        toast.success('Quiz published successfully!');
        navigate('/dashboard');
      } else {
        toast.error('Failed to publish quiz');
      }
    } catch (error) {
      toast.error('Error publishing quiz');
    } finally {
      setLoading(false);
    }
  };

  if (!lessonPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <Button 
          onClick={() => navigate('/dashboard')} 
          variant="ghost" 
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
              Create Quiz
            </h1>
            <p className="text-gray-600">From: {lessonPlan.textbook}</p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>1</div>
                <span className="font-medium">Select Objectives</span>
              </div>
              <div className="w-12 h-1 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>2</div>
                <span className="font-medium">Review Questions</span>
              </div>
              <div className="w-12 h-1 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>3</div>
                <span className="font-medium">Publish</span>
              </div>
            </div>
          </div>

          {/* Step 1: Select Objectives */}
          {step === 1 && (
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle>Select Learning Objectives</CardTitle>
                <CardDescription>Choose which objectives to include in the quiz</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {objectives.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={obj.selected}
                        onCheckedChange={() => toggleObjective(obj.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{obj.text}</div>
                        <div className="text-sm text-gray-500">{obj.day} - {obj.date}</div>
                        {obj.standards && (
                          <div className="text-xs text-indigo-600 mt-1 font-medium">
                            📋 Standards: {obj.standards.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={generateQuestions}
                  disabled={loading || objectives.filter(o => o.selected).length === 0}
                  className="w-full flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {loading ? (
                    <>Generating Questions...</>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review Questions */}
          {step === 2 && (
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle>Review & Edit Questions ({questions.length} total)</CardTitle>
                <CardDescription>Delete unwanted questions or request more</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-sm text-indigo-600 mb-1">Skill: {q.skill}</div>
                          <div className="font-medium mb-2">Q{index + 1}. {q.question_text}</div>
                        </div>
                        <Button
                          onClick={() => deleteQuestion(q.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className={`p-2 rounded ${idx === q.correct_answer ? 'bg-green-100 border border-green-300' : 'bg-white border'}`}>
                            {String.fromCharCode(65 + idx)}. {opt}
                            {idx === q.correct_answer && <span className="ml-2 text-green-600 font-bold">✓ Correct</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="flex-1"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    Next: Publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Publish */}
          {step === 3 && (
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle>Publish Quiz</CardTitle>
                <CardDescription>Assign to your classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-title">Quiz Title</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Enter quiz title"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Assign to Classes:</Label>
                    {classes.map((cls) => (
                      <div key={cls.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClasses([...selectedClasses, cls.id]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                            }
                          }}
                        />
                        <div>
                          <div className="font-medium">{cls.name}</div>
                          <div className="text-sm text-gray-500">{cls.student_count} students</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="font-medium mb-2">Quiz Summary:</div>
                    <div className="text-sm space-y-1">
                      <div>• {questions.length} questions</div>
                      <div>• {selectedClasses.length} class(es) selected</div>
                      <div>• Ready to publish</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={publishQuiz}
                      disabled={loading}
                      className="flex-1"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      {loading ? 'Publishing...' : 'Publish Quiz'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;
