// src/components/tables/BasicTables/BasicTableOne.tsx
"use client";

import { useState, useMemo } from "react";
import { Eye, MessageSquare, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Checkbox from "../../form/input/Checkbox";
import Badge from "../../ui/badge/Badge";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface SMS {
  id: string;
  recipient: string;
  message: string;
  status: string;
  sms_count: number;
  cost: number;
  template_id: string | null;
  error_message: string | null;
  delivery_status: string;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  user_id: string;
}

interface Props {
  searchTerm?: string;
  currentPage?: number;
  itemsPerPage?: number;
  smsHistory?: SMS[];
  isAdmin?: boolean;
}

/* ------------------------------------------------------------------ */
export default function BasicTableOne({
  searchTerm = "",
  currentPage = 1,
  itemsPerPage = 5,
  smsHistory = [],
  isAdmin = false,
}: Props) {
  const [data, setData] = useState<SMS[]>(smsHistory);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
        (s.delivery_status?.toLowerCase() || '').includes(lower)
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
      const token = localStorage.getItem('access_token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/v1/historysms/${id}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        toast.error('Failed to delete SMS');
        return;
      }
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
    setTimeout(() => {}, 2300);
  };

  /* -------------------------- Bulk Delete -------------------------- */
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Delete all selected SMS
      const deletePromises = Array.from(selected).map(id =>
        fetch(`${baseUrl}/api/v1/historysms/${id}`, {
          method: 'DELETE',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
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

    setTimeout(() => {}, 2300);
  };

  /* -------------------------- Toasts -------------------------- */

  // ──────────────────────────────────────────────────────────────────────
  //  Toast styling – two flavours
  // ──────────────────────────────────────────────────────────────────────
  const TOAST_CARD = () =>
    "!bg-gray-100 dark:!bg-white/10 !text-gray-900 dark:!text-white !rounded !shadow-lg !border !border-gray-200 dark:!border-white/20 !p-3";

  const TOAST_NATIVE = () =>
    "!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !rounded !shadow-md !border !border-gray-200 dark:!border-gray-700 !p-3 !max-w-xs !flex !items-center !gap-2 !font-medium";

  // ──────────────────────────────────────────────────────────────────────
  //  View toast – uses the native style
  // ──────────────────────────────────────────────────────────────────────
  const showViewToast = (sms: SMS) => {
    toast.info(
      <div className="flex flex-col gap-1">
        <p className="font-medium">{sms.recipient}</p>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {sms.message}
        </p>
      </div>,
      {
        icon: <MessageSquare className="w-5 h-5 text-brand-600" />,
        toastId: `view-${sms.id}`, // prevent duplicates
        className: TOAST_NATIVE(), // ← native look
        autoClose: 2000,
      }
    );
    setTimeout(() => {}, 2300);
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
        toastClassName={(toast) =>
          toast?.type === "info" ? TOAST_NATIVE() : TOAST_CARD()
        }
        progressClassName={() => "!bg-brand-500 !h-1"}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-brand-50 border-b border-brand-100 dark:bg-brand-900/20 dark:border-brand-800">
            <Badge size="sm">{selected.size} selected</Badge>
            <button
              onClick={bulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
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
                      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {sms.recipient}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start max-w-xs">
                      <p className="truncate text-gray-600 text-theme-sm dark:text-gray-300">
                        {sms.message}
                      </p>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start">
                      <Badge
                        size="sm"
                        color={
                          sms.delivery_status === "delivered"
                            ? "success"
                            : sms.status === "pending"
                            ? "warning"
                            : "error"
                        }
                      >
                        {sms.delivery_status || sms.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-xs dark:text-gray-400">
                      {new Date(sms.created_at).toLocaleDateString('en-US', { 
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
                          onClick={() => showViewToast(sms)}
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
    </>
  );
}
