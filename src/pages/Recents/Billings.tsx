'use client';

import {
    ChevronDown,
    ChevronUp,
    Download,
    MoreVertical,
    Search,
    X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Select from '../../components/form/Select';
import Checkbox from '../../components/form/input/Checkbox';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  reference_number: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  balance_before: number | null;
  balance_after: number | null;
}

interface TransactionsResponse {
  data: Transaction[];
  count: number;
}

type SortKey = 'reference_number' | 'description' | 'amount' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';



// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function Transactions() {
  // Auth + admin flag
  const { user, apiClient } = useAuth();
  const isAdmin = !!user?.isSuperuser;

  // Data fetcher
  const fetchTransactions = async (): Promise<Transaction[]> => {
    const token = apiClient.getToken();
    if (!token) return [];

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = isAdmin 
      ? `${baseUrl}/api/v1/transactions/all?skip=0&limit=50`
      : `${baseUrl}/api/v1/transactions/?skip=0&limit=50`;

    const response = await fetch(endpoint, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const result: TransactionsResponse = await response.json();
    return result.data;
  };

  const { data: transactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    staleTime: 60_000,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('last10');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  const itemsPerPage = 10;

  // ──────────────────────────────────────────────────────────────────────
  // Sorting
  // ──────────────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedAndFiltered = useMemo(() => {
    let filtered = transactions;

    // Search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.reference_number?.toLowerCase() || '').includes(searchLower) ||
        (t.description?.toLowerCase() || '').includes(searchLower) ||
        (t.transaction_type?.toLowerCase() || '').includes(searchLower) ||
        (t.payment_method?.toLowerCase() || '').includes(searchLower) ||
        t.amount.toString().includes(searchLower) ||
        t.currency.toLowerCase().includes(searchLower)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const daysAgo = dateFilter === 'last10' ? 10 : 30;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= cutoffDate;
      });
    }

    // Sort
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return filtered;
  }, [transactions, searchTerm, dateFilter, sortKey, sortOrder]);

  // Pagination
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFiltered.slice(start, start + itemsPerPage);
  }, [sortedAndFiltered, currentPage]);

  const totalPages = Math.ceil(sortedAndFiltered.length / itemsPerPage);

  // ──────────────────────────────────────────────────────────────────────
  // Selection
  // ──────────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map(t => t.id));
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Export CSV
  // ──────────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Reference', 'Type', 'Description', 'Amount', 'Currency', 'Date', 'Status', 'Payment Method'];
    const rows = sortedAndFiltered.map(t => [
      t.reference_number,
      t.transaction_type,
      t.description,
      t.amount.toFixed(2),
      t.currency,
      new Date(t.created_at).toLocaleDateString(),
      t.status.charAt(0).toUpperCase() + t.status.slice(1),
      t.payment_method,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta title="Billings & Transactions" description="View and manage your billings & transaction history" />
      <PageBreadcrumb pageTitle="Billings & Transactions" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Billings & Transactions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your most recent billings & transactions list
          </p>
        </div>

        {/* Bulk Actions Bar */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Selected
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          <Select
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: 'last10', label: 'Last 10 Days' },
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'all', label: 'All Time' },
            ]}
            className="w-full sm:w-auto"
          />

          {isAdmin && (
            <Button
              variant="outline"
              size="md"
              onClick={exportCSV}
              startIcon={<Download className="w-4 h-4" />}
            >
              Download Data CSV
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isTxLoading ? (
          <div className="overflow-x-auto">
            <div className="animate-pulse space-y-4">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-white/10">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-28 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>

              {/* Table Rows Skeleton */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-white/5">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-24 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-28 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-20 h-6 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3">
                  <Checkbox
                    checked={selectedIds.length === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  {(['reference_number', 'description', 'amount', 'created_at', 'status'] as const).map(key => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-6 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {key === 'reference_number' && 'Reference Number'}
                        {key === 'description' && 'Description'}
                        {key === 'amount' && 'Amount'}
                        {key === 'created_at' && 'Date'}
                        {key === 'status' && 'Status'}
                        {sortKey === key && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {paginated.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Checkbox
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {t.reference_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      <div className="max-w-xs truncate" title={t.description}>
                        {t.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {t.currency} {t.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {new Date(t.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        size="sm"
                        color={
                          t.status === 'completed' ? 'success' :
                          t.status === 'pending' ? 'warning' : 'error'
                        }
                      >
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(showActions === t.id ? null : t.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Actions Dropdown */}
                      {showActions === t.id && (
                        <div className="absolute right-0 top-10 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-white/10">
                          <button
                            onClick={() => {
                              alert(`Transaction Details:\n\nID: ${t.id}\nType: ${t.transaction_type}\nAmount: ${t.currency} ${t.amount}\nMethod: ${t.payment_method}\nReference: ${t.reference_number}\nBalance Before: ${t.balance_before}\nBalance After: ${t.balance_after}`);
                              setShowActions(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-t-lg"
                          >
                            View Details
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setShowDeleteModal(t.id);
                                setShowActions(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFiltered.length)} of {sortedAndFiltered.length} results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {isAdmin && showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete {selectedIds.length} Transaction{selectedIds.length > 1 ? 's' : ''}?
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This action cannot be undone. All selected transactions will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  try {
                    const token = apiClient.getToken();
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    
                    // Delete all selected transactions
                    const deletePromises = selectedIds.map(id =>
                      fetch(`${baseUrl}/api/v1/transactions/${id}`, {
                        method: 'DELETE',
                        headers: {
                          'accept': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                      })
                    );
                    
                    await Promise.all(deletePromises);
                    alert(`${selectedIds.length} transaction(s) deleted successfully`);
                    setSelectedIds([]);
                    window.location.reload();
                  } catch {
                    alert('Error deleting transactions');
                  }
                  setShowBulkDeleteModal(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin only) */}
      {isAdmin && showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Transaction?
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  if (!showDeleteModal) return;
                  try {
                    const token = apiClient.getToken();
                    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const response = await fetch(`${baseUrl}/api/v1/transactions/${showDeleteModal}`, {
                      method: 'DELETE',
                      headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                    });
                    if (response.ok) {
                      alert('Transaction deleted successfully');
                      // Refetch transactions
                      window.location.reload();
                    } else {
                      alert('Failed to delete transaction');
                    }
                  } catch {
                    alert('Error deleting transaction');
                  }
                  setShowDeleteModal(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}