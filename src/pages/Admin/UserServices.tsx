
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, BarChart3, CreditCard, MessageSquare, Plus, RefreshCw, Search, Users, Wallet, CheckSquare, Square, Filter, MoreVertical, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useState } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AlertDialog from '../../components/ui/modal/AlertDialog';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper for headers
const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// API Functions
const fetchUsers = async (filters: SearchFilters) => {
  const params = new URLSearchParams();
  if (filters.query) params.append('query', filters.query);
  if (filters.plan) params.append('plan', filters.plan);
  if (filters.is_active !== null) params.append('is_active', filters.is_active.toString());
  params.append('skip', filters.skip.toString());
  params.append('limit', filters.limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/search?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
};

const fetchSystemStats = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/system/stats`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch system stats');
  }

  return response.json();
};

const fetchSMSAnalytics = async (days: number = 30) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/analytics/sms-overview?days=${days}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch SMS analytics');
  }

  return response.json();
};

const addUserBalance = async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/add-balance`, {
    method: 'POST',
    headers: getHeaders(),
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
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to ${endpoint} user`);
  }

  return response.json();
};

const bulkUpdateUserPlan = async ({ userIds, newPlan }: { userIds: string[]; newPlan: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/bulk-update-plan?new_plan=${newPlan}`, {
    method: 'POST',
    headers: getHeaders(),
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
  plan?: string;
  wallet_balance?: number;
  sms_sent?: number;
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

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
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

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const queryClient = useQueryClient();

  // Real API calls
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery<User[]>({
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

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const topupMutation = useMutation({
    mutationFn: addUserBalance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setShowTopupModal(false);
      setTopupAmount('');
      setSelectedUser(null);
      showAlert('Success', `Balance added successfully! New balance: UGX ${data.balance_after}`, 'success');
    },
    onError: (error) => {
      showAlert('Error', `Failed to add balance: ${error.message}`, 'error');
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      showAlert('Success', data.message || 'User status updated successfully', 'success');
    },
    onError: (error) => {
      showAlert('Error', `Failed to update user status: ${error.message}`, 'error');
    }
  });

  const bulkUpdatePlanMutation = useMutation({
    mutationFn: bulkUpdateUserPlan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setSelectedUsers([]);
      showAlert('Success', data.message || 'User plans updated successfully', 'success');
    },
    onError: (error) => {
      showAlert('Error', `Failed to update user plans: ${error.message}`, 'error');
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

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage users, analytics, and system operations</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: systemStats?.total_users || 0, icon: Users, color: 'blue', change: '+12%' },
            { label: 'Active Users', value: systemStats?.active_users || 0, icon: Activity, color: 'emerald', change: '+5%' },
            { label: 'SMS Sent', value: systemStats?.total_sms_sent || 0, icon: MessageSquare, color: 'violet', change: '+24%' },
            { label: 'Transactions', value: systemStats?.total_transactions || 0, icon: CreditCard, color: 'amber', change: '+8%' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value.toLocaleString()}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                <span className="text-green-600 dark:text-green-400 flex items-center font-medium">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {stat.change}
                </span>
                <span className="text-gray-400 ml-2">from last month</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`${activeTab === 'users'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
          >
            <Users className="w-4 h-4" />
            Users Management
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${activeTab === 'analytics'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Stats
          </button>
        </nav>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters Toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Search users..."
                value={searchFilters.query}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <select
                value={searchFilters.plan}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, plan: e.target.value }))}
                className="block pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Plans</option>
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>

              <select
                value={searchFilters.is_active === null ? '' : searchFilters.is_active.toString()}
                onChange={(e) => setSearchFilters(prev => ({
                  ...prev,
                  is_active: e.target.value === '' ? null : e.target.value === 'true'
                }))}
                className="block pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <Button
                onClick={handleSearch}
                disabled={usersLoading}
                variant="primary"
                size="sm"
                className="whitespace-nowrap"
              >
                {usersLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Bulk Actions Banner */}
          {selectedUsers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
                <span className="bg-blue-100 dark:bg-blue-800 p-1 rounded">
                  <CheckSquare className="w-4 h-4" />
                </span>
                <span className="font-medium">{selectedUsers.length} selected</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkUpdatePlanMutation.mutate({ userIds: selectedUsers, newPlan: e.target.value });
                      e.target.value = '';
                    }
                  }}
                  disabled={bulkUpdatePlanMutation.isPending}
                  className="text-sm border-0 bg-white dark:bg-gray-800 rounded-lg py-1.5 pl-3 pr-8 ring-1 ring-blue-200 dark:ring-blue-700 focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="">Change Plan...</option>
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
                <Button
                  onClick={() => setSelectedUsers([])}
                  variant="primary"
                  size="sm"
                  className="text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left w-10">
                      <button
                        onClick={() => {
                          if (selectedUsers.length === users.length && users.length > 0) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map(u => u.id));
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                      >
                        {selectedUsers.length === users.length && users.length > 0 ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wallet</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SMS Sent</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <LoadingSpinner message='Loading users...' />
                      </td>
                    </tr>
                  ) : usersError ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-red-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6" />
                          <span>Failed to load users. Please try again.</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 opacity-20" />
                          <span>No users found matching your filters.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (selectedUsers.includes(user.id)) {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              } else {
                                setSelectedUsers(prev => [...prev, user.id]);
                              }
                            }}
                            className={`transition-colors ${selectedUsers.includes(user.id) ? 'text-blue-600 dark:text-blue-500' : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400'}`}
                          >
                            {selectedUsers.includes(user.id) ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                              {getInitials(user.full_name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.full_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                            {user.plan_sub || user.plan || 'Basic'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                            <span className="text-gray-400 dark:text-gray-500 text-xs">UGX</span>
                            {user.wallet_balance?.toLocaleString() || parseFloat(user.wallet || '0').toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                          {user.total_sms_sent || user.sms_sent || 0}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span className={`text-sm font-medium ${user.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowTopupModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                              title="Add Balance"
                            >
                              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              onClick={() => toggleUserStatusMutation.mutate({
                                userId: user.id,
                                activate: !user.is_active
                              })}
                              variant="outline"
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-full ${user.is_active
                                ? 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}
                              disabled={toggleUserStatusMutation.isPending}
                              title={user.is_active ? 'Deactivate User' : 'Activate User'}
                            >
                              {toggleUserStatusMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SMS Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  SMS Overview (30 Days)
                </h3>
                {analyticsLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
              </div>

              {analyticsLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              ) : analyticsError ? (
                <div className="text-center py-8 text-red-500">Failed to load analytics</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Total SMS Sent</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{smsAnalytics?.total_sms_sent?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Total Cost</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">UGX {smsAnalytics?.total_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                    <span className="text-green-700 dark:text-green-300 font-medium">Success Rate</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-300">{smsAnalytics?.failed_sms / smsAnalytics?.total_sms_sent * 100 || 0}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 text-center">
                      <span className="block text-sm text-green-600 dark:text-green-400 mb-1">Successful</span>
                      <span className="block text-xl font-bold text-green-700 dark:text-green-300">{smsAnalytics?.failed_sms?.toLocaleString() || 0}</span>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 text-center">
                      <span className="block text-sm text-red-600 dark:text-red-400 mb-1">Failed</span>
                      <span className="block text-xl font-bold text-red-700 dark:text-red-300">{smsAnalytics?.successful_sms?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Users */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Top SMS Users
              </h3>
              <div className="space-y-4">
                {analyticsLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                    ))}
                  </div>
                ) : analyticsError ? (
                  <div className="text-center py-8 text-red-500">Failed to load top users</div>
                ) : smsAnalytics?.top_users?.length > 0 ? (
                  smsAnalytics.top_users.map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{user.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{user.sms_count.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SMS sent</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No top users data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Users by Plan</h3>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            ) : statsError ? (
              <div className="text-center py-8 text-red-500">Failed to load plan distribution</div>
            ) : systemStats?.users_by_plan ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(systemStats.users_by_plan).map(([plan, count]) => (
                  <div key={plan} className="flex flex-col items-center justify-center p-6 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{(count as number).toLocaleString()}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{plan}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No plan data available</div>
            )}
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {showTopupModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add Balance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Adding funds to <span className="font-medium text-gray-900 dark:text-white">{selectedUser.full_name}</span>'s wallet.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (UGX)
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setShowTopupModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTopup}
                  disabled={!topupAmount || topupMutation.isPending}
                  variant="primary"
                  className="flex-1"
                >
                  {topupMutation.isPending ? (
                    <LoadingSpinner />
                  ) : (
                    'Confirm Add'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
}

export default UserServices;