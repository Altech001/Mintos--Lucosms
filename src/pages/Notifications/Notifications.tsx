'use client';

import { useState, useMemo, useCallback } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Search, ChevronLeft, ChevronRight, Bell, BellOff, Check, CheckCheck, Trash2, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import useCustomToast from '../../hooks/useCustomToast';

interface SmsHistory {
  id: string;
  recipient: string;
  message: string;
  status: string;
  sms_count: number;
  cost: number;
  template_id: string | null;
  error_message: string | null;
  delivery_status: string;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  user_id: string;
  is_read?: boolean; // Local state for read/unread
}

interface SmsHistoryResponse {
  data: SmsHistory[];
  count: number;
}

export default function Notifications() {
  const { user, apiClient } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.isSuperuser;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});

  // Fetch SMS history
  const fetchSmsHistory = async (): Promise<SmsHistory[]> => {
    const token = apiClient.getToken();
    if (!token) return [];

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = isAdmin 
      ? `${baseUrl}/api/v1/historysms/all?skip=0&limit=100`
      : `${baseUrl}/api/v1/historysms/?skip=0&limit=100`;

    const response = await fetch(endpoint, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch SMS history');
    }

    const result: SmsHistoryResponse = await response.json();
    // Add read status from local state
    return result.data.map(sms => ({
      ...sms,
      is_read: readStatus[sms.id] ?? false
    }));
  };

  const { data: smsHistory = [], isLoading } = useQuery({
    queryKey: ['smsNotifications', user?.id, isAdmin, readStatus],
    queryFn: fetchSmsHistory,
    staleTime: 30_000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      // Update local state (in a real app, this would be an API call)
      const newReadStatus = { ...readStatus };
      notificationIds.forEach(id => {
        newReadStatus[id] = true;
      });
      setReadStatus(newReadStatus);
      return notificationIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsNotifications'] });
      showSuccessToast('Marked as read');
    },
    onError: () => {
      showErrorToast('Failed to mark as read');
    }
  });

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const newReadStatus = { ...readStatus };
      notificationIds.forEach(id => {
        newReadStatus[id] = false;
      });
      setReadStatus(newReadStatus);
      return notificationIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsNotifications'] });
      showSuccessToast('Marked as unread');
    },
    onError: () => {
      showErrorToast('Failed to mark as unread');
    }
  });

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      // In a real app, this would be an API call
      return notificationIds;
    },
    onSuccess: () => {
      setSelectedNotifications(new Set());
      queryClient.invalidateQueries({ queryKey: ['smsNotifications'] });
      showSuccessToast('Notifications deleted');
    },
    onError: () => {
      showErrorToast('Failed to delete notifications');
    }
  });

  // Filter SMS history based on search and read status
  const filteredHistory = useMemo(() => {
    let filtered = smsHistory;

    // Filter by read status
    if (filterStatus === 'unread') {
      filtered = filtered.filter(sms => !sms.is_read);
    } else if (filterStatus === 'read') {
      filtered = filtered.filter(sms => sms.is_read);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sms =>
        (sms.recipient?.toLowerCase() || '').includes(searchLower) ||
        (sms.message?.toLowerCase() || '').includes(searchLower) ||
        (sms.status?.toLowerCase() || '').includes(searchLower) ||
        (sms.delivery_status?.toLowerCase() || '').includes(searchLower)
      );
    }

    return filtered;
  }, [smsHistory, searchTerm, filterStatus]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const unreadCount = smsHistory.filter(sms => !sms.is_read).length;

  // Handlers
  const handleMarkAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate([id]);
  }, [markAsReadMutation]);

  const handleMarkAsUnread = useCallback((id: string) => {
    markAsUnreadMutation.mutate([id]);
  }, [markAsUnreadMutation]);

  const handleSelectNotification = useCallback((id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedNotifications.size === paginatedHistory.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(paginatedHistory.map(sms => sms.id)));
    }
  }, [paginatedHistory, selectedNotifications.size]);

  const handleMarkSelectedAsRead = useCallback(() => {
    if (selectedNotifications.size > 0) {
      markAsReadMutation.mutate(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
    }
  }, [selectedNotifications, markAsReadMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    const unreadIds = smsHistory.filter(sms => !sms.is_read).map(sms => sms.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  }, [smsHistory, markAsReadMutation]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNotifications.size > 0 && confirm('Are you sure you want to delete selected notifications?')) {
      deleteNotificationsMutation.mutate(Array.from(selectedNotifications));
    }
  }, [selectedNotifications, deleteNotificationsMutation]);

  const getStatusBadge = (status: string, deliveryStatus: string) => {
    if (deliveryStatus === 'delivered') {
      return <Badge color="success" size="sm">Delivered</Badge>;
    } else if (deliveryStatus === 'failed' || status === 'failed') {
      return <Badge color="error" size="sm">Failed</Badge>;
    } else if (status === 'sent' || status === 'queued') {
      return <Badge color="warning" size="sm">Sent</Badge>;
    } else {
      return <Badge color="light" size="sm">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <PageMeta
        title="Notifications"
        description="View and manage your SMS notifications and alerts."
      />
      <PageBreadcrumb pageTitle="Notifications" />

      <div className="min-h-auto rounded-xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10">
        
        {/* Header with Stats */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
            </div>
            {unreadCount > 0 && (
              <Badge color="error" size="sm">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filterStatus === 'all'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            All ({smsHistory.length})
          </button>
          <button
            onClick={() => setFilterStatus('unread')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filterStatus === 'unread'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilterStatus('read')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filterStatus === 'read'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Read ({smsHistory.length - unreadCount})
          </button>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-white/5 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
            />
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNotifications.size} selected
              </span>
              <Button
                onClick={handleMarkSelectedAsRead}
                variant="outline"
                size="sm"
              >
                <Check className="w-4 h-4" />
                Mark as read
              </Button>
              <Button
                onClick={handleDeleteSelected}
                variant="outline"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                currentPage === 1
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page <span className="text-brand-600 dark:text-brand-400">{currentPage}</span> of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                currentPage === totalPages || totalPages === 0
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No notifications found matching your search' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              {paginatedHistory.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.size === paginatedHistory.length && paginatedHistory.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Select all</span>
                </div>
              )}

              {paginatedHistory.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                    notification.is_read
                      ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3'
                      : 'border-brand-200 bg-brand-50/30 dark:border-brand-900/30 dark:bg-brand-900/10'
                  } hover:shadow-sm`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => handleSelectNotification(notification.id)}
                    className="mt-1 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
                  />

                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.delivery_status === 'delivered'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : notification.delivery_status === 'failed'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Bell className={`w-5 h-5 ${
                      notification.delivery_status === 'delivered'
                        ? 'text-green-600 dark:text-green-400'
                        : notification.delivery_status === 'failed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${
                          notification.is_read
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          SMS to {notification.recipient}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-brand-600 rounded-full"></span>
                        )}
                      </div>
                      {getStatusBadge(notification.status, notification.delivery_status)}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>{formatDate(notification.created_at)}</span>
                      <span>•</span>
                      <span>{notification.sms_count} segment{notification.sms_count > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>UGX {notification.cost}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {notification.is_read ? (
                      <button
                        onClick={() => handleMarkAsUnread(notification.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Mark as unread"
                      >
                        <BellOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        title="Mark as read"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
