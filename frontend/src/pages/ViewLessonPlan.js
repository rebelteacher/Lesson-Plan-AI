import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileDown, Copy } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ViewLessonPlan = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lessonPlan, setLessonPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLessonPlan();
  }, [id]);

  const fetchLessonPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessonPlan(data);
      } else {
        toast.error('Lesson plan not found');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Error loading lesson plan');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lesson_plan_${id}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Lesson plan exported!');
      } else {
        toast.error('Failed to export lesson plan');
      }
    } catch (error) {
      toast.error('Error exporting lesson plan');
    }
  };

  const copyToClipboard = () => {
    const sections = [
      { title: 'Learner Outcomes/Objectives', content: lessonPlan.learner_outcomes },
      { title: 'Standards', content: lessonPlan.standards },
      { title: 'Materials Needed', content: lessonPlan.materials_needed },
      { title: 'Anticipatory Set', content: lessonPlan.anticipatory_set },
      { title: 'Teaching the Lesson', content: lessonPlan.teaching_lesson },
      { title: 'Modeling', content: lessonPlan.modeling },
      { title: 'Instructional Strategies', content: lessonPlan.instructional_strategies },
      { title: 'Check for Understanding', content: lessonPlan.check_understanding },
      { title: 'Guided Practice/Monitoring', content: lessonPlan.guided_practice },
      { title: 'Independent Practice', content: lessonPlan.independent_practice },
      { title: 'Closure', content: lessonPlan.closure },
      { title: 'Formative Assessment', content: lessonPlan.formative_assessment },
      { title: '**Extended Activities**', content: lessonPlan.extended_activities },
      { title: '**Review and Reteach Activities**', content: lessonPlan.review_reteach },
      { title: '**Early Finishers Activities**', content: lessonPlan.early_finishers }
    ];

    const text = sections.map(s => `${s.title}\n${s.content || 'N/A'}\n`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Lesson plan copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading lesson plan...</div>
      </div>
    );
  }

  if (!lessonPlan) return null;

  const LessonSection = ({ title, content, isBold }) => (
    <div className="mb-6">
      <h3 className={`text-xl font-semibold mb-3 ${isBold ? 'text-indigo-700' : 'text-gray-800'}`} style={{ fontFamily: 'Playfair Display, serif' }}>
        {title}
      </h3>
      <div className="pl-4 border-l-4 border-indigo-200">
        <p className="text-gray-700 whitespace-pre-wrap">{content || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <Button 
            onClick={() => navigate('/dashboard')} 
            data-testid="back-to-dashboard-btn"
            variant="ghost" 
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={copyToClipboard} 
              data-testid="copy-lesson-plan-btn"
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button 
              onClick={handleExport} 
              data-testid="export-lesson-plan-btn"
              className="flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <FileDown className="w-4 h-4" />
              Export to Word
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="shadow-2xl mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-3xl" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                {lessonPlan.textbook}
              </CardTitle>
              <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-gray-600">Lessons:</span>
                  <div className="font-medium">{lessonPlan.lesson_range}</div>
                </div>
                <div>
                  <span className="text-gray-600">Date Range:</span>
                  <div className="font-medium">{lessonPlan.start_date} - {lessonPlan.end_date}</div>
                </div>
                <div>
                  <span className="text-gray-600">Next Assessment:</span>
                  <div className="font-medium">{lessonPlan.next_major_assessment}</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-2xl" data-testid="lesson-plan-content">
            <CardContent className="p-8 space-y-6">
              <LessonSection title="Learner Outcomes/Objectives" content={lessonPlan.learner_outcomes} />
              <LessonSection title="Standards" content={lessonPlan.standards} />
              <LessonSection title="Materials Needed" content={lessonPlan.materials_needed} />
              <LessonSection title="Anticipatory Set" content={lessonPlan.anticipatory_set} />
              <LessonSection title="Teaching the Lesson" content={lessonPlan.teaching_lesson} />
              <LessonSection title="Modeling" content={lessonPlan.modeling} />
              <LessonSection title="Instructional Strategies" content={lessonPlan.instructional_strategies} />
              <LessonSection title="Check for Understanding" content={lessonPlan.check_understanding} />
              <LessonSection title="Guided Practice/Monitoring" content={lessonPlan.guided_practice} />
              <LessonSection title="Independent Practice" content={lessonPlan.independent_practice} />
              <LessonSection title="Closure" content={lessonPlan.closure} />
              <LessonSection title="Formative Assessment" content={lessonPlan.formative_assessment} />
              <LessonSection title="Extended Activities" content={lessonPlan.extended_activities} isBold />
              <LessonSection title="Review and Reteach Activities" content={lessonPlan.review_reteach} isBold />
              <LessonSection title="Early Finishers Activities" content={lessonPlan.early_finishers} isBold />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewLessonPlan;