import { useState, useMemo } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";

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
}

interface SmsHistoryResponse {
  data: SmsHistory[];
  count: number;
}

export default function NotificationDropdown() {
  const { user, apiClient } = useAuth();
  const isAdmin = !!user?.isSuperuser;
  const [isOpen, setIsOpen] = useState(false);

  // Fetch recent SMS history
  const fetchRecentSms = async (): Promise<SmsHistory[]> => {
    const token = apiClient.getToken();
    if (!token) return [];

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = isAdmin 
      ? `${baseUrl}/api/v1/historysms/all?skip=0&limit=6`
      : `${baseUrl}/api/v1/historysms/?skip=0&limit=6`;

    const response = await fetch(endpoint, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const result: SmsHistoryResponse = await response.json();
    return result.data;
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['recentNotifications', user?.id, isAdmin],
    queryFn: fetchRecentSms,
    staleTime: 30_000,
    refetchInterval: 60_000, // Refetch every minute
  });

  // Check if there are any new notifications (created in last 5 minutes)
  const hasNewNotifications = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return notifications.some(n => new Date(n.created_at).getTime() > fiveMinutesAgo);
  }, [notifications]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
  };

  const getStatusColor = (deliveryStatus: string, status: string) => {
    if (deliveryStatus === "delivered") return "bg-green-500";
    if (deliveryStatus === "failed" || status === "failed") return "bg-red-500";
    if (status === "sent" || status === "queued") return "bg-blue-500";
    return "bg-gray-500";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getNotificationMessage = (notification: SmsHistory) => {
    if (notification.delivery_status === 'delivered') {
      return `SMS delivered to ${notification.recipient}`;
    } else if (notification.delivery_status === 'failed' || notification.status === 'failed') {
      return `Failed to send SMS to ${notification.recipient}`;
    } else {
      return `SMS sent to ${notification.recipient}`;
    }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        {hasNewNotifications && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-gray-100 dark:border-gray-700">
          <div></div>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <li className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              No recent notifications
            </li>
          ) : (
            notifications.map((notification) => (
              <li key={notification.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-center flex-shrink-0 w-10 h-10">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full dark:bg-gray-800">
                      <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white/90">
                      {getNotificationMessage(notification)}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(notification.delivery_status, notification.status)}`}></span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>
        <Link
          to="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}