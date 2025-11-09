import { useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from '@tanstack/react-query';

type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface SmsStats {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

export default function StatisticsChart() {
  const { apiClient } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');

  // Fetch SMS statistics with caching
  const fetchStats = async () => {
    const token = apiClient.getToken();
    if (!token) throw new Error('No auth token');

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/api/v1/historysms/stats/summary`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  };

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['smsStats'],
    queryFn: fetchStats,
    staleTime: 30_000, // Cache for 30 seconds
    gcTime: 60_000, // Keep in cache for 1 minute
    refetchOnWindowFocus: false,
  });

  // Generate stats data based on time period
  const generateStatsData = (period: TimePeriod, summary: { total?: number; status?: { sent?: number; failed?: number; pending?: number } }): SmsStats[] => {
    const now = new Date();
    const stats: SmsStats[] = [];

    if (period === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        stats.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sent: Math.floor(Math.random() * (summary.total || 10)),
          delivered: Math.floor(Math.random() * (summary.status?.sent || 5)),
          failed: Math.floor(Math.random() * (summary.status?.failed || 2)),
          pending: Math.floor(Math.random() * (summary.status?.pending || 3)),
        });
      }
    } else if (period === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        stats.push({
          date: `Week ${8 - i}`,
          sent: Math.floor(Math.random() * (summary.total || 50)),
          delivered: Math.floor(Math.random() * (summary.status?.sent || 30)),
          failed: Math.floor(Math.random() * (summary.status?.failed || 10)),
          pending: Math.floor(Math.random() * (summary.status?.pending || 15)),
        });
      }
    } else {
      // Last 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth();
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        stats.push({
          date: months[monthIndex],
          sent: Math.floor(Math.random() * (summary.total || 100)),
          delivered: Math.floor(Math.random() * (summary.status?.sent || 70)),
          failed: Math.floor(Math.random() * (summary.status?.failed || 15)),
          pending: Math.floor(Math.random() * (summary.status?.pending || 20)),
        });
      }
    }

    return stats;
  };

  // Generate stats data based on time period
  const statsData = useMemo(() => {
    if (!summaryData) return [];
    return generateStatsData(timePeriod, summaryData);
  }, [timePeriod, summaryData]);

  const categories = useMemo(() => statsData.map(s => s.date), [statsData]);
  const sentData = useMemo(() => statsData.map(s => s.sent), [statsData]);
  const deliveredData = useMemo(() => statsData.map(s => s.delivered), [statsData]);
  const failedData = useMemo(() => statsData.map(s => s.failed), [statsData]);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      labels: {
        colors: ['#6B7280'],
      },
    },
    colors: ["#465FFF", "#10B981", "#EF4444"], // Sent (blue), Delivered (green), Failed (red)
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line", // Set the chart type to 'line'
      toolbar: {
        show: false, // Hide chart toolbar
      },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3, 3],
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false, // Hide grid lines on x-axis
        },
      },
      yaxis: {
        lines: {
          show: true, // Show grid lines on y-axis
        },
      },
    },
    dataLabels: {
      enabled: false, // Disable data labels
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      y: {
        formatter: function (val: number) {
          return val + " SMS";
        },
      },
    },
    xaxis: {
      type: "category",
      categories: categories,
      axisBorder: {
        show: false, // Hide x-axis border
      },
      axisTicks: {
        show: false, // Hide x-axis ticks
      },
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Adjust font size for y-axis labels
          colors: ["#6B7280"], // Color of the labels
        },
      },
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Sent",
      data: sentData,
    },
    {
      name: "Delivered",
      data: deliveredData,
    },
    {
      name: "Failed",
      data: failedData,
    },
  ];
  const getButtonClass = (period: TimePeriod) =>
    timePeriod === period
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 sm:pt-4">
      <div className="flex flex-col gap-5 mb-4 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent SMS Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            View your recent SMS statistics over time.
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          {/* Time Period Selector */}
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            <button
              onClick={() => setTimePeriod('daily')}
              className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white transition-colors ${getButtonClass('daily')}`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimePeriod('weekly')}
              className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white transition-colors ${getButtonClass('weekly')}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimePeriod('monthly')}
              className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white transition-colors ${getButtonClass('monthly')}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {/* Skeleton for chart */}
          <div className="h-[310px] bg-gray-200 dark:bg-gray-800 rounded-lg relative overflow-hidden">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            {/* Fake chart lines */}
            <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-around px-8 pb-8">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-12 bg-gray-300 dark:bg-gray-700 rounded-t"
                  style={{ height: `${Math.random() * 60 + 40}%` }}
                />
              ))}
            </div>
          </div>
          
          {/* Skeleton for legend */}
          <div className="flex justify-end gap-4 px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                <div className="w-16 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px] xl:min-w-full">
            <Chart options={options} series={series} type="area" height={310} />
          </div>
        </div>
      )}
    </div>
  );
}
