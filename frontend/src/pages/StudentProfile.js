import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Printer, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudentProfile = ({ user }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProfile();
  }, [studentId]);

  const fetchStudentProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        toast.error('Failed to load student profile');
      }
    } catch (error) {
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const getMasteryIcon = (percentage) => {
    if (percentage >= 80) return '🟢';
    if (percentage >= 70) return '🟡';
    return '🔴';
  };

  const getMasteryLabel = (percentage) => {
    if (percentage >= 80) return 'Mastered';
    if (percentage >= 70) return 'Developing';
    return 'Needs Support';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  const exportStudentData = () => {
    if (!profile) return;

    let csv = 'Student Profile Report\n';
    csv += `Student: ${profile.student_name}\n`;
    csv += `Tests Taken: ${profile.tests_taken}\n`;
    csv += `Overall Average: ${profile.overall_average.toFixed(1)}%\n`;
    csv += `Standards Mastered: ${profile.standards_mastered}\n\n`;
    
    csv += 'Standards Performance\n';
    csv += 'Standard,Average,Status,Attempts\n';
    profile.standards.forEach(std => {
      csv += `${std.standard},${std.average.toFixed(1)}%,${getMasteryLabel(std.average)},${std.attempts}\n`;
    });
    
    csv += '\nTest History\n';
    csv += 'Date,Quiz Title,Score\n';
    profile.test_history.forEach(test => {
      csv += `${test.date},${test.quiz_title},${test.score.toFixed(1)}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.student_name}_profile.csv`;
    a.click();
    toast.success('Profile exported!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-xl text-gray-600">Student not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 print:p-8" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 print:hidden">
          <Button onClick={() => navigate('/analytics')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                Student Profile
              </h1>
              <p className="text-gray-600 mt-2">{profile.student_name}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={exportStudentData} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => window.print()} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold">{profile.student_name}</h1>
          <p className="text-gray-600">Student Profile - Generated {new Date().toLocaleDateString()}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-indigo-600">{profile.tests_taken}</div>
              <div className="text-sm text-gray-600">Tests Taken</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{profile.overall_average.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Overall Average</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{profile.highest_score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Highest Score</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">{profile.standards_mastered}</div>
              <div className="text-sm text-gray-600">Standards Mastered</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Over Time Chart */}
        {profile.test_history && profile.test_history.length > 1 && (
          <Card className="mb-6 print:hidden">
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Score trends across quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profile.test_history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    name="Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Standards Mastery */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Standards Mastery</CardTitle>
            <CardDescription>Performance by educational standard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.standards.map((std) => (
                <div key={std.standard} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getMasteryIcon(std.average)}</span>
                      <div>
                        <div className="font-semibold font-mono text-indigo-700">{std.standard}</div>
                        <div className="text-xs text-gray-600">{getMasteryLabel(std.average)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{std.average.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">{std.attempts} attempt(s)</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${std.average >= 80 ? 'bg-green-500' : std.average >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${std.average}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test History</CardTitle>
            <CardDescription>Performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.test_history.map((test, idx) => (
                <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <button
                        onClick={() => navigate(`/test-report/${test.quiz_id}`)}
                        className="font-medium text-indigo-600 hover:underline text-left print:text-black print:no-underline"
                      >
                        {test.quiz_title}
                      </button>
                      <div className="text-xs text-gray-600 mt-1">{test.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getTrendIcon(test.trend)}
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${test.score >= 80 ? 'text-green-600' : test.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {test.score.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Standards breakdown for this test */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {test.standards_performance.map((std, stdIdx) => (
                      <div key={stdIdx} className="text-xs border rounded p-2">
                        <div className="font-mono text-gray-700">{std.standard}</div>
                        <div className={`font-bold ${std.percentage >= 80 ? 'text-green-600' : std.percentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {std.percentage.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {profile.needs_support.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Standards needing additional support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-semibold mb-2">Focus Areas:</div>
                <ul className="list-disc list-inside space-y-1">
                  {profile.needs_support.map((std, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="font-mono text-indigo-700">{std}</span> - Consider additional practice and remediation
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
