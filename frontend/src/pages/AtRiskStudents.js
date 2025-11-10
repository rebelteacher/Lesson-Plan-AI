import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, TrendingDown, Download, Printer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AtRiskStudents = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [atRiskData, setAtRiskData] = useState(null);
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    fetchAtRiskStudents();
  }, [threshold]);

  const fetchAtRiskStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/at-risk-students?threshold=${threshold}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAtRiskData(data);
      }
    } catch (error) {
      toast.error('Error loading at-risk data');
    } finally {
      setLoading(false);
    }
  };

  const exportForTutoring = () => {
    if (!atRiskData || !atRiskData.students) return;

    let csv = 'At-Risk Students - Tutoring List\n\n';
    csv += 'Student Name,Class,Average Score,Trend,Priority,Standards Struggling,Contact Method\n';
    
    atRiskData.students.forEach(student => {
      const standards = student.struggling_standards.map(s => s.standard).join('; ');
      csv += `${student.name},${student.class_name},${student.average_score.toFixed(1)}%,${student.trend},${student.priority_level},${standards},\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutoring_list_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Tutoring list exported!');
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'Critical': 'bg-red-600 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading at-risk students...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 print:p-8" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 print:hidden">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                At-Risk Students
              </h1>
              <p className="text-gray-600 mt-2">Priority students for intervention and tutoring</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={exportForTutoring} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export for Tutoring
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
          <h1 className="text-3xl font-bold">At-Risk Students - Tutoring List</h1>
          <p className="text-gray-600">Generated {new Date().toLocaleDateString()}</p>
        </div>

        {/* Threshold Selector */}
        <Card className="mb-6 print:hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="font-medium">Score Threshold:</label>
              <div className="flex gap-2">
                <Button size="sm" variant={threshold === 60 ? 'default' : 'outline'} onClick={() => setThreshold(60)}>
                  60%
                </Button>
                <Button size="sm" variant={threshold === 70 ? 'default' : 'outline'} onClick={() => setThreshold(70)}>
                  70%
                </Button>
                <Button size="sm" variant={threshold === 75 ? 'default' : 'outline'} onClick={() => setThreshold(75)}>
                  75%
                </Button>
              </div>
              <span className="text-sm text-gray-600 ml-auto">
                Showing students scoring below {threshold}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:grid">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{atRiskData?.critical_count || 0}</div>
              <div className="text-sm text-gray-600">Critical Priority</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">{atRiskData?.high_count || 0}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{atRiskData?.medium_count || 0}</div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{atRiskData?.total_count || 0}</div>
              <div className="text-sm text-gray-600">Total At-Risk</div>
            </CardContent>
          </Card>
        </div>

        {/* At-Risk Students List */}
        <Card>
          <CardHeader>
            <CardTitle>At-Risk Students (Sorted by Priority)</CardTitle>
            <CardDescription>Students needing immediate intervention or tutoring support</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskData?.students && atRiskData.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3">Priority</th>
                      <th className="text-left p-3">Student Name</th>
                      <th className="text-left p-3">Class</th>
                      <th className="text-center p-3">Avg Score</th>
                      <th className="text-center p-3">Trend</th>
                      <th className="text-center p-3">Quizzes Taken</th>
                      <th className="text-left p-3">Struggling Standards</th>
                      <th className="text-center p-3 print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskData.students.map((student, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 print:break-inside-avoid">
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityBadge(student.priority_level)}`}>
                            {student.priority_level}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{student.name}</td>
                        <td className="p-3">{student.class_name}</td>
                        <td className="text-center p-3">
                          <span className="font-bold text-red-600">
                            {student.average_score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center p-3">
                          {student.trend === 'declining' ? (
                            <span className="flex items-center justify-center gap-1 text-red-600">
                              <TrendingDown className="w-4 h-4" />
                              Declining
                            </span>
                          ) : (
                            <span className="text-gray-600">Stable</span>
                          )}
                        </td>
                        <td className="text-center p-3">{student.quizzes_taken}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {student.struggling_standards?.slice(0, 3).map((std, sidx) => (
                              <span key={sidx} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-mono">
                                {std.standard}
                              </span>
                            ))}
                            {student.struggling_standards?.length > 3 && (
                              <span className="text-xs text-gray-600">+{student.struggling_standards.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-3 print:hidden">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/student-profile/${student.student_id}`)}
                          >
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                🎉 No at-risk students! All students are performing well.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {atRiskData?.students && atRiskData.students.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Intervention Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <div className="font-semibold text-red-700 mb-2">Critical Priority Students ({atRiskData.critical_count})</div>
                  <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                    <li>Immediate one-on-one intervention required</li>
                    <li>Daily check-ins recommended</li>
                    <li>Consider after-school tutoring</li>
                    <li>Parent/guardian conference</li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                  <div className="font-semibold text-orange-700 mb-2">High Priority Students ({atRiskData.high_count})</div>
                  <ul className="text-sm text-orange-600 list-disc list-inside space-y-1">
                    <li>Small group instruction (3-4 students)</li>
                    <li>After-school tutoring program</li>
                    <li>Weekly progress monitoring</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-semibold text-yellow-700 mb-2">Medium Priority Students ({atRiskData.medium_count})</div>
                  <ul className="text-sm text-yellow-600 list-disc list-inside space-y-1">
                    <li>Targeted remediation activities</li>
                    <li>Peer tutoring opportunities</li>
                    <li>Additional practice assignments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AtRiskStudents;
