// src/components/tables/BasicTables/BasicTableOne.tsx
"use client";

import { Eye, MessageSquare, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Checkbox from "../../form/input/Checkbox";
import Badge from "../../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";

import { apiClient } from '@/lib/api/client';
import { SmsHistoryPublic } from '@/lib/api/models';

// Local SMS interface removed, using SmsHistoryPublic

interface Props {
  searchTerm?: string;
  currentPage?: number;
  itemsPerPage?: number;
  smsHistory?: SmsHistoryPublic[];
  isAdmin?: boolean;
}

import Modal from "../../ui/modal/Modal";
import Button from "../../ui/button/Button";

/* ------------------------------------------------------------------ */
export default function BasicTableOne({
  searchTerm = "",
  currentPage = 1,
  itemsPerPage = 5,
  smsHistory = [],
  isAdmin = false,
}: Props) {
  const [data, setData] = useState<SmsHistoryPublic[]>(smsHistory);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewedSms, setViewedSms] = useState<SmsHistoryPublic | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Update data when smsHistory prop changes
  useMemo(() => {
    setData(smsHistory);
  }, [smsHistory]);

  /* -------------------------- Filtering -------------------------- */
  const filtered = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (s) =>
        (s.recipient?.toLowerCase() || '').includes(lower) ||
        (s.message?.toLowerCase() || '').includes(lower) ||
        (s.status?.toLowerCase() || '').includes(lower) ||
        (s.deliveryStatus?.toLowerCase() || '').includes(lower)
    );
  }, [data, searchTerm]);

  /* -------------------------- Pagination ------------------------- */
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  /* -------------------------- Selection -------------------------- */
  const allChecked =
    paginated.length > 0 && paginated.every((r) => selected.has(r.id));
  const indeterminate = selected.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((r) => r.id)));
    }
  };

  const toggleRow = (id: string) => {
    const copy = new Set(selected);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setSelected(copy);
  };

  const deleteRow = async (id: string) => {
    // Call API to delete
    try {
      await apiClient.api.historySms.historysmsDeleteSmsHistory({ historyId: id });

      // Success handled by default if no error thrown
    } catch {
      toast.error('Error deleting SMS');
      return;
    }

    // Update local state
    setData((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    toast.success("SMS deleted", {
      icon: <Trash2 className="w-4 h-4" />,
      autoClose: 2000,
    });
    setTimeout(() => { }, 2300);
  };

  /* -------------------------- Bulk Delete -------------------------- */
  const bulkDelete = async () => {
    if (selected.size === 0) return;

    try {
      // Delete all selected SMS
      const deletePromises = Array.from(selected).map(id =>
        apiClient.api.historySms.historysmsDeleteSmsHistory({ historyId: id })
      );

      await Promise.all(deletePromises);

      setData((prev) => prev.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      toast.success(`${selected.size} SMS deleted`, {
        icon: <Trash2 className="w-4 h-4" />,
        autoClose: 2000,
      });
    } catch {
      toast.error('Error deleting SMS messages');
    }

    setTimeout(() => { }, 2300);
  };

  /* -------------------------- View Modal -------------------------- */
  const handleViewSms = (sms: SmsHistoryPublic) => {
    setViewedSms(sms);
    setIsViewModalOpen(true);
  };


  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* Toast Container – Local, Self-Contained */}
      <ToastContainer
        position="bottom-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <div className="overflow-hidden rounded-none  border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-brand-50 border-b border-brand-100 dark:bg-brand-900/20 dark:border-brand-800">
            <Badge size="sm">{selected.size} selected</Badge>
            <Button
              onClick={bulkDelete}
              variant="danger"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow>
                <TableCell isHeader className="w-12 px-5 py-4">
                  <Checkbox
                    checked={allChecked}
                    onChange={toggleAll}
                    className={indeterminate ? "indeterminate" : ""}
                  />
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  To
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Message
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    No SMS found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((sms) => (
                  <TableRow
                    key={sms.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <TableCell className="px-5 py-4">
                      <Checkbox
                        checked={selected.has(sms.id)}
                        onChange={() => toggleRow(sms.id)}
                      />
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      <span className="font-normal text-gray-800 text-sm dark:text-white/90">
                        {sms.recipient}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start max-w-xs">
                      <p className="truncate text-gray-600 text-theme-xs dark:text-gray-300">
                        {sms.message}
                      </p>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      <Badge
                        size="sm"
                        color={
                          sms.status === "success"
                            ? "success"
                            : sms.status === "pending"
                              ? "warning"
                              : "error"
                        }
                      >
                        {sms.deliveryStatus || sms.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-xs dark:text-gray-400">
                      {new Date(sms.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <button
                          onClick={() => handleViewSms(sms)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Delete - Admin only */}
                        {isAdmin && (
                          <button
                            onClick={() => deleteRow(sms.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
              {filtered.length}
            </span>
          </div>
        )}
      </div>

      {/* View SMS Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Message Details"
      >
        {viewedSms && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-base font-medium text-gray-900 dark:text-white">{viewedSms.recipient}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Message</label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {viewedSms.message}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <Badge
                  size="sm"
                  color={
                    viewedSms.status === "success"
                      ? "success"
                      : viewedSms.status === "pending"
                        ? "warning"
                        : "error"
                  }
                >
                  {viewedSms.deliveryStatus || viewedSms.status}
                </Badge>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sent Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(viewedSms.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setIsViewModalOpen(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
