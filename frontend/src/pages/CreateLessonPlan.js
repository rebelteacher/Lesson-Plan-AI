import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CreateLessonPlan = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    textbook: '',
    start_date: '',
    end_date: '',
    lesson_range: '',
    next_major_assessment: '',
    state_standards: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Lesson plan created successfully!');
        navigate(`/lesson/${data.id}`);
      } else {
        toast.error(data.detail || 'Failed to create lesson plan');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <Button 
          onClick={() => navigate('/dashboard')} 
          data-testid="back-to-dashboard-btn"
          variant="ghost" 
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
              Create Lesson Plan
            </h1>
            <p className="text-gray-600">AI will generate a comprehensive lesson plan based on your inputs</p>
          </div>

          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle>Lesson Plan Details</CardTitle>
              <CardDescription>Fill in the information below to generate your lesson plan</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="textbook">Textbook / Course Material</Label>
                  <Input
                    id="textbook"
                    data-testid="textbook-input"
                    placeholder="e.g., Algebra 1, Chapter 5"
                    value={formData.textbook}
                    onChange={(e) => setFormData({ ...formData, textbook: e.target.value })}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      data-testid="start-date-input"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      data-testid="end-date-input"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson_range">Lesson Number Range</Label>
                  <Input
                    id="lesson_range"
                    data-testid="lesson-range-input"
                    placeholder="e.g., Lessons 1-5 or Lesson 3"
                    value={formData.lesson_range}
                    onChange={(e) => setFormData({ ...formData, lesson_range: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_assessment">Date of Next Major Assessment</Label>
                  <Input
                    id="next_assessment"
                    data-testid="next-assessment-input"
                    type="date"
                    value={formData.next_major_assessment}
                    onChange={(e) => setFormData({ ...formData, next_major_assessment: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state_standards">State Standards (Optional)</Label>
                  <Input
                    id="state_standards"
                    data-testid="state-standards-input"
                    placeholder="e.g., CCSS.ELA-LITERACY.RI.8.2, CA NGSS 5-PS1-1, etc."
                    value={formData.state_standards}
                    onChange={(e) => setFormData({ ...formData, state_standards: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">Enter the state standards you want to align with (e.g., Common Core, state-specific standards)</p>
                </div>

                <Button 
                  type="submit" 
                  data-testid="generate-plan-btn"
                  className="w-full flex items-center justify-center gap-2" 
                  disabled={loading}
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Lesson Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Lesson Plan
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateLessonPlan;