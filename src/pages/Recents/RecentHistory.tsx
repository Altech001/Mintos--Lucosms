'use client';

import { useState, useMemo } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '@/lib/api/client';

import { SmsHistoryPublic } from '@/lib/api/models';
import Input from '@/components/form/input/InputField';

// Local interfaces removed, using generated models

export default function RecentHistory() {
  const { user, } = useAuth();
  const isAdmin = !!user?.isSuperuser;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch SMS history
  // Fetch SMS history
  const fetchSmsHistory = async (): Promise<SmsHistoryPublic[]> => {
    try {
      const response = isAdmin
        ? await apiClient.api.historySms.historysmsListAllSmsHistory({ skip: 0, limit: 50 })
        : await apiClient.api.historySms.historysmsListMySmsHistory({ skip: 0, limit: 50 });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch SMS history:', error);
      return [];
    }
  };

  const { data: smsHistory = [], isLoading } = useQuery({
    queryKey: ['smsHistory', user?.id, isAdmin],
    queryFn: fetchSmsHistory,
    staleTime: 30_000,
  });

  // Filter SMS history based on search
  const filteredHistory = useMemo(() => {
    if (!searchTerm) return smsHistory;

    const searchLower = searchTerm.toLowerCase();
    return smsHistory.filter(sms =>
      (sms.recipient?.toLowerCase() || '').includes(searchLower) ||
      (sms.message?.toLowerCase() || '').includes(searchLower) ||
      (sms.status?.toLowerCase() || '').includes(searchLower) ||
      (sms.deliveryStatus?.toLowerCase() || '').includes(searchLower)
    );
  }, [smsHistory, searchTerm]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div>
      <PageMeta
        title="Your Recent SMS History"
        description="Check and Analyze your recent SMS activities and history."
      />
      <PageBreadcrumb pageTitle="Recent History" />

      <div className="min-h-auto bg-white px-5 py-7 dark:bg-white/3 xl:px-10">

        {/* Search + Pagination Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* Search Input */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                w-fit pl-10 pr-4 py-2 text-sm rounded-md border border-gray-200 
                bg-gray-50 text-gray-900 placeholder-gray-500 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                dark:bg-white/5 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
                transition-all duration-200
              `}
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`
                p-2 rounded-full border transition-all duration-200
                ${currentPage === 1
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page <span className="text-brand-600 dark:text-brand-400">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded-full border transition-all duration-200
                ${currentPage === totalPages
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                }
              `}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>

              {/* Table Rows Skeleton */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800/50">
                  <div className="w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-28 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <BasicTableOne
              searchTerm=""
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              smsHistory={filteredHistory}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}