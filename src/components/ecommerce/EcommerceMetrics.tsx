import { BoltIcon, BoxesIcon, PackageOpen } from "lucide-react";
import Badge from "../ui/badge/Badge";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

interface SmsHistoryItem {
  id: string;
  recipient: string;
  message: string;
  status: string;
  delivery_status: string;
  created_at: string;
}

interface UserProfile {
  plan: string;
  wallet_balance: string;
  sms_cost: string;
}

export default function EcommerceMetrics() {
  const { apiClient } = useAuth();

  // Fetch SMS history for accurate statistics
  const { data: smsHistory = [] } = useQuery<SmsHistoryItem[]>({
    queryKey: ['smsHistoryMetrics'],
    queryFn: async () => {
      const token = apiClient.getToken();
      if (!token) throw new Error('No auth token');

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/v1/historysms/?skip=0&limit=1000`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch SMS history');
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Fetch user profile for plan info
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const token = apiClient.getToken();
      if (!token) throw new Error('No auth token');

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/v1/user-data/profile`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Calculate statistics from SMS history
  const totalSuccess = smsHistory.filter(
    (sms) => sms.delivery_status === 'delivered' || sms.status === 'success' || sms.status === 'sent'
  ).length;
  const totalEnqueued = smsHistory.filter(
    (sms) => sms.status === 'pending' || sms.delivery_status === 'pending'
  ).length;
  const currentPlan = userProfile?.plan || 'Free';
  const availablePlans = ['Free', 'Basic', 'Pro', 'Enterprise'];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxesIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              SMS Success
            </span>
            <h5 className="mt-2 font-bold text-gray-800 text-title-xs dark:text-white/90">
              {totalSuccess.toLocaleString()}
            </h5>
          </div>
          <Badge color="success" size="sm">
            Success
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
      

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <PackageOpen className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Enqueued
            </span>
            <h5 className="mt-2 font-bold text-gray-800 text-title-xs dark:text-white/90">
              {totalEnqueued.toLocaleString()}
            </h5>
          </div>

          <Badge color="warning" size="sm">
            Enqueued
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoltIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Current Plan
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-xs dark:text-white/90">
              {currentPlan}
            </h4>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Available Plans:</span>
            <div className="flex flex-wrap gap-1">
              {availablePlans.map((plan) => (
                <Badge 
                  key={plan} 
                  color={plan === currentPlan ? 'success' : 'warning'}
                  size="sm"
                >
                  {plan}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
