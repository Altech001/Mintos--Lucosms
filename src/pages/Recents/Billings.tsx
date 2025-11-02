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
// import Select from "../../components/form/select/Select";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  orderId: string;
  customer: string;
  email: string;
  amount: number;
  dueDate: string;
  status: 'completed' | 'pending' | 'failed';
}

type SortKey = 'orderId' | 'customer' | 'email' | 'amount' | 'dueDate' | 'status';
type SortOrder = 'asc' | 'desc';

// ──────────────────────────────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────────────────────────────
const dummyTransactions: Transaction[] = [
  { id: '1', orderId: '#323537', customer: 'Abram Schleifer', email: 'abram@example.com', amount: 43999, dueDate: '25 Apr, 2027', status: 'completed' },
  { id: '2', orderId: '#323544', customer: 'Ava Smith', email: 'ava.smith@example.com', amount: 1200, dueDate: '01 Dec, 2027', status: 'pending' },
  { id: '3', orderId: '#323538', customer: 'Carla George', email: 'carla65@example.com', amount: 919, dueDate: '11 May, 2027', status: 'completed' },
  { id: '4', orderId: '#323543', customer: 'Ekstrom Bothman', email: 'ekstrom@example.com', amount: 679, dueDate: '15 Nov, 2027', status: 'completed' },
  { id: '5', orderId: '#323552', customer: 'Ella Davis', email: 'ella.davis@example.com', amount: 210, dueDate: '01 Mar, 2028', status: 'failed' },
  { id: '6', orderId: '#323539', customer: 'Emery Culhane', email: 'emery09@example.com', amount: 839, dueDate: '29 Jun, 2027', status: 'completed' },
  // Add more for pagination demo...
  ...Array.from({ length: 14 }, (_, i) => ({
    id: String(i + 7),
    orderId: `#${323500 + i}`,
    customer: `User ${i + 7}`,
    email: `user${i + 7}@example.com`,
    amount: Math.floor(Math.random() * 5000) + 100,
    dueDate: `${Math.floor(Math.random() * 28) + 1} ${['Jan','Feb','Mar','Apr','May','Jun'][Math.floor(Math.random()*6)]}, 2027`,
    status: ['completed','pending','failed'][Math.floor(Math.random()*3)] as 'completed'|'pending'|'failed',
  })),
];

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [transactions] = useState<Transaction[]>(dummyTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('last10');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      filtered = filtered.filter(t =>
        t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter (mock)
    if (dateFilter !== 'all') {
      // In real app: filter by date range
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
    const headers = ['Order ID', 'Customer', 'Email', 'Total Amount', 'Due Date', 'Status'];
    const rows = sortedAndFiltered.map(t => [
      t.orderId,
      t.customer,
      t.email,
      `$${t.amount.toFixed(2)}`,
      t.dueDate,
      t.status.charAt(0).toUpperCase() + t.status.slice(1),
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

          <Button
            variant="outline"
            size="md"
            onClick={exportCSV}
            startIcon={<Download className="w-4 h-4" />}
          >
            Download Data CSV
          </Button>
        </div>

        {/* Table */}
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
                {(['orderId', 'customer', 'email', 'amount', 'dueDate', 'status'] as const).map(key => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-6 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {key === 'orderId' && 'Order ID'}
                      {key === 'customer' && 'Customer'}
                      {key === 'email' && 'Email'}
                      {key === 'amount' && 'Total Amount'}
                      {key === 'dueDate' && 'Due Date'}
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
                    {t.orderId}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.customer}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.email}</td>
                  <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-300">${t.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.dueDate}</td>
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
                      <div className="absolute right-0 top-10 z-10 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/10">
                        <button
                          onClick={() => {
                            alert(`View details for ${t.orderId}`);
                            setShowActions(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          View More
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteModal(t.id);
                            setShowActions(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                onClick={() => {
                  alert('Transaction deleted (real app → API call)');
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