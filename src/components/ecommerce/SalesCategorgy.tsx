'use client';

import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Package } from 'lucide-react';
import { useState } from 'react';

export default function SalesCategoryChart() {
  const total = 2450;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const categories = [
    { name: 'Affiliate Program', percent: 48, products: 2040, color: '#465FFF' },
    { name: 'Direct Buy', percent: 33, products: 1402, color: '#3B82F6' },
    { name: 'Adsense', percent: 19, products: 510, color: '#93C5FD' },
  ];

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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
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
        <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors">
          <Package className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Chart */}
        <div className="flex-1 min-h-[320px]">
          <Chart options={options} series={series} type="donut" height={300} />
        </div>

        {/* Custom Legend */}
        <div className="space-y-4 lg:w-1/2">
          {categories.map((cat, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                activeIndex === index 
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