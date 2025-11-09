import { useState, useMemo } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import CountryMap from "./CountryMap";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

interface SmsHistory {
  id: string;
  recipient: string;
  message: string;
  status: string;
  created_at: string;
}

interface NetworkStats {
  name: string;
  count: number;
  percentage: number;
  logo: string;
}

export default function DemographicCard() {
  const { apiClient } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  // Fetch SMS history
  const { data: smsHistory = [] } = useQuery<SmsHistory[]>({
    queryKey: ['smsHistoryDemographics'],
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

  // Calculate network statistics based on phone number prefixes
  const networkStats = useMemo<NetworkStats[]>(() => {
    if (!smsHistory.length) return [];

    // Define network prefixes for Uganda
    const airtelPrefixes = ['25674', '25675', '25670', '25672']; // Airtel Uganda
    const mtnPrefixes = ['25677', '25678', '25676']; // MTN Uganda
    const otherPrefixes = ['25679', '25671']; // Other networks (Africell, etc.)

    let airtelCount = 0;
    let mtnCount = 0;
    let otherCount = 0;

    smsHistory.forEach((sms) => {
      const recipient = sms.recipient.replace(/[^0-9]/g, ''); // Remove non-numeric characters
      
      // Check Airtel prefixes
      if (airtelPrefixes.some(prefix => recipient.startsWith(prefix))) {
        airtelCount++;
      }
      // Check MTN prefixes
      else if (mtnPrefixes.some(prefix => recipient.startsWith(prefix))) {
        mtnCount++;
      }
      // Other networks
      else if (otherPrefixes.some(prefix => recipient.startsWith(prefix))) {
        otherCount++;
      }
    });

    const total = airtelCount + mtnCount + otherCount;
    if (total === 0) return [];

    const stats: NetworkStats[] = [];

    if (airtelCount > 0) {
      stats.push({
        name: 'AIRTEL UGANDA',
        count: airtelCount,
        percentage: Math.round((airtelCount / total) * 100),
        logo: './images/country/airtel.svg',
      });
    }

    if (mtnCount > 0) {
      stats.push({
        name: 'MTN UGANDA',
        count: mtnCount,
        percentage: Math.round((mtnCount / total) * 100),
        logo: './images/country/mtn.svg',
      });
    }

    if (otherCount > 0) {
      stats.push({
        name: 'OTHER NETWORKS',
        count: otherCount,
        percentage: Math.round((otherCount / total) * 100),
        logo: './images/country/ug.svg',
      });
    }

    // Sort by count (highest first)
    return stats.sort((a, b) => b.count - a.count);
  }, [smsHistory]);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Outbound Demographics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            SMS sent within last 30 days
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Last 7 Days
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Last Month
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      <div className="px-4 py-6 my-6 overflow-hidden border border-gary-200 rounded-2xl dark:border-gray-800 sm:px-6">
        <div
          id="mapOne"
          className="mapOne map-btn -mx-4 -my-6 h-[212px] w-[252px] 2xsm:w-[307px] xsm:w-[358px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
        >
          <CountryMap />
        </div>
      </div>

      <div className="space-y-5">
        {networkStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No SMS data available
          </div>
        ) : (
          networkStats.map((network) => (
            <div key={network.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="items-center w-full rounded-full max-w-8">
                  <img src={network.logo} alt={network.name} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                    {network.name}
                  </p>
                  <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {network.count.toLocaleString()} sms
                  </span>
                </div>
              </div>

              <div className="flex w-full max-w-[140px] items-center gap-3">
                <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                  <div 
                    className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                    style={{ width: `${network.percentage}%` }}
                  ></div>
                </div>
                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {network.percentage}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
