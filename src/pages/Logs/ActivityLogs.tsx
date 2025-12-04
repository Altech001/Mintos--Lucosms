import React, { useState, useEffect } from 'react';
import { useIdle, useDeviceOS, useBatteryStatus, useGeolocation } from 'react-haiku';
import { LoginHistoryPublic } from '@/lib/api';
import { apiClient } from '@/lib/api/client';

// Mock ComponentCard - replace with your actual import
const ComponentCard = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
    </div>
    {children}
  </div>
);

interface LocationData {
  city?: string;
  country?: string;
}

function ActivityLogs() {
  const isIdle = useIdle(5000);
  const deviceOS = useDeviceOS();
  const batteryStatus = useBatteryStatus();
  const geolocation = useGeolocation();

  const [locationData, setLocationData] = useState<LocationData>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginHistoryPublic[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const response = await apiClient.api.users.usersReadLoginHistory({ limit: 10 });
        if (response.data) {
          setLoginLogs(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch login logs:', error);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, []);

  // Fetch location name from coordinates
  useEffect(() => {
    if (!geolocation.latitude || !geolocation.longitude) return;

    let cancelled = false;

    const fetchLocationName = async () => {
      setLocationLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${geolocation.latitude}&lon=${geolocation.longitude}&format=json`
        );
        const data = await response.json();

        if (!cancelled) {
          setLocationData({
            city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
            country: data.address?.country || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Failed to fetch location name:', error);
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    };

    fetchLocationName();

    return () => {
      cancelled = true;
    };
  }, [geolocation.latitude, geolocation.longitude]);

  const StatCard = ({
    icon,
    label,
    value,
    subValue
  }: {
    icon: string;
    label: string;
    value: string;
    subValue?: string
  }) => (
    <div className="group relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800 dark:to-gray-850 p-5 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{icon}</span>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {label}
            </p>
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {subValue}
            </p>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl"></div>
    </div>
  );

  const getLocationDisplay = () => {
    if (geolocation.loading || locationLoading) return 'Loading...';
    if (geolocation.error) return 'Unavailable';

    if (locationData.city && locationData.country) {
      return `${locationData.city}, ${locationData.country}`;
    }

    if (geolocation.latitude && geolocation.longitude) {
      return `${geolocation.latitude.toFixed(2)}°, ${geolocation.longitude.toFixed(2)}°`;
    }

    return 'N/A';
  };

  const getLocationSubValue = () => {
    if (!geolocation.loading && !geolocation.error && geolocation.latitude && geolocation.longitude) {
      return `${geolocation.latitude.toFixed(4)}°, ${geolocation.longitude.toFixed(4)}°`;
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <ComponentCard
        title="Activity Logs"
        desc="Real-time monitoring of device status and user activity"
      >
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="💻"
              label="Device OS"
              value={deviceOS || 'Unknown'}
            />

            <StatCard
              icon={batteryStatus.isCharging ? "⚡" : "🔋"}
              label="Battery"
              value={
                batteryStatus.level !== undefined
                  ? `${(batteryStatus.level * 100).toFixed(0)}%`
                  : 'N/A'
              }
              subValue={
                batteryStatus.level !== undefined
                  ? batteryStatus.isCharging ? 'Charging' : 'Not charging'
                  : 'Not supported'
              }
            />

            <StatCard
              icon="📍"
              label="Location"
              value={getLocationDisplay()}
              subValue={getLocationSubValue()}
            />

            <StatCard
              icon={isIdle ? "💤" : "✨"}
              label="Status"
              value={isIdle ? 'Idle' : 'Active'}
              subValue={isIdle ? 'No activity detected' : 'User is active'}
            />
          </div>
        </div>
      </ComponentCard>

      <ComponentCard
        title="Login History"
        desc="Recent login activities and session information"
      >
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Operating System
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Browser
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">Loading logs...</td>
                  </tr>
                ) : loginLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${index === 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Latest
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {log.os?.includes('Windows') ? '🪟' : log.os?.includes('macOS') ? '🍎' : '💻'}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {log.os || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {log.browser || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">📍</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {log.location || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {log.ipAddress}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loadingLogs && loginLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No login history available</p>
            </div>
          )}
        </div>
      </ComponentCard>
    </div>
  );
}

export default ActivityLogs;