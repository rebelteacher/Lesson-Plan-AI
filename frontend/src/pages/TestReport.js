import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Printer, TrendingUp, TrendingDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TestReport = ({ user }) => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestReport();
  }, [quizId]);

  const fetchTestReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/test/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        toast.error('Failed to load report');
      }
    } catch (error) {
      toast.error('Error loading report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (!report) return;

    let csv = 'Student Name,Score (%),';
    report.standards.forEach(std => {
      csv += `${std.standard},`;
    });
    csv += '\n';

    report.students.forEach(student => {
      csv += `${student.name},${student.score.toFixed(1)},`;
      report.standards.forEach(std => {
        const stdData = student.standards_performance.find(s => s.standard === std.standard);
        csv += `${stdData ? stdData.percentage.toFixed(1) : 'N/A'},`;
      });
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.quiz_title}_report.csv`;
    a.click();
    toast.success('Report exported!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-xl text-gray-600">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 print:p-8" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-7xl">
        {/* Header - Hide on print */}
        <div className="mb-6 print:hidden">
          <Button onClick={() => navigate('/analytics')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                Test Report
              </h1>
              <p className="text-gray-600 mt-2">{report.quiz_title}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold">{report.quiz_title}</h1>
          <p className="text-gray-600">Test Report - Generated {new Date().toLocaleDateString()}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-indigo-600">{report.total_students}</div>
              <div className="text-sm text-gray-600">Students</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{report.class_average.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Class Average</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{report.highest_score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Highest Score</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">{report.lowest_score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Lowest Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Standards Performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Standards Performance</CardTitle>
            <CardDescription>Class average by standard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.standards.map((std) => (
                <div key={std.standard} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold font-mono text-indigo-700">{std.standard}</div>
                    <div className="text-2xl font-bold">{std.class_average.toFixed(1)}%</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${std.class_average >= 80 ? 'bg-green-500' : std.class_average >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${std.class_average}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {std.students_struggling} student(s) need support
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Results Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Individual Student Results</CardTitle>
            <CardDescription>Detailed scores by student and standard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Student Name</th>
                    <th className="text-center p-3 font-semibold">Overall Score</th>
                    {report.standards.map(std => (
                      <th key={std.standard} className="text-center p-3 font-semibold text-xs">{std.standard}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((student, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <button
                          onClick={() => navigate(`/student-profile/${student.student_id}`)}
                          className="text-indigo-600 hover:underline print:text-black print:no-underline"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="text-center p-3">
                        <span className={`font-bold ${student.score >= 80 ? 'text-green-600' : student.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.score.toFixed(1)}%
                        </span>
                      </td>
                      {report.standards.map(std => {
                        const stdPerf = student.standards_performance.find(s => s.standard === std.standard);
                        return (
                          <td key={std.standard} className="text-center p-3">
                            {stdPerf ? (
                              <span className={stdPerf.percentage >= 80 ? 'text-green-600' : stdPerf.percentage >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                                {stdPerf.percentage.toFixed(0)}%
                              </span>
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Question Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question Analysis</CardTitle>
            <CardDescription>Difficulty level of each question</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.questions.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium">Q{idx + 1}. {q.question_text}</div>
                      <div className="text-xs text-gray-600 mt-1">Standard: {q.standard}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${q.percent_correct >= 80 ? 'text-green-600' : q.percent_correct >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {q.percent_correct.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600">correct</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${q.percent_correct >= 80 ? 'bg-green-500' : q.percent_correct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${q.percent_correct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestReport;
