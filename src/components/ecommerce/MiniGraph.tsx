import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useQuery } from '@tanstack/react-query';
import { apiClient } from "@/lib/api/client";
import { SmsHistoryPublic } from "@/lib/api/models";

export default function MiniGraph() {
    // Fetch SMS history with caching
    const fetchSmsHistory = async (): Promise<SmsHistoryPublic[]> => {
        const response = await apiClient.api.historySms.historysmsListMySmsHistory({ skip: 0, limit: 1000 });
        return response.data;
    };

    const { data: smsHistory = [], isLoading } = useQuery({
        queryKey: ['smsHistory'],
        queryFn: fetchSmsHistory,
        staleTime: 30_000,
    });

    const categories = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        return days;
    }, []);

    const series = useMemo(() => {
        if (isLoading || !smsHistory.length) return [
            { name: 'Delivered', data: [0, 0, 0, 0, 0, 0, 0] },
            { name: 'Pending', data: [0, 0, 0, 0, 0, 0, 0] },
            { name: 'Failed', data: [0, 0, 0, 0, 0, 0, 0] }
        ];

        const daysMap = new Map();
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
            daysMap.set(key, { delivered: 0, pending: 0, failed: 0 });
        }

        smsHistory.forEach(sms => {
            const d = new Date(sms.createdAt);
            const key = d.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
            if (daysMap.has(key)) {
                const stats = daysMap.get(key);
                const status = sms.status?.toLowerCase() || '';
                if (status.includes('delivered') || status === 'success') {
                    stats.delivered++;
                } else if (status.includes('failed') || status === 'failed') {
                    stats.failed++;
                } else {
                    stats.pending++;
                }
            }
        });

        const deliveredData: number[] = [];
        const pendingData: number[] = [];
        const failedData: number[] = [];

        daysMap.forEach((value) => {
            deliveredData.push(value.delivered);
            pendingData.push(value.pending);
            failedData.push(value.failed);
        });

        return [
            { name: 'Delivered', data: deliveredData },
            { name: 'Pending', data: pendingData },
            { name: 'Failed', data: failedData }
        ];
    }, [smsHistory, isLoading]);

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            stacked: true,
            toolbar: { show: false },
            fontFamily: "Outfit, sans-serif",
        },
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 4,
                columnWidth: '40%',
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: false },
        xaxis: {
            categories: categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#9CA3AF', fontSize: '12px' }
            }
        },
        yaxis: {
            show: false,
        },
        grid: {
            show: true,
            strokeDashArray: 4,
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        },
        legend: { show: true, position: 'top', horizontalAlign: 'right' },
        colors: ["#10B981", "#F59E0B", "#EF4444"], // Green, Amber, Red
        tooltip: {
            shared: true,
            intersect: false,
        }
    };

    return (
        <div className="bg-white dark:bg-white/[0.03] p-6 shadow">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Weekly Transactions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days activity</p>
                </div>
            </div>
            <div className="h-[300px]">
                <ReactApexChart options={options} series={series} type="bar" height="100%" />
            </div>
        </div>
    );
}
