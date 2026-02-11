
import { SystemStats, UserSearchResult } from '@/lib/api/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BarChart3, CheckSquare, CreditCard, MessageSquare, Plus, RefreshCw, Search, Square, Users } from 'lucide-react';
import { useState } from 'react';
import Button from '../../components/ui/button/Button';
import AlertDialog from '../../components/ui/modal/AlertDialog';

import { apiClient } from '@/lib/api/client';

// API Functions
const fetchUsers = async (filters: SearchFilters) => {
  const response = await apiClient.api.admin.moreAdminPrivilegesSearchUsers({
    query: filters.query || undefined,
    plan: filters.plan || undefined,
    isActive: filters.is_active,
    skip: filters.skip,
    limit: filters.limit
  });
  return response;
};

const fetchSystemStats = async () => {
  const response = await apiClient.api.admin.moreAdminPrivilegesGetSystemStatistics();
  return response;
};

const fetchSMSAnalytics = async (days: number = 30) => {
  const response = await apiClient.api.admin.moreAdminPrivilegesGetSmsAnalytics({
    days
  });
  return response as unknown as SMSAnalytics;
};

const addUserBalance = async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
  const response = await apiClient.api.admin.moreAdminPrivilegesAddBalanceToUser({
    userId,
    addBalanceRequest: {
      userId,
      amount,
      description,
      paymentMethod: 'admin_adjustment'
    }
  });
  return response;
};

const toggleUserStatus = async ({ userId, activate }: { userId: string; activate: boolean }) => {
  if (activate) {
    return await apiClient.api.admin.moreAdminPrivilegesActivateUser({ userId });
  } else {
    return await apiClient.api.admin.moreAdminPrivilegesDeactivateUser({ userId });
  }
};

const bulkUpdateUserPlan = async ({ userIds, newPlan }: { userIds: string[]; newPlan: string }) => {
  const response = await apiClient.api.admin.moreAdminPrivilegesBulkUpdateUserPlan({
    newPlan,
    requestBody: userIds
  });
  return response;
};

// Types
// User interface removed, using UserSearchResult
// SystemStats interface removed, using imported SystemStats

