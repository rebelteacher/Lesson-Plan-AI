import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminReports = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [planStats, setPlanStats] = useState(null);
  const [testStats, setTestStats] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch lesson plan reports
      const planRes = await fetch(`${BACKEND_URL}/api/admin/reports/lesson-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlanStats(planData);
      }
      
      // Fetch test results reports
      const testRes = await fetch(`${BACKEND_URL}/api/admin/reports/test-results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (testRes.ok) {
        const testData = await testRes.json();
        setTestStats(testData);
      }
    } catch (error) {
      toast.error('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'text-gray-600 bg-gray-100',
      pending: 'text-yellow-600 bg-yellow-100',
      approved: 'text-green-600 bg-green-100',
      rejected: 'text-red-600 bg-red-100'
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button onClick={() => navigate('/admin')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
            Admin Reports
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics and reporting</p>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Lesson Plan Status</TabsTrigger>
            <TabsTrigger value="tests">Test Results</TabsTrigger>
          </TabsList>

          {/* Lesson Plan Reports */}
          <TabsContent value="plans" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-600">{planStats?.draft || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Unsubmitted</div>
                    </div>
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-yellow-600">{planStats?.pending || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Need Review</div>
                    </div>
                    <Clock className="w-10 h-10 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-red-600">{planStats?.rejected || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Need Resubmit</div>
                    </div>
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-600">{planStats?.approved || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Completed</div>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Teacher Status Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Teacher Status Breakdown</CardTitle>
                <CardDescription>Detailed view of lesson plan submissions by teacher</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-3">Teacher Name</th>
                        <th className="text-left p-3">School</th>
                        <th className="text-center p-3">Total Plans</th>
                        <th className="text-center p-3">Unsubmitted</th>
                        <th className="text-center p-3">Pending</th>
                        <th className="text-center p-3">Rejected</th>
                        <th className="text-center p-3">Approved</th>
                        <th className="text-center p-3">Submission Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planStats?.teachers?.map((teacher, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3">{teacher.name}</td>
                          <td className="p-3">{teacher.school || 'N/A'}</td>
                          <td className="text-center p-3">{teacher.total}</td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-1 rounded ${getStatusColor('draft')}`}>
                              {teacher.draft}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-1 rounded ${getStatusColor('pending')}`}>
                              {teacher.pending}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-1 rounded ${getStatusColor('rejected')}`}>
                              {teacher.rejected}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-1 rounded ${getStatusColor('approved')}`}>
                              {teacher.approved}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${teacher.submission_rate}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium">{teacher.submission_rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Results Reports */}
          <TabsContent value="tests" className="space-y-4">
            {/* School-Level View */}
            {!selectedSchool && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Test Results by School</CardTitle>
                  <CardDescription>Click a school to drill down to class level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {testStats?.schools?.map((school, idx) => (
                      <div 
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all"
                        onClick={() => setSelectedSchool(school)}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-semibold">{school.name || 'Unknown School'}</h3>
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-indigo-600">{school.total_classes}</div>
                            <div className="text-xs text-gray-600">Classes</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{school.total_students}</div>
                            <div className="text-xs text-gray-600">Students</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{school.total_quizzes}</div>
                            <div className="text-xs text-gray-600">Quizzes</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{school.average_score.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Avg Score</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Class-Level View */}
            {selectedSchool && !selectedClass && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedSchool.name} - Classes</CardTitle>
                      <CardDescription>Click a class to view student details</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedSchool(null)}>
                      Back to Schools
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {selectedSchool.classes?.map((cls, idx) => (
                      <div 
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all"
                        onClick={() => setSelectedClass(cls)}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-semibold">{cls.class_name}</h3>
                          <span className="text-sm text-gray-600">Teacher: {cls.teacher_name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{cls.student_count}</div>
                            <div className="text-xs text-gray-600">Students</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{cls.quiz_count}</div>
                            <div className="text-xs text-gray-600">Quizzes</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{cls.class_average.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Class Avg</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Student-Level View */}
            {selectedClass && (
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedClass.class_name} - Students</CardTitle>
                      <CardDescription>Individual student performance</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedClass(null)}>
                      Back to Classes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-3">Student Name</th>
                          <th className="text-center p-3">Quizzes Taken</th>
                          <th className="text-center p-3">Average Score</th>
                          <th className="text-center p-3">Highest Score</th>
                          <th className="text-center p-3">Lowest Score</th>
                          <th className="text-center p-3">Standards Mastered</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClass.students?.map((student, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-3">{student.name}</td>
                            <td className="text-center p-3">{student.quizzes_taken}</td>
                            <td className="text-center p-3">
                              <span className={`font-bold ${student.average >= 80 ? 'text-green-600' : student.average >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {student.average.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-center p-3">{student.highest.toFixed(1)}%</td>
                            <td className="text-center p-3">{student.lowest.toFixed(1)}%</td>
                            <td className="text-center p-3">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                {student.standards_mastered}
                              </span>
                            </td>
                            <td className="text-center p-3">
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
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminReports;
