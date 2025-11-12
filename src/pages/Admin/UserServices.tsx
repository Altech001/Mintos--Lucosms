

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, BarChart3, DollarSign, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import Checkbox from '../../components/form/input/Checkbox';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// API Base URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Get token from localStorage or context
const getAuthToken = () => {
  // Replace with your actual token management
  return localStorage.getItem('authToken') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjM2MzIyMzYsInN1YiI6IjU0NjRkNjBhLTI0MzgtNGNmZi05N2MzLWNmOGI4MTFhNWYxYSJ9.NfQMHEjeJEijQ15EXCepdO8uSWGDx74nuQyA0Gs1aDo';
};

// API Functions
const fetchUsers = async (filters: SearchFilters) => {
  const params = new URLSearchParams();
  if (filters.query) params.append('query', filters.query);
  if (filters.plan) params.append('plan', filters.plan);
  if (filters.is_active !== null) params.append('is_active', filters.is_active.toString());
  params.append('skip', filters.skip.toString());
  params.append('limit', filters.limit.toString());

  const response = await fetch(`${API_BASE_URL}/admin/users/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
};

const fetchSystemStats = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/system/stats`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch system stats');
  }

  return response.json();
};

const fetchSMSAnalytics = async (days: number = 30) => {
  const response = await fetch(`${API_BASE_URL}/admin/analytics/sms-overview?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch SMS analytics');
  }

  return response.json();
};

const addUserBalance = async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/add-balance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      amount,
      description,
      payment_method: 'admin_adjustment'
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add balance');
  }

  return response.json();
};

const toggleUserStatus = async ({ userId, activate }: { userId: string; activate: boolean }) => {
  const endpoint = activate ? 'activate' : 'deactivate';
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to ${endpoint} user`);
  }

  return response.json();
};

const bulkUpdateUserPlan = async ({ userIds, newPlan }: { userIds: string[]; newPlan: string }) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/bulk-update-plan?new_plan=${newPlan}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userIds),
  });

  if (!response.ok) {
    throw new Error('Failed to update user plans');
  }

  return response.json();
};

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  plan_sub: string;
  wallet: string;
  total_sms_sent: number;
  total_transactions: number;
  created_at: string | null;
}

interface SearchFilters {
  query: string;
  plan: string;
  is_active: boolean | null;
  skip: number;
  limit: number;
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_transactions: number;
  total_sms_sent: number;
  total_revenue: number;
  users_by_plan: Record<string, number>;
  recent_signups: number;
}

interface SMSAnalytics {
  period_days: number;
  total_sms_sent: number;
  total_cost: number;
  success_rate: number;
  successful_sms: number;
  failed_sms: number;
  top_users: Array<{
    user_id: string;
    email: string;
    full_name: string;
    sms_count: number;
    total_cost: number;
  }>;
  status_breakdown: Record<string, number>;
}

