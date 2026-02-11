import { BoltIcon, BoxesIcon, PackageOpen } from "lucide-react";
import Badge from "../ui/badge/Badge";
import { useQuery } from '@tanstack/react-query';

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

import { apiClient } from "@/lib/api/client";

export default function EcommerceMetrics() {
  // const { apiClient } = useAuth(); // apiClient is not in AuthContext

  // Fetch SMS history for accurate statistics
  const { data: smsHistory = [] } = useQuery<SmsHistoryItem[]>({
    queryKey: ['smsHistoryMetrics'],
    queryFn: async () => {
      const response = await apiClient.api.historySms.historysmsListMySmsHistory({ skip: 0, limit: 1000 });
      // Map the API response to the local interface if needed, or use the API model directly.
      // The API returns { data: [...], count: ... }
      return response.data as unknown as SmsHistoryItem[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Fetch user profile for plan info
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.api.userData.userDataGetUserProfile();
      // Map the API response to the local interface
      return {
        plan: response.planSub,
        wallet_balance: response.wallet,
        sms_cost: response.smsCost,
      };
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
  const currentPlan = userProfile?.plan;
  const availablePlans = ['Basic', 'Standard', 'Premium', 'Enterprise'];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="bg-white p-5 dark:bg-white/[0.03] md:p-6 shadow">
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
      <div className="bg-white p-5 dark:bg-white/[0.03] md:p-6 shadow">
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
      <div className="bg-white p-5 dark:bg-white/[0.03] md:p-6 shadow">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoltIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">

          <div className="flex flex-col gap-1">
            <span className="text-sm font-black text-gray-500 dark:text-gray-400">Available Plans:</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">You are active on {currentPlan} Plan</span>
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
