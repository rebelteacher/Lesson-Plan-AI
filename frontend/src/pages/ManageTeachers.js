import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ManageTeachers = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/teachers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers);
        setSelectedTeachers(data.supervised_ids);
      }
    } catch (error) {
      toast.error('Error loading teachers');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacher = (teacherId) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId));
    } else {
      setSelectedTeachers([...selectedTeachers, teacherId]);
    }
  };

  const selectAll = () => {
    setSelectedTeachers(teachers.map(t => t.id));
  };

  const clearAll = () => {
    setSelectedTeachers([]);
  };

  const saveSupervision = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/update-supervision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teacher_ids: selectedTeachers })
      });

      if (response.ok) {
        toast.success('Supervision settings saved!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button onClick={() => navigate('/admin')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                Manage Supervised Teachers
              </h1>
              <p className="text-gray-600 mt-2">Select which teachers you supervise</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" onClick={clearAll}>
                Clear All
              </Button>
              <Button onClick={saveSupervision} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teachers ({selectedTeachers.length} of {teachers.length} selected)
            </CardTitle>
            <CardDescription>
              Select the teachers whose lesson plans and student data you want to view in reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length > 0 ? (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div 
                    key={teacher.id} 
                    className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                      selectedTeachers.includes(teacher.id) ? 'bg-indigo-50 border-indigo-300' : ''
                    }`}
                    onClick={() => toggleTeacher(teacher.id)}
                  >
                    <Checkbox
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={() => toggleTeacher(teacher.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{teacher.full_name}</div>
                      <div className="text-sm text-gray-600">
                        {teacher.email} 
                        {teacher.school && <span className="ml-2">• {teacher.school}</span>}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {teacher.state || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No teachers found in the system
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-medium text-blue-900 mb-2">ℹ️ About Supervision</div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Reports will only show data for teachers you supervise</p>
            <p>• Lesson plan submissions will be filtered to your supervised teachers</p>
            <p>• Test results analytics will include only supervised teachers' students</p>
            <p>• Changes take effect immediately after saving</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTeachers;
