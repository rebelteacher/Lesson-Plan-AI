import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StandardsCoverage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState(null);
  const [timeframe, setTimeframe] = useState('quarter'); // quarter, semester, year

  useEffect(() => {
    fetchCoverage();
  }, [timeframe]);

  const fetchCoverage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/analytics/standards-coverage?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCoverage(data);
      }
    } catch (error) {
      toast.error('Error loading coverage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading coverage data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
                Standards Coverage
              </h1>
              <p className="text-gray-600 mt-2">Track which standards have been assessed</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant={timeframe === 'quarter' ? 'default' : 'outline'} onClick={() => setTimeframe('quarter')}>
                Quarter
              </Button>
              <Button variant={timeframe === 'semester' ? 'default' : 'outline'} onClick={() => setTimeframe('semester')}>
                Semester
              </Button>
              <Button variant={timeframe === 'year' ? 'default' : 'outline'} onClick={() => setTimeframe('year')}>
                Year
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">{coverage?.assessed_count || 0}</div>
                  <div className="text-sm text-gray-600">Standards Assessed</div>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-600">{coverage?.not_assessed_count || 0}</div>
                  <div className="text-sm text-gray-600">Not Yet Assessed</div>
                </div>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{coverage?.coverage_percentage || 0}%</div>
                  <div className="text-sm text-gray-600">Coverage Rate</div>
                </div>
                <AlertCircle className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessed Standards */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessed Standards</CardTitle>
            <CardDescription>Standards you've already tested</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {coverage?.assessed?.map((std, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-mono font-semibold text-green-700">{std.standard}</span>
                  </div>
                  <div className="text-xs text-gray-600">Tested {std.times_assessed} time(s)</div>
                  <div className="text-xs text-gray-600">Avg: {std.average_score.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gap Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Gaps</CardTitle>
            <CardDescription>Standards that haven't been assessed yet</CardDescription>
          </CardHeader>
          <CardContent>
            {coverage?.not_assessed && coverage.not_assessed.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {coverage.not_assessed.map((std, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-red-50">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="font-mono font-semibold text-red-700">{std}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                🎉 All standards have been assessed!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StandardsCoverage;
