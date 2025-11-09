import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Users, Copy, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ClassManagement = ({ user }) => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '' });

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
      }
    } catch (error) {
      toast.error('Error loading classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newClass)
      });
      
      if (response.ok) {
        toast.success('Class created successfully!');
        setShowCreateDialog(false);
        setNewClass({ name: '', description: '' });
        fetchClasses();
      } else {
        toast.error('Failed to create class');
      }
    } catch (error) {
      toast.error('Error creating class');
    }
  };

  const copyClassCode = async (classCode) => {
    const joinLink = `${window.location.origin}/student/join?code=${classCode}`;
    try {
      await navigator.clipboard.writeText(joinLink);
      toast.success('Join link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/classes/${classId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Class deleted');
        fetchClasses();
      } else {
        toast.error('Failed to delete class');
      }
    } catch (error) {
      toast.error('Error deleting class');
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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
              Class Management
            </h1>
            <p className="text-gray-600">Create and manage your classes</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                <Plus className="w-4 h-4" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>Add a new class for your students</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="class-name">Class Name</Label>
                  <Input
                    id="class-name"
                    placeholder="e.g., Period 1 - 8th Grade Math"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-description">Description (Optional)</Label>
                  <Input
                    id="class-description"
                    placeholder="e.g., Advanced Math, Room 201"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  Create Class
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {classes.length === 0 ? (
          <Card className="shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Classes Yet</h3>
              <p className="text-gray-600 mb-4">Create your first class to get started</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                Create Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card key={cls.id} className="shadow-xl hover:shadow-2xl transition-shadow">
                <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50">
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>{cls.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Class Code:</div>
                      <div className="text-2xl font-bold text-indigo-600 font-mono">{cls.class_code}</div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Students:</span>
                      <span className="font-bold text-lg">{cls.student_count || 0}</span>
                    </div>

                    {cls.students && cls.students.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Student List:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {cls.students.map((student, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {student.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => copyClassCode(cls.class_code)}
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center gap-2"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Link
                      </Button>
                      <Button
                        onClick={() => handleDeleteClass(cls.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
