import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Plus, Trash2, Ban } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const InvitationCodes = ({ user }) => {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(1);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/invitation-codes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCodes(data);
      }
    } catch (error) {
      toast.error('Error loading invitation codes');
    } finally {
      setLoading(false);
    }
  };

  const generateCodes = async () => {
    if (count < 1 || count > 50) {
      toast.error('Please enter a number between 1 and 50');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/invitation-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ count: parseInt(count) })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Generated ${data.count} invitation code(s)`);
        fetchCodes();
        setCount(1);
      } else {
        toast.error('Failed to generate codes');
      }
    } catch (error) {
      toast.error('Error generating codes');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code) => {
    const inviteLink = `${window.location.origin}?code=${code}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invitation link copied to clipboard!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Invitation link copied to clipboard!');
      } catch (err) {
        toast.error('Unable to copy. Link: ' + inviteLink);
      }
      document.body.removeChild(textArea);
    }
  };

  const deactivateCode = async (code) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/invitation-codes/${code}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Code deactivated');
        fetchCodes();
      } else {
        toast.error('Failed to deactivate code');
      }
    } catch (error) {
      toast.error('Error deactivating code');
    }
  };

  const deleteCode = async (code) => {
    if (!window.confirm('Are you sure you want to delete this invitation code?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/invitation-codes/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Code deleted');
        fetchCodes();
      } else {
        toast.error('Failed to delete code');
      }
    } catch (error) {
      toast.error('Error deleting code');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const activeCount = codes.filter(c => !c.used_by && c.is_active).length;
  const usedCount = codes.filter(c => c.used_by).length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <Button 
          onClick={() => navigate('/admin')} 
          variant="ghost" 
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
            Invitation Codes
          </h1>
          <p className="text-gray-600">Generate and manage invitation codes for new teachers</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Used Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{usedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{codes.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl mb-8">
          <CardHeader>
            <CardTitle>Generate New Codes</CardTitle>
            <CardDescription>Create invitation codes to send to new teachers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="count">Number of Codes</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="50"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder="1"
                />
              </div>
              <Button 
                onClick={generateCodes}
                disabled={generating}
                className="flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                <Plus className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate Codes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>All Invitation Codes</CardTitle>
            <CardDescription>Copy the link to send to teachers via email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Used Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.code}>
                      <TableCell className="font-mono font-bold">{code.code}</TableCell>
                      <TableCell>
                        {code.used_by ? (
                          <Badge variant="secondary">Used</Badge>
                        ) : code.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.used_by ? (
                          <div>
                            <div className="font-medium">{code.used_by_name}</div>
                            <div className="text-sm text-gray-500">{code.used_by_email}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(code.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {code.used_at ? new Date(code.used_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!code.used_by && code.is_active && (
                            <>
                              <Button
                                onClick={() => copyCode(code.code)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Link
                              </Button>
                              <Button
                                onClick={() => deactivateCode(code.code)}
                                size="sm"
                                variant="outline"
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {!code.used_by && (
                            <Button
                              onClick={() => deleteCode(code.code)}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvitationCodes;
