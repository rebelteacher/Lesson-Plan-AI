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
    toast.info('Preparing your document...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/lesson-plans/${id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        
        // Check if blob has content
        if (blob.size === 0) {
          toast.error('Export file is empty. Please try again.');
          return;
        }
        
        console.log('Blob created:', blob.size, 'bytes');
        
        // Use different download method based on browser support
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          // For IE/Edge
          window.navigator.msSaveOrOpenBlob(blob, `lesson_plan_${new Date().getTime()}.docx`);
          toast.success('Document downloaded! Check your Downloads folder.');
        } else {
          // For modern browsers
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `LessonPlan_${lessonPlan.textbook.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
          
          document.body.appendChild(a);
          
          // Force download with user gesture
          setTimeout(() => {
            a.click();
            toast.success('Download started! Check your Downloads folder or browser download manager.');
            console.log('Download triggered');
          }, 100);
          
          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(url);
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
          }, 2000);
        }
      } else {
        const errorText = await response.text();
        console.error('Export error:', errorText);
        toast.error('Failed to export lesson plan');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting lesson plan: ' + error.message);
    }
  };

  const copyToClipboard = async () => {
    if (!lessonPlan || !lessonPlan.daily_plans) return;
    
    let text = `Lesson Plan: ${lessonPlan.textbook}\n`;
    text += `Date Range: ${lessonPlan.start_date} to ${lessonPlan.end_date}\n`;
    text += `Lesson Range: ${lessonPlan.lesson_range}\n\n`;
    
    lessonPlan.daily_plans.forEach(day => {
      text += `\n========== ${day.day_name} - ${day.day_date} ==========\n\n`;
      const sections = [
        { title: 'Learner Outcomes/Objectives', content: day.learner_outcomes },
        { title: 'Standards', content: day.standards },
        { title: 'Materials Needed', content: day.materials_needed },
        { title: 'Anticipatory Set', content: day.anticipatory_set },
        { title: 'Teaching the Lesson', content: day.teaching_lesson },
        { title: 'Modeling', content: day.modeling },
        { title: 'Instructional Strategies', content: day.instructional_strategies },
        { title: 'Check for Understanding', content: day.check_understanding },
        { title: 'Guided Practice/Monitoring', content: day.guided_practice },
        { title: 'Independent Practice', content: day.independent_practice },
        { title: 'Closure', content: day.closure },
        { title: 'Summative Assessment', content: day.summative_assessment },
        { title: 'Formative Assessment', content: day.formative_assessment },
        { title: '**Extended Activities**', content: day.extended_activities },
        { title: '**Review and Reteach Activities**', content: day.review_reteach },
        { title: '**Early Finishers Activities**', content: day.early_finishers }
      ];
      
      sections.forEach(s => {
        text += `${s.title}\n${s.content || 'N/A'}\n\n`;
      });
    });
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Lesson plan copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Lesson plan copied to clipboard!');
      } catch (err) {
        toast.error('Unable to copy to clipboard. Please copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading lesson plan...</div>
      </div>
    );
  }

  if (!lessonPlan) return null;

  const DaySection = ({ title, content, isBold }) => (
    <div className="mb-4">
      <h4 className={`text-lg font-semibold mb-2 ${isBold ? 'text-indigo-700' : 'text-gray-800'}`} style={{ fontFamily: 'Playfair Display, serif' }}>
        {title}
      </h4>
      <div className="pl-3 border-l-2 border-indigo-200">
        <p className="text-gray-700 whitespace-pre-wrap text-sm">{content || 'N/A'}</p>
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
              className="flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
            <Button 
              onClick={handleExport} 
              data-testid="export-lesson-plan-btn"
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Download Word
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

          {lessonPlan.daily_plans && lessonPlan.daily_plans.map((dayPlan, index) => (
            <Card key={index} className="shadow-2xl mb-6" data-testid={`day-plan-${index}`}>
              <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100">
                <CardTitle className="text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                  {dayPlan.day_name} - {dayPlan.day_date}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <DaySection title="Learner Outcomes/Objectives" content={dayPlan.learner_outcomes} />
                <DaySection title="Standards" content={dayPlan.standards} />
                <DaySection title="Materials Needed" content={dayPlan.materials_needed} />
                <DaySection title="Anticipatory Set" content={dayPlan.anticipatory_set} />
                <DaySection title="Teaching the Lesson" content={dayPlan.teaching_lesson} />
                <DaySection title="Modeling" content={dayPlan.modeling} />
                <DaySection title="Instructional Strategies" content={dayPlan.instructional_strategies} />
                <DaySection title="Check for Understanding" content={dayPlan.check_understanding} />
                <DaySection title="Guided Practice/Monitoring" content={dayPlan.guided_practice} />
                <DaySection title="Independent Practice" content={dayPlan.independent_practice} />
                <DaySection title="Closure" content={dayPlan.closure} />
                <DaySection title="Summative Assessment" content={dayPlan.summative_assessment} />
                <DaySection title="Formative Assessment" content={dayPlan.formative_assessment} />
                <DaySection title="Extended Activities" content={dayPlan.extended_activities} isBold />
                <DaySection title="Review and Reteach Activities" content={dayPlan.review_reteach} isBold />
                <DaySection title="Early Finishers Activities" content={dayPlan.early_finishers} isBold />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewLessonPlan;