interface SearchFilters {
  query: string;
  plan: string;
  is_active: boolean | null;
  skip: number;
  limit: number;
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
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
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
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<UserSearchResult[]>({
    queryKey: ['users', searchFilters],
    queryFn: () => fetchUsers(searchFilters),
    staleTime: 30000, // 30 seconds
  });

  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: fetchSystemStats,
    staleTime: 60000, // 1 minute
  });

  const { data: smsAnalytics, isLoading: analyticsLoading, } = useQuery<SMSAnalytics>({
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
      showAlert('Success', `Balance added successfully! New balance: UGX ${data.balanceAfter}`, 'success');
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

  const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-200 border-l-2 ${activeTab === id
        ? 'bg-brand-50/50 border-brand-500 text-brand-600'
        : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? 'text-brand-500' : 'text-gray-400'}`} />
      <span className={`text-[11px] font-bold uppercase  ${activeTab === id ? 'text-brand-600' : 'text-gray-600 dark:text-gray-400'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Services</h1>
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-1 text-[10px] font-bold ">Administration / Services / Overview</p>
        </div>
        <Button
          onClick={handleRefreshAll}
          variant="outline"
          size="sm"
          startIcon={<RefreshCw className={`w-4 h-4 ${(usersLoading || statsLoading) ? 'animate-spin' : ''}`} />}
        >
          SYNC DATA
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 py-4 ">
          <SidebarItem id="users" label="User Management" icon={Users} />
          <SidebarItem id="analytics" label="Analytics & Stats" icon={BarChart3} />
          <div className="mt-8 px-6">
            <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6"></div>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-100 dark:border-gray-700">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-8">
          {activeTab === 'users' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Profile/Search Section */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 ">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">Advanced Search</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase  mb-2">Search Query</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="NAME, EMAIL, ID..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-25 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-bold  focus:ring-1 focus:ring-brand-500 outline-none"
                        value={searchFilters.query}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase  mb-2">Subscription Plan</label>
                    <select
                      value={searchFilters.plan}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, plan: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-25 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-bold  focus:ring-1 focus:ring-brand-500 outline-none appearance-none"
                    >
                      <option value="">ALL PLANS</option>
                      <option value="Basic">BASIC</option>
                      <option value="Standard">STANDARD</option>
                      <option value="Premium">PREMIUM</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase  mb-2">Account Status</label>
                      <select
                        value={searchFilters.is_active === null ? '' : searchFilters.is_active.toString()}
                        onChange={(e) => setSearchFilters(prev => ({
                          ...prev,
                          is_active: e.target.value === '' ? null : e.target.value === 'true'
                        }))}
                        className="w-full px-4 py-3 bg-gray-25 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-bold  focus:ring-1 focus:ring-brand-500 outline-none appearance-none"
                      >
                        <option value="">ALL STATUSES</option>
                        <option value="true">ACTIVE ONLY</option>
                        <option value="false">INACTIVE ONLY</option>
                      </select>
                    </div>

                  </div>
                </div>
              </div>

              {/* Bulk Actions if any */}
              {selectedUsers.length > 0 && (
                <div className="bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800 p-4 flex items-center justify-between ">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-brand-600" />
                    <span className="text-[10px] font-bold uppercase  text-brand-700 dark:text-brand-400">{selectedUsers.length} MEMBERS SELECTED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          bulkUpdatePlanMutation.mutate({ userIds: selectedUsers, newPlan: e.target.value });
                          e.target.value = '';
                        }
                      }}
                      className="bg-white dark:bg-gray-800  border-brand-100 dark:border-brand-800 py-1.5 px-3 text-[9px] font-bold uppercase  outline-none"
                    >
                      <option value="">BULK CHANGE PLAN</option>
                      <option value="Basic">BASIC</option>
                      <option value="Standard">STANDARD</option>
                      <option value="Premium">PREMIUM</option>
                    </select>
                    <button onClick={() => setSelectedUsers([])} className="text-[9px] font-bold uppercase  text-gray-400 hover:text-gray-600 px-3">CANCEL</button>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800  overflow-hidden">
                <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase p-8 pb-4">Service Directory</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-25 dark:bg-gray-800/50 border-y border-gray-50 dark:border-gray-800">
                        <th className="px-8 py-4 text-left w-12">
                          <button
                            onClick={() => {
                              if (selectedUsers.length === users.length && users.length > 0) {
                                setSelectedUsers([]);
                              } else {
                                setSelectedUsers(users.map(u => u.id));
                              }
                            }}
                            className="text-gray-300 hover:text-brand-500"
                          >
                            {selectedUsers.length === users.length && users.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase  text-left">Member Identity</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase  text-left">License Plan</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase  text-left">Wallet Balance</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase  text-left">Account Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase  text-right">Service Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {usersLoading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i}><td colSpan={6} className="px-8 py-4"><div className="h-8 bg-gray-50 dark:bg-gray-800 animate-pulse w-full"></div></td></tr>
                        ))
                      ) : users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-25 dark:hover:bg-gray-800/40 transition-colors group">
                          <td className="px-8 py-6">
                            <button
                              onClick={() => {
                                if (selectedUsers.includes(u.id)) {
                                  setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                } else {
                                  setSelectedUsers(prev => [...prev, u.id]);
                                }
                              }}
                              className={`${selectedUsers.includes(u.id) ? 'text-brand-600' : 'text-gray-200 group-hover:text-gray-400'}`}
                            >
                              {selectedUsers.includes(u.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                                {getInitials(u.fullName || '')}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase ">{u.fullName}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 lowercase">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-bold uppercase  text-indigo-600 dark:text-indigo-400">{u.planSub || 'BASIC'}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-xs font-bold text-gray-900 dark:text-white space-x-1">
                              <span className="text-gray-300">UGX</span>
                              <span>{parseFloat(u.wallet || '0').toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase  ${u.isActive ? 'bg-success-50 text-success-700 dark:bg-success-500/10' : 'bg-red-50 text-red-700 dark:bg-red-500/10'}`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setSelectedUser(u); setShowTopupModal(true); }}
                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                title="Add Funds"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleUserStatusMutation.mutate({ userId: u.id, activate: !u.isActive })}
                                className={`p-2 transition-colors ${u.isActive ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-success-600 hover:bg-success-50'}`}
                                disabled={toggleUserStatusMutation.isPending}
                                title={u.isActive ? 'Deactivate' : 'Activate'}
                              >
                                <RefreshCw className={`w-4 h-4 ${toggleUserStatusMutation.isPending && toggleUserStatusMutation.variables?.userId === u.id ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Members', value: systemStats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Active Sessions', value: systemStats?.activeUsers || 0, icon: Activity, color: 'text-success-600', bg: 'bg-success-50' },
                  { label: 'Messages Sent', value: systemStats?.totalSmsSent || 0, icon: MessageSquare, color: 'text-brand-600', bg: 'bg-brand-50' },
                  { label: 'System Revenue', value: systemStats?.totalTransactions || 0, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 ">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase  mb-1">{stat.label}</p>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</h3>
                      </div>
                      <div className={`p-3 rounded-none ${stat.bg} ${stat.color} dark:bg-gray-800`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Detailed Analytics */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 ">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase  mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">Operational Health</h2>
                  {analyticsLoading ? (
                    <div className="h-64 bg-gray-50 dark:bg-gray-800 animate-pulse"></div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 uppercase ">Total Transmission</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{smsAnalytics?.total_sms_sent?.toLocaleString() || 0} UNI</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-b border-gray-50 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 uppercase ">Aggregate Cost</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">UGX {smsAnalytics?.total_cost?.toLocaleString() || 0}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-6 bg-success-50/50 dark:bg-success-900/5 border border-success-100 dark:border-success-900/20">
                          <span className="block text-[9px] font-bold text-success-600 uppercase  mb-2">Validated</span>
                          <span className="text-xl font-bold text-success-700 dark:text-success-400">{smsAnalytics?.successful_sms?.toLocaleString() || 0}</span>
                        </div>
                        <div className="p-6 bg-red-50/50 dark:bg-red-900/5 border border-red-100 dark:border-red-900/20">
                          <span className="block text-[9px] font-bold text-red-600 uppercase  mb-2">Declined</span>
                          <span className="text-xl font-bold text-red-700 dark:text-red-400">{smsAnalytics?.failed_sms?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 ">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase  mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">Top Service Users</h2>
                  <div className="space-y-4">
                    {smsAnalytics?.top_users?.map((user, idx) => (
                      <div key={user.user_id} className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-gray-800 last:border-0 p-4 hover:bg-gray-25 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] font-bold text-gray-300 w-4">0{idx + 1}</div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase ">{user.full_name}</p>
                            <p className="text-[10px] text-gray-400 lowercase">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-brand-600 uppercase tabular-nums">{user.sms_count.toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-gray-300 uppercase ">TRANSMISSIONS</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Topup Modal Redesign */}
      {showTopupModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[999] p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-10 w-full max-w-md shadow-theme-xl">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-[0.3em] mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">Adjust Member Funds</h3>
            <div className="mb-8">
              <p className="text-[10px] font-bold text-gray-400 uppercase  mb-1">Target Account</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase ">{selectedUser.fullName}</p>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase  mb-2">Authorization Credits (UGX)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-4 bg-gray-25 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm font-bold  focus:ring-1 focus:ring-brand-500 outline-none"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setShowTopupModal(false)} className="flex-1 py-4 text-[10px] font-bold  uppercase">ABORT</Button>
                <Button
                  onClick={handleTopup}
                  disabled={!topupAmount || topupMutation.isPending}
                  className="flex-1 py-4 text-[10px] font-bold  uppercase shadow-none rounded-none"
                >
                  {topupMutation.isPending ? 'PROCESSING...' : 'AUTHORIZE'}
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