function UserServices() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    plan: '',
    is_active: null,
    skip: 0,
    limit: 100
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDescription] = useState('Admin credit adjustment');
  const [activeTab, setActiveTab] = useState('users');

  const queryClient = useQueryClient();

  // Real API calls
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users', searchFilters],
    queryFn: () => fetchUsers(searchFilters),
    staleTime: 30000, // 30 seconds
  });

  const { data: systemStats, isLoading: statsLoading, error: statsError } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: fetchSystemStats,
    staleTime: 60000, // 1 minute
  });

  const { data: smsAnalytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<SMSAnalytics>({
    queryKey: ['smsAnalytics'],
    queryFn: () => fetchSMSAnalytics(30),
    staleTime: 60000, // 1 minute
  });

  const topupMutation = useMutation({
    mutationFn: addUserBalance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setShowTopupModal(false);
      setTopupAmount('');
      setSelectedUser(null);
      // Show success message
      alert(`Balance added successfully! New balance: UGX ${data.balance_after}`);
    },
    onError: (error) => {
      alert(`Failed to add balance: ${error.message}`);
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      alert(data.message || 'User status updated successfully');
    },
    onError: (error) => {
      alert(`Failed to update user status: ${error.message}`);
    }
  });

  const bulkUpdatePlanMutation = useMutation({
    mutationFn: bulkUpdateUserPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setSelectedUsers([]);
      alert(data.message || 'User plans updated successfully');
    },
    onError: (error) => {
      alert(`Failed to update user plans: ${error.message}`);
    }
  });

  const handleSearch = () => {
    refetchUsers();
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    queryClient.invalidateQueries({ queryKey: ['smsAnalytics'] });
  };

  const handleTopup = () => {
    if (selectedUser && topupAmount) {
      topupMutation.mutate({
        userId: selectedUser.id,
        amount: parseFloat(topupAmount),
        description: topupDescription
      });
    }
  };



  return (
    <ComponentCard title="User Services" desc="Manage users, analytics, and system operations">
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className=" rounded-xl dark:text-white">
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <Button
              onClick={handleRefreshAll}
              variant="outline"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setActiveTab('users')}
              variant='primary'
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'users' ? 'text-white' : 'backdrop-blur-sm'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Users
            </Button>
            <Button
              onClick={() => setActiveTab('analytics')}
              variant='outline'
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics' ? '' : ' backdrop-blur-sm'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Search Filters */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold dark:text-white">Search & Filter Users</h2>
              {usersError && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Error loading users
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Search Users
                </label>
                <div className="relative">
                  
                  <Input
                    type="text"
                    placeholder="&nbsp; Email, name, or ID"
                    value={searchFilters.query}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                  />
                  
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Plan Filter
                </label>
                <select
                  value={searchFilters.plan}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, plan: e.target.value }))}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                > 
                  <option value="">All Plans</option>
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Status Filter
                </label>
                <select
                  value={searchFilters.is_active === null ? '' : searchFilters.is_active.toString()}
                  onChange={(e) => setSearchFilters(prev => ({ 
                    ...prev, 
                    is_active: e.target.value === '' ? null : e.target.value === 'true' 
                  }))}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={usersLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 shadow-lg"
                >
                  {usersLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className=" border border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex space-x-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        bulkUpdatePlanMutation.mutate({ userIds: selectedUsers, newPlan: e.target.value });
                        e.target.value = ''; 
                      }
                    }}
                    disabled={bulkUpdatePlanMutation.isPending}
                    className="border appearance-none rounded-lg border-gray-300 bg-transparent px-4 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400  focus:outline-hidden focus:ring-3  dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                    defaultValue=""
                  >
                    <option value="">Change Plan</option>
                    <option value="Basic">Basic</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                  <Button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(users.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      SMS Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex items-center justify-center">
                          <LoadingSpinner message='Searching...' />
                        </div>
                      </td>
                    </tr>
                  ) : usersError ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-red-500 dark:text-red-400">
                        <div className="flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Failed to load users
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-center">
                          <Users className="w-5 h-5 mr-2" />
                          No users found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <Checkbox 
                          checked={selectedUsers.includes(user.id)}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.full_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                            {user.plan || 'Basic'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          UGX {user.wallet_balance?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {user.sms_sent || 0}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active 
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowTopupModal(true);
                            }}
                            variant='outline'
                            size='sm'
                          >
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            Topup
                          </Button>
                          <Button
                            onClick={() => toggleUserStatusMutation.mutate({ 
                              userId: user.id, 
                              activate: !user.is_active 
                            })}
                            variant={user.is_active ? 'danger' : 'primary'}
                            size='sm'
                            disabled={toggleUserStatusMutation.isPending}
                          >
                            {toggleUserStatusMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              user.is_active ? 'Deactivate' : 'Activate'
                            )}

                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          {/* System Stats */}
          {statsLoading ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Loading system statistics...</span>
              </div>
            </div>
          ) : statsError ? (
            <div className="rounded-xl border border-red-200 dark:border-red-700 bg-white dark:bg-red-900/10 p-8">
              <div className="flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>Failed to load system statistics</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-100 to-blue-400 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-700 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{systemStats?.total_users || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-100 to-green-300 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-700 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Users</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{systemStats?.active_users || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-600 rounded-xl shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">SMS Sent</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{systemStats?.total_sms_sent || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl border border-yellow-200 dark:border-yellow-700 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-600 rounded-xl shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Transactions</p>
                    <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{systemStats?.total_transactions || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMS Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">SMS Overview (30 Days)</h3>
                {analyticsLoading && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
                {analyticsError && <AlertCircle className="w-5 h-5 text-red-500" />}
              </div>
              
              {analyticsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : analyticsError ? (
                <div className="text-center py-8 text-red-500 dark:text-red-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Failed to load SMS analytics</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Total SMS Sent</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{smsAnalytics?.total_sms_sent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Total Cost</span>
                    <span className="text-xl font-bold text-blue-900 dark:text-blue-100">UGX {smsAnalytics?.total_cost || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-green-700 dark:text-green-300 font-medium">Success Rate</span>
                    <span className="text-xl font-bold text-green-900 dark:text-green-100">{smsAnalytics?.success_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-green-700 dark:text-green-300 font-medium">Successful SMS</span>
                    <span className="text-xl font-bold text-green-900 dark:text-green-100">{smsAnalytics?.successful_sms || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-red-700 dark:text-red-300 font-medium">Failed SMS</span>
                    <span className="text-xl font-bold text-red-900 dark:text-red-100">{smsAnalytics?.failed_sms || 0}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-6">Top SMS Users</h3>
              <div className="space-y-3">
                {analyticsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse p-4 rounded-lg">
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="space-y-2 text-right">
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : analyticsError ? (
                  <div className="text-center py-8 text-red-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Failed to load top users</p>
                  </div>
                ) : smsAnalytics?.top_users?.length > 0 ? (
                  smsAnalytics.top_users.map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-100 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{user.full_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{user.sms_count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SMS sent</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p>No top users data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-6">Users by Plan</h3>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Failed to load plan distribution</p>
              </div>
            ) : systemStats?.users_by_plan ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(systemStats.users_by_plan).map(([plan, count]) => (
                  <div key={plan} className={`text-center p-6 rounded-xl border-2 hover:shadow-xl transition-shadow ${
                    plan === 'Premium' ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700' :
                    plan === 'Standard' ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700' :
                    'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className={`text-3xl font-bold mb-2 ${
                      plan === 'Premium' ? 'text-purple-600 dark:text-purple-400' :
                      plan === 'Standard' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {count as number}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{plan}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>No plan data available</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Topup Modal */}
      {showTopupModal && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add Balance - {selectedUser.full_name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (UGX)
              </label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowTopupModal(false);
                  setSelectedUser(null);
                  setTopupAmount('');
                }}
                variant="outline"
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTopup}
                disabled={!topupAmount || topupMutation.isPending}
                variant="primary"
                className="px-4 py-2"
              >
                {topupMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Add Balance'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ComponentCard>
  );
}

export default UserServices;