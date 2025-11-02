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
  id: number;
  to: string;
  message: string;
  status: "delivered" | "pending" | "failed";
  date: string;
}

interface Props {
  searchTerm?: string;
  currentPage?: number;
  itemsPerPage?: number;
}

const rawData: SMS[] = [
  {
    id: 1,
    to: "+1 234-567-8901",
    message: "Your verification code is 4821. Do not share it.",
    status: "delivered",
    date: "Oct 31, 2025, 10:30 AM",
  },
  {
    id: 2,
    to: "+1 987-654-3210",
    message: "Meeting at 3 PM today. Don’t forget!",
    status: "delivered",
    date: "Oct 31, 2025, 09:15 AM",
  },
  {
    id: 3,
    to: "+1 555-123-4567",
    message: "Your order #1234 has shipped!",
    status: "pending",
    date: "Oct 30, 2025, 04:20 PM",
  },
  {
    id: 4,
    to: "+1 444-999-8888",
    message: "Payment failed.",
    status: "failed",
    date: "Oct 30, 2025, 01:10 PM",
  },
  {
    id: 5,
    to: "+1 777-222-1111",
    message: "Welcome! Your account is now active.",
    status: "delivered",
    date: "Oct 29, 2025, 11:45 AM",
  },
];

/* ------------------------------------------------------------------ */
export default function BasicTableOne({
  searchTerm = "",
  currentPage = 1,
  itemsPerPage = 5,
}: Props) {
  const [data, setData] = useState<SMS[]>(rawData);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  /* -------------------------- Filtering -------------------------- */
  const filtered = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (s) =>
        s.to.includes(searchTerm) ||
        s.message.toLowerCase().includes(lower) ||
        s.status.includes(lower)
    );
  }, [data, searchTerm]);

  /* -------------------------- Pagination ------------------------- */
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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

  const toggleRow = (id: number) => {
    const copy = new Set(selected);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setSelected(copy);
  };

  const deleteRow = (id: number) => {
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
  const bulkDelete = () => {
    if (selected.size === 0) return;
    setData((prev) => prev.filter((s) => !selected.has(s.id)));
    setSelected(new Set());
    toast.success(`${selected.size} SMS deleted`, {
      icon: <Trash2 className="w-4 h-4" />,
      autoClose: 2000,
    });

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
        <p className="font-medium">{sms.to}</p>
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

  const showResendToast = (to: string) => {
    toast.success(`Resent to ${to}`, {
      icon: <MessageSquare className="w-4 h-4" />,
      autoClose: 2000,
    });

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
                        {sms.to}
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
                          sms.status === "delivered"
                            ? "success"
                            : sms.status === "pending"
                            ? "warning"
                            : "error"
                        }
                      >
                        {sms.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-xs dark:text-gray-400">
                      {sms.date}
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

                        {/* Resend */}
                        <button
                          onClick={() => showResendToast(sms.to)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-brand-400 transition-colors"
                          title="Resend"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteRow(sms.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
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
