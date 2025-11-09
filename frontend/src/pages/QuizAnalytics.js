import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Users, Target } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const QuizAnalytics = ({ user }) => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [remediationSuggestions, setRemediationSuggestions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
        if (data.length > 0) {
          selectClass(data[0].id);
        }
      }
    } catch (error) {
      toast.error('Error loading classes');
    } finally {
      setLoading(false);
    }
  };

  const selectClass = async (classId) => {
    setSelectedClass(classId);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/class/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      toast.error('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadRemediationSuggestions = async (skill, studentNames) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/remediation-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ skill, student_names: studentNames })
      });
      
      if (response.ok) {
        const data = await response.json();
        setRemediationSuggestions({
          ...remediationSuggestions,
          [skill]: data.suggestions
        });
      }
    } catch (error) {
      toast.error('Error loading suggestions');
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

        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
            Quiz Analytics
          </h1>
          <p className="text-gray-600">Student performance and remediation insights</p>
        </div>

        {/* Class Selector */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {classes.map((cls) => (
              <Button
                key={cls.id}
                onClick={() => selectClass(cls.id)}
                variant={selectedClass === cls.id ? 'default' : 'outline'}
                className={selectedClass === cls.id ? 'bg-indigo-600' : ''}
              >
                {cls.name}
              </Button>
            ))}
          </div>
        </div>

        {!analytics || analytics.message ? (
          <Card className="shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
              <p className="text-gray-600">Students haven't taken any quizzes in this class</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Skills Performance */}
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Skills Performance
                </CardTitle>
                <CardDescription>Class average by skill</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.skill_stats.map((skill, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{skill.skill}</div>
                        <div className="text-sm text-gray-600">
                          {skill.class_average.toFixed(1)}% average
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${skill.class_average >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${skill.class_average}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Tested {skill.total_attempts} time(s) • {skill.total_questions} questions
                      </div>

                      {/* Students struggling */}
                      {skill.students_struggling && skill.students_struggling.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="font-medium text-red-800 mb-2">
                            Students Needing Help ({skill.students_struggling.length}):
                          </div>
                          <div className="space-y-1">
                            {skill.students_struggling.map((student, sidx) => (
                              <div key={sidx} className="text-sm text-red-700">
                                • {student.student_name} ({student.percentage.toFixed(0)}%)
                              </div>
                            ))}
                          </div>
                          
                          {/* Remediation button */}
                          <Button
                            onClick={() => loadRemediationSuggestions(
                              skill.skill,
                              skill.students_struggling.map(s => s.student_name)
                            )}
                            size="sm"
                            className="mt-3"
                            variant="outline"
                          >
                            Get Remediation Suggestions
                          </Button>

                          {/* Show suggestions if loaded */}
                          {remediationSuggestions[skill.skill] && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="font-medium mb-2">Remediation Activities:</div>
                              <div className="text-sm whitespace-pre-wrap text-gray-700">
                                {remediationSuggestions[skill.skill]}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Performance */}
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Student Performance
                </CardTitle>
                <CardDescription>Individual student tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.student_stats.map((student, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{student.student_name}</div>
                        <div className={`font-bold ${student.overall_average >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                          {student.overall_average.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {student.count} quiz(zes) taken • Skills tracked: {Object.keys(student.skills).length}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizAnalytics;
