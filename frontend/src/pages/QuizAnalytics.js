import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, TrendingUp, Users, Target, Printer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const QuizAnalytics = ({ user }) => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [remediationSuggestions, setRemediationSuggestions] = useState({});
  const [selectedActivities, setSelectedActivities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingRemediation, setLoadingRemediation] = useState({});

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
    setLoadingRemediation({ ...loadingRemediation, [skill]: true });
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
        toast.success('Remediation suggestions loaded!');
      } else {
        toast.error('Failed to load suggestions');
      }
    } catch (error) {
      console.error('Remediation error:', error);
      toast.error('Error loading suggestions');
    } finally {
      setLoadingRemediation({ ...loadingRemediation, [skill]: false });
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
          <div className="flex justify-between items-center">
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
            {selectedClass && (
              <Button 
                onClick={() => navigate(`/groupings/${selectedClass}`)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                View Groupings
              </Button>
            )}
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
            {/* Quiz Reports */}
            {analytics.quizzes && analytics.quizzes.length > 0 && (
              <Card className="shadow-2xl">
                <CardHeader>
                  <CardTitle>Quiz Reports</CardTitle>
                  <CardDescription>View detailed reports for each quiz</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.quizzes.map((quiz) => (
                      <div key={quiz.quiz_id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/test-report/${quiz.quiz_id}`)}>
                        <div className="font-semibold text-indigo-700 mb-2">{quiz.quiz_title}</div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{quiz.submissions_count} student(s)</span>
                          <span className="font-bold">{quiz.average_score.toFixed(1)}% avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                            disabled={loadingRemediation[skill.skill]}
                          >
                            {loadingRemediation[skill.skill] ? 'Loading...' : 'Get Remediation Suggestions'}
                          </Button>

                          {/* Show suggestions if loaded */}
                          {remediationSuggestions[skill.skill] && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <div className="flex justify-between items-center mb-3">
                                <div className="font-medium">Remediation Activities:</div>
                                <div className="flex gap-2 print:hidden">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      // Parse all activity numbers
                                      const activities = {};
                                      remediationSuggestions[skill.skill].split(/\n/).forEach(line => {
                                        const match = line.match(/^(\d+)[\.\)]\s*(.+)/);
                                        if (match) {
                                          activities[match[1]] = true;
                                        }
                                      });
                                      setSelectedActivities(prev => ({
                                        ...prev,
                                        [skill.skill]: activities
                                      }));
                                    }}
                                  >
                                    Select All
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedActivities(prev => ({
                                        ...prev,
                                        [skill.skill]: {}
                                      }));
                                    }}
                                  >
                                    Clear
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      const selectedForSkill = selectedActivities[skill.skill] || {};
                                      const hasSelected = Object.values(selectedForSkill).some(v => v);
                                      if (!hasSelected) {
                                        toast.error('Please select at least one activity to print');
                                        return;
                                      }
                                      window.print();
                                    }}
                                  >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Selected
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {remediationSuggestions[skill.skill].split(/\n/).filter(line => line.trim()).map((line, idx) => {
                                  // Extract activity number if present
                                  const match = line.match(/^(\d+)[\.\)]\s*(.+)/);
                                  if (match) {
                                    const activityNum = match[1];
                                    const activityText = match[2];
                                    const activityKey = `${skill.skill}-${activityNum}`;
                                    const isSelected = selectedActivities[skill.skill]?.[activityNum] || false;
                                    
                                    return (
                                      <div key={idx} className={`flex items-start gap-3 p-3 border rounded hover:bg-gray-50 ${isSelected ? 'print:block' : 'print:hidden'}`}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            setSelectedActivities(prev => ({
                                              ...prev,
                                              [skill.skill]: {
                                                ...(prev[skill.skill] || {}),
                                                [activityNum]: checked
                                              }
                                            }));
                                          }}
                                          className="mt-1 print:hidden"
                                        />
                                        <div className="flex-1 text-sm text-gray-700">
                                          <span className="font-semibold">{activityNum}.</span> {activityText}
                                        </div>
                                      </div>
                                    );
                                  }
                                  // If no number, just display the line
                                  return line.trim() && (
                                    <div key={idx} className="text-sm text-gray-700 pl-8">
                                      {line}
                                    </div>
                                  );
                                })}
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
