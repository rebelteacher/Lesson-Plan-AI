import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, FileText, UserCheck, UserX, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (statsRes.ok && usersRes.ok) {
        setStats(await statsRes.json());
        setUsers(await usersRes.json());
      }
    } catch (error) {
      toast.error('Error loading admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('User activated');
        fetchData();
      } else {
        toast.error('Failed to activate user');
      }
    } catch (error) {
      toast.error('Error activating user');
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('User deactivated');
        fetchData();
      } else {
        toast.error('Failed to deactivate user');
      }
    } catch (error) {
      toast.error('Error deactivating user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
        <div className="text-2xl text-gray-600">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#4c1d95' }}>
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage users and monitor system usage</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/admin/invitation-codes'} 
              data-testid="manage-codes-btn"
              className="flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <Users className="w-4 h-4" />
              Manage Invitation Codes
            </Button>
            <Button 
              onClick={onLogout} 
              data-testid="admin-logout-btn"
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-600" />
                <div className="text-3xl font-bold" data-testid="admin-total-users">{stats?.total_users || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-600" />
                <div className="text-3xl font-bold" data-testid="admin-active-users">{stats?.active_users || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Inactive Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <UserX className="w-8 h-8 text-red-600" />
                <div className="text-3xl font-bold" data-testid="admin-inactive-users">{stats?.inactive_users || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-600" />
                <div className="text-3xl font-bold" data-testid="admin-total-plans">{stats?.total_lesson_plans || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all teacher accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.state || 'N/A'}</TableCell>
                      <TableCell>{u.lesson_plan_count}</TableCell>
                      <TableCell className="text-sm">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Button 
                            onClick={() => handleDeactivate(u.id)} 
                            data-testid={`deactivate-user-btn-${u.id}`}
                            variant="destructive" 
                            size="sm"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleActivate(u.id)} 
                            data-testid={`activate-user-btn-${u.id}`}
                            variant="default" 
                            size="sm"
                          >
                            Activate
                          </Button>
                        )}
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

export default AdminDashboard;