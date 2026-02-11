'use client';

import { useQuery } from '@tanstack/react-query';
import { ApexOptions } from "apexcharts";
import { Package } from 'lucide-react';
import { useState } from 'react';
import Chart from "react-apexcharts";
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '@/lib/api/client';

export default function SalesCategoryChart() {
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fetch user stats (balance, SMS cost, etc.)
  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      const response = await apiClient.api.userData.userDataGetUserStats();
      return response;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Fetch SMS history for statistics
  const { data: smsHistory, isLoading: isLoadingSms } = useQuery({
    queryKey: ['smsHistoryStats', user?.id],
    queryFn: async () => {
      const response = await apiClient.api.historySms.historysmsListMySmsHistory({ skip: 0, limit: 1000 });
      return response;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Calculate statistics from SMS history with better status matching
  const deliveredCount = smsHistory?.data.filter(sms => {
    const status = sms.status?.toLowerCase() || '';
    const deliveryStatus = sms.deliveryStatus?.toLowerCase() || '';
    return status === 'delivered' || status === 'success' || status === 'sent' ||
      deliveryStatus === 'delivered' || deliveryStatus === 'success';
  }).length || 0;

  const pendingCount = smsHistory?.data.filter(sms => {
    const status = sms.status?.toLowerCase() || '';
    const deliveryStatus = sms.deliveryStatus?.toLowerCase() || '';
    return status === 'pending' || status === 'queued' || status === 'processing' ||
      deliveryStatus === 'pending' || deliveryStatus === 'queued';
  }).length || 0;

  const failedCount = smsHistory?.data.filter(sms => {
    const status = sms.status?.toLowerCase() || '';
    const deliveryStatus = sms.deliveryStatus?.toLowerCase() || '';
    return status === 'failed' || status === 'error' ||
      deliveryStatus === 'failed' || deliveryStatus === 'error';
  }).length || 0;

  const totalSms = smsHistory?.data.length || 0;

  // Calculate percentages based on actual data
  const deliveredPercent = totalSms > 0 ? Math.round((deliveredCount / totalSms) * 100) : 0;
  const pendingPercent = totalSms > 0 ? Math.round((pendingCount / totalSms) * 100) : 0;
  const failedPercent = totalSms > 0 ? Math.round((failedCount / totalSms) * 100) : 0;

  const categories = [
    { name: 'Transaction', percent: deliveredPercent, products: deliveredCount, color: '#465FFF' },
    { name: 'Available', percent: pendingPercent, products: pendingCount, color: '#3B82F6' },
    { name: 'Stats', percent: failedPercent, products: failedCount, color: '#93C5FD' },
  ];

  const total = totalSms;
  const series = categories.map(cat => cat.percent);

  const displayValue = activeIndex !== null
    ? categories[activeIndex].products
    : total;

  const displayLabel = activeIndex !== null
    ? categories[activeIndex].name
    : 'Total';

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Outfit, sans-serif',
      height: 400,
      events: {
        dataPointMouseEnter: (_event, _chartContext, config) => {
          setActiveIndex(config.dataPointIndex);
        },
        dataPointMouseLeave: () => {
          setActiveIndex(null);
        },
      },
    },
    colors: categories.map(cat => cat.color),
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 270,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
              offsetY: -10,
              formatter: () => displayLabel,
            },
            value: {
              show: true,
              fontSize: '32px',
              fontWeight: 600,
              color: '#1F2937',
              offsetY: 5,
              formatter: () => displayValue.toLocaleString(),
            },
            total: {
              show: true,
              showAlways: true,
              label: displayLabel,
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
              formatter: () => displayValue.toLocaleString(),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${val}% (${categories[series.indexOf(val)].products.toLocaleString()} products)`,
      },
    },
    states: {
      hover: {
        filter: {
          type: 'darken',
        },
      },
      active: {
        filter: {
          type: 'none',
        },
      },
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            height: 320,
          },
        },
      },
    ],
  };

  const balance = userStats?.walletBalance ? parseFloat(userStats.walletBalance) : 0;
  const smsCost = userStats?.smsCost ? parseFloat(userStats.smsCost) : 0;
  const estimatedSmsCount = userStats?.estimatedSmsCount || 0;

  return (
    <div className=" bg-white p-2 dark:bg-white/[0.03] sm:p-6">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Sales Category
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Distribution by sales channel
          </p>
        </div>
        <button className=" p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors">
          <Package className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className=" bg-gray-50 dark:bg-gray-900/50 p-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Balance</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            UGx{balance.toFixed(2)}
          </p>
        </div>
        <div className=" bg-gray-50 dark:bg-gray-900/50 p-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">SMS Cost</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            UGx{smsCost.toFixed(4)}
          </p>
        </div>
        <div className=" bg-gray-50 dark:bg-gray-900/50 p-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Available SMS</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            {estimatedSmsCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Chart */}
        <div className="flex-1 min-h-[320px]">
          {isLoadingSms ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
          ) : (
            <Chart options={options} series={series} type="donut" height={300} />
          )}
        </div>

        {/* Custom Legend */}
        <div className="space-y-4 lg:w-1/2">
          {categories.map((cat, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3  transition-colors cursor-pointer ${activeIndex === index
                ? 'bg-gray-100 dark:bg-white/10'
                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cat.products.toLocaleString()} Products
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {cat.percent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}