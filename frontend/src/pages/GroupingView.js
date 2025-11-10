import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GroupingView = ({ user }) => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [groupings, setGroupings] = useState(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupings();
  }, [classId]);

  const fetchGroupings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/groupings/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroupings(data.groupings);
        setClassName(data.class_name);
      } else {
        toast.error('Failed to load groupings');
      }
    } catch (error) {
      toast.error('Error loading groupings');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading groupings...</div>
      </div>
    );
  }

  if (!groupings || groupings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-xl text-gray-600">No groupings available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 print:p-8" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        {/* Header - Hide on print */}
        <div className="mb-6 print:hidden">
          <Button onClick={() => navigate('/analytics')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                Student Groupings
              </h1>
              <p className="text-gray-600 mt-2">{className}</p>
            </div>
            
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold">Student Groupings - {className}</h1>
          <p className="text-gray-600">Generated {new Date().toLocaleDateString()}</p>
        </div>

        {/* Groupings by Standard */}
        <div className="space-y-6">
          {groupings.map((group, idx) => (
            <Card key={idx} className="shadow-xl print:shadow-none print:border-2">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 print:bg-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Standard: {group.standard}
                </CardTitle>
                <CardDescription>
                  {group.students.length} student(s) need support - Average: {group.average.toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Small Group Recommendations */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">Small Group Instruction</span>
                  </h3>
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {group.students.slice(0, 6).map((student, sidx) => (
                        <div key={sidx} className="flex items-center gap-2 bg-white p-3 rounded border">
                          <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                            {sidx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-gray-600">{student.percentage.toFixed(0)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {group.students.length > 6 && (
                      <div className="text-sm text-gray-600 italic">
                        + {group.students.length - 6} more student(s)
                      </div>
                    )}
                  </div>
                </div>

                {/* Partner Pairs */}
                {group.students.length >= 2 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">Partner Pairs</span>
                    </h3>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.from({ length: Math.ceil(group.students.length / 2) }, (_, i) => i * 2).map((startIdx) => (
                          <div key={startIdx} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm text-gray-600 mb-2">Pair {Math.floor(startIdx / 2) + 1}</div>
                            <div className="space-y-2">
                              {group.students.slice(startIdx, startIdx + 2).map((student, sidx) => (
                                <div key={sidx} className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {String.fromCharCode(65 + sidx)}
                                  </div>
                                  <span className="text-sm">{student.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full List */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Complete List</h3>
                  <div className="border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold">#</th>
                          <th className="text-left p-3 font-semibold">Student Name</th>
                          <th className="text-center p-3 font-semibold">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.students.map((student, sidx) => (
                          <tr key={sidx} className="border-t hover:bg-gray-50">
                            <td className="p-3">{sidx + 1}</td>
                            <td className="p-3">{student.name}</td>
                            <td className="text-center p-3">
                              <span className="font-bold text-red-600">
                                {student.percentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Page break for printing */}
                <div className="hidden print:block print:break-after-page"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupingView;
