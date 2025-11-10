import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminReviewQueue = ({ user }) => {
  const navigate = useNavigate();
  const [pendingPlans, setPendingPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch pending plans
      const pendingRes = await fetch(`${BACKEND_URL}/api/admin/lesson-plans/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingPlans(pendingData);
      }
      
      // Fetch all plans
      const allRes = await fetch(`${BACKEND_URL}/api/admin/lesson-plans/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (allRes.ok) {
        const allData = await allRes.json();
        setAllPlans(allData);
      }
    } catch (error) {
      toast.error('Error loading plans');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (planId, status) => {
    if (!feedback.trim() && status === 'rejected') {
      toast.error('Please provide feedback for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/lesson-plans/${planId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, feedback })
      });

      if (response.ok) {
        toast.success(`Lesson plan ${status}!`);
        setSelectedPlan(null);
        setFeedback('');
        fetchPlans();
      } else {
        toast.error('Failed to submit review');
      }
    } catch (error) {
      toast.error('Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    
    const icons = {
      draft: <Clock className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />
    };

    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading...</div>
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
            Lesson Plan Review Queue
          </h1>
          <p className="text-gray-600 mt-2">Review and approve teacher submissions</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Review ({pendingPlans.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Plans ({allPlans.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Plans */}
          <TabsContent value="pending">
            {pendingPlans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No pending submissions
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingPlans.map((plan) => (
                  <Card key={plan.id} className="shadow-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{plan.textbook}</CardTitle>
                          <CardDescription>
                            Teacher: {plan.teacher_name} ({plan.teacher_email})
                          </CardDescription>
                          <div className="text-sm text-gray-600 mt-2">
                            Submitted: {new Date(plan.submitted_at).toLocaleString()}
                          </div>
                        </div>
                        {getStatusBadge(plan.submission_status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="text-sm"><strong>Lesson Range:</strong> {plan.lesson_range}</div>
                        <div className="text-sm"><strong>Dates:</strong> {plan.start_date} to {plan.end_date}</div>
                        <div className="text-sm"><strong>Days:</strong> {plan.daily_plans.length}</div>
                      </div>

                      {selectedPlan === plan.id ? (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Admin Feedback</label>
                            <Textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Provide feedback for the teacher..."
                              rows={4}
                              className="w-full"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview(plan.id, 'approved')}
                              disabled={submitting}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReview(plan.id, 'rejected')}
                              disabled={submitting}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPlan(null);
                                setFeedback('');
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/lesson-plan/${plan.id}`)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Plan
                          </Button>
                          <Button
                            onClick={() => setSelectedPlan(plan.id)}
                            className="flex-1"
                          >
                            Review
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Plans */}
          <TabsContent value="all">
            <div className="grid gap-4">
              {allPlans.map((plan) => (
                <Card key={plan.id} className="shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.textbook}</CardTitle>
                        <CardDescription>
                          Teacher: {plan.teacher_name} ({plan.teacher_email})
                        </CardDescription>
                        <div className="text-sm text-gray-600 mt-2">
                          Created: {new Date(plan.created_at).toLocaleString()}
                        </div>
                      </div>
                      {getStatusBadge(plan.submission_status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="text-sm"><strong>Lesson Range:</strong> {plan.lesson_range}</div>
                      <div className="text-sm"><strong>Dates:</strong> {plan.start_date} to {plan.end_date}</div>
                      <div className="text-sm"><strong>Days:</strong> {plan.daily_plans.length}</div>
                      {plan.admin_feedback && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border">
                          <div className="text-sm font-medium mb-1">Admin Feedback:</div>
                          <div className="text-sm text-gray-700">{plan.admin_feedback}</div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => navigate(`/lesson-plan/${plan.id}`)}
                      variant="outline"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminReviewQueue;
