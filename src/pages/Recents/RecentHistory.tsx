'use client';

import { useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecentHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 8;

  return (
    <div>
      <PageMeta
        title="Your Recent SMS History"
        description="Check and Analyze your recent SMS activities and history."
      />
      <PageBreadcrumb pageTitle="Recent History" />

      <div className="min-h-auto rounded-xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10">
        
        {/* Search + Pagination Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Search Input */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 
                bg-gray-50 text-gray-900 placeholder-gray-500 
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
                p-2 rounded-lg border transition-all duration-200
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
                p-2 rounded-lg border transition-all duration-200
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
          <BasicTableOne searchTerm={searchTerm} currentPage={currentPage}/>
        </div>
      </div>
    </div>
  );
}