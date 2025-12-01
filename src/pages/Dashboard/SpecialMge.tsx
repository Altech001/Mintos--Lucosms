/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
    CloudUpload,
    Eye,
    Loader,
    Send,
    Trash2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Save,
    X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import useCustomToast from "../../hooks/useCustomToast";
import type { TemplatesPublic } from "../../lib/api";
import { apiClient } from "../../lib/api/client";
import TextArea from "../../components/form/input/TextArea";

/* ────────────────────────────────────────────────────────────── */
/* Types                                                          */
/* ────────────────────────────────────────────────────────────── */
interface Row {
    id: string;               // internal row id (import-time)
    name: string;
    message: string;
    phone?: string;
}

/* ────────────────────────────────────────────────────────────── */
/* Helpers                                                        */
/* ────────────────────────────────────────────────────────────── */
const normalizePhone = (raw: string) => {
    let n = (raw || "").toString().trim();
    if (!n) return null;
    n = n.replace(/[^+\d]/g, "");

    // Uganda-specific shortcuts
    if (/^7\d{8}$/.test(n)) n = "+256" + n;
    else if (/^07\d{8}$/.test(n)) n = "+256" + n.slice(1);
    else if (/^256\d{9}$/.test(n)) n = "+" + n;
    else if (/^0\d+$/.test(n)) n = "+256" + n.slice(1);

    try {
        const pn = parsePhoneNumberFromString(n);
        if (pn && pn.isValid() && pn.country === "UG") {
            return pn.number;
        }
    } catch {
        // ignore
    }
    return null;
};

/* ────────────────────────────────────────────────────────────── */
/* Main Page                                                      */
/* ────────────────────────────────────────────────────────────── */
export default function SpecialMessagePage() {
    const { showSuccessToast, showErrorToast } = useCustomToast();

    /* ── State ─────────────────────────────────────── */
    const [rows, setRows] = useState<Row[]>([]);
    const [template, setTemplate] = useState("");
    const [senderId, setSenderId] = useState("");
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Editing State
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ message: string; phone: string }>({ message: "", phone: "" });

    /* ── API ─────────────────────────────────────── */
    const statsQuery = useQuery({
        queryKey: ["userStats"],
        queryFn: () => apiClient.api.userData.userDataGetUserStats(),
        staleTime: 30_000,
    });
    const balance = Number(statsQuery.data?.walletBalance ?? 0);
    const costPerSms = Number(statsQuery.data?.smsCost ?? 32);

    const templatesQuery = useQuery<TemplatesPublic>({
        queryKey: ["templates", 0, 100],
        queryFn: () =>
            apiClient.api.templates.templatesReadTemplates({ skip: 0, limit: 100 }),
        staleTime: 60_000,
    });

    const apiTemplates = useMemo(
        () =>
            (templatesQuery.data?.data || []).map((t) => ({
                id: t.id,
                title: t.name,
                body: t.content,
            })),
        [templatesQuery.data]
    );

    /* ── Cost calculation ─────────────────────────── */
    const totalCost = rows.length * costPerSms;
    const insufficient = totalCost > balance;

    /* ── File import (CSV / XLSX) ─────────────────── */
    const parseFile = useCallback((file: File) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result as string | ArrayBuffer;
                let parsed: Row[] = [];

                if (file.name.endsWith(".csv")) {
                    const text = data as string;
                    const lines = text.split("\n").filter(Boolean);
                    const headers = lines[0]
                        .split(",")
                        .map((h) => h.trim().toLowerCase());

                    parsed = lines.slice(1).map((line, idx) => {
                        const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
                        return {
                            id: `row-${Date.now()}-${idx}`,
                            name: vals[headers.indexOf("name")] || vals[0] || "N/A",
                            message:
                                vals[headers.indexOf("message")] || vals[1] || "N/A",
                            phone: vals[headers.indexOf("phone")] || vals[2],
                        };
                    });
                } else if (
                    file.name.endsWith(".xlsx") ||
                    file.name.endsWith(".xls")
                ) {
                    const { read, utils } = await import("xlsx");
                    const wb = read(data, { type: "binary" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = utils.sheet_to_json<Record<string, string>>(ws);

                    parsed = json.map((r, idx) => ({
                        id: `row-${Date.now()}-${idx}`,
                        name: r.name || r.Name || r.NAME || "N/A",
                        message: r.message || r.Message || r.MESSAGE || "N/A",
                        phone: r.phone || r.Phone || r.PHONE,
                    }));
                }

                // Filter out rows that miss required fields
                const validRows = parsed.filter(
                    (r) => r.name !== "N/A" && r.message !== "N/A"
                );

                setRows(validRows);
                setCurrentPage(1); // Reset pagination
                showSuccessToast(
                    
                    `Imported ${validRows.length} row${validRows.length !== 1 ? "s" : ""}`
                );
            } catch (err) {
                showErrorToast("Failed to parse file");
            }
        };

        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            reader.readAsBinaryString(file);
        } else {
            reader.readAsText(file);
        }
    }, [showSuccessToast, showErrorToast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (accepted) => accepted[0] && parseFile(accepted[0]),
        accept: {
            "text/csv": [".csv"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
                ".xlsx",
            ],
        },
        multiple: false,
    });

    /* ── Pagination Logic ────────────────────────── */
    const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return rows.slice(start, start + ITEMS_PER_PAGE);
    }, [rows, currentPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    /* ── Editing Logic ───────────────────────────── */
    const startEditing = (row: Row) => {
        setEditingRowId(row.id);
        setEditValues({ message: row.message, phone: row.phone || "" });
    };

    const saveEditing = (id: string) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === id
                    ? { ...r, message: editValues.message, phone: editValues.phone }
                    : r
            )
        );
        setEditingRowId(null);
    };

    const cancelEditing = () => {
        setEditingRowId(null);
    };

    const deleteRow = (id: string) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
        // Adjust pagination if needed
        if (paginatedRows.length === 1 && currentPage > 1) {
            setCurrentPage((p) => p - 1);
        }
    };

    /* ── Preview Logic ───────────────────────────── */
    const previewMessage = useMemo(() => {
        if (!template || rows.length === 0) return null;
        const firstRow = rows[0];
        return template
            .replace(/{{name}}/g, firstRow.name)
            .replace(/{{message}}/g, firstRow.message);
    }, [template, rows]);

    /* ── Send ───────────────────────────────────── */
    const sendSpecial = async () => {
        if (!template) return showErrorToast("Please choose or write a template");
        if (rows.length === 0)
            return showErrorToast("No recipients to send to");

        const sid = senderId.trim() || "ATUpdates";
        if (!/^[A-Za-z0-9]{3,11}$/.test(sid))
            return showErrorToast("Sender ID must be 3-11 alphanumerics");

        setIsSending(true);
        setSentCount(0);

        // Filter valid rows first
        const validRows = rows.filter(r => normalizePhone(r.phone || ""));

        if (validRows.length === 0) {
            setIsSending(false);
            return showErrorToast("No valid phone numbers found");
        }

        // Batch processing to avoid browser/network limits
        const BATCH_SIZE = 5;
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                const batch = validRows.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (row) => {
                    const phone = normalizePhone(row.phone || "");
                    if (!phone) return;

                    const msg = template
                        .replace(/{{name}}/g, row.name)
                        .replace(/{{message}}/g, row.message);

                    try {
                        await apiClient.api.sms.smsSendSms({
                            sendSMSRequest: {
                                to: [phone],
                                message: msg,
                                from: sid,
                                enqueue: true,
                            },
                        });
                        successCount++;
                    } catch (e) {
                        failCount++;
                        console.error(`Failed to send to ${phone}`, e);
                    }
                }));

                setSentCount(prev => Math.min(prev + BATCH_SIZE, validRows.length));
            }

            showSuccessToast(
                `Sent ${successCount} messages${failCount > 0 ? ` (${failCount} failed)` : ""}`
            );
            setRows([]); // Clear list on success
        } catch (e: any) {
            showErrorToast(e?.message ?? "Failed to send some messages");
        } finally {
            setIsSending(false);
            setSentCount(0);
        }
    };

    /* ── Render ─────────────────────────────────── */
    return (
        <div className="space-y-6">
            <PageMeta title="Special Messages" description="Personalised bulk SMS" />
            <PageBreadcrumb pageTitle="Special Messages" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column: Configuration ── */}
                <div className="lg:col-span-2 space-y-6">
                    <ComponentCard
                        title="Compose Message"
                        desc="Configure your message template and sender details."
                    >
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                                        Sender ID
                                    </label>
                                    <Input
                                        placeholder="ATUpdates"
                                        value={senderId}
                                        onChange={(e) => setSenderId(e.target.value)}
                                        maxLength={11}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Max 11 alphanumeric characters.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                                        Choose Template (optional)
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                        value={template}
                                        onChange={(e) => setTemplate(e.target.value)}
                                    >
                                        <option value="">-- Select a template --</option>
                                        {apiTemplates.map((t) => (
                                            <option key={t.id} value={t.body}>
                                                {t.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                                    Message Content
                                </label>
                                <div className="relative">
                                    <TextArea
                                        rows={6}
                                        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                        placeholder="Hi {{name}}, {{message}}"
                                        value={template}
                                        onChange={(value) => setTemplate(value)}
                                    />
                                    <div className="absolute bottom-3 right-3 flex gap-2">
                                        <Badge color="info">{"{{name}}"}</Badge>
                                        <Badge color="info">{"{{message}}"}</Badge>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Use placeholders to personalize your message for each recipient.
                                </p>
                            </div>
                        </div>
                    </ComponentCard>

                    {/* ── Preview & Send Section ── */}
                    <ComponentCard title="Preview & Send" desc="Review a sample message and send to all recipients.">
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> Message Preview (First Recipient)
                                </h4>
                                {previewMessage ? (
                                    <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300">
                                        {previewMessage}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        Import recipients and write a template to see a preview.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Total Cost: </span>
                                    <span className={`font-bold ${insufficient ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                                        {totalCost.toLocaleString()} UGX
                                    </span>
                                    {insufficient && <span className="text-red-500 ml-2 text-xs">(Insufficient Balance)</span>}
                                </div>

                                <Button
                                    onClick={sendSpecial}
                                    disabled={isSending || rows.length === 0 || insufficient || !template}
                                    className={`w-full sm:w-auto ${insufficient ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin mr-2" />
                                            Sending ({sentCount}/{rows.length})...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send to {rows.length} Recipients
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </ComponentCard>
                </div>

                {/* ── Right Column: Import & Status ── */}
                <div className="lg:col-span-1 space-y-6">
                    <ComponentCard title="Recipients" desc="Import your contact list.">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group ${isDragActive
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
                                : "border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                }`}
                        >
                            <div className="w-12 h-12 mx-auto bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <CloudUpload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">
                                {isDragActive ? "Drop file now" : "Click or drag file"}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                CSV or Excel files supported
                            </p>
                            <input {...getInputProps()} />
                            <Button size="sm" variant="outline" className="mx-auto">
                                Browse Files
                            </Button>
                        </div>

                        {rows.length > 0 && (
                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <span className="font-medium text-green-900 dark:text-green-300">
                                        File Loaded
                                    </span>
                                </div>
                                <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                                    {rows.length} recipients ready.
                                </p>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => setIsReviewOpen(true)}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Review & Edit List
                                </Button>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-500 dark:text-gray-400">Wallet Balance</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{balance.toLocaleString()} UGX</span>
                            </div>
                        </div>
                    </ComponentCard>
                </div>
            </div>

            {/* ────────────────────── Review Modal ────────────────────── */}
            <Modal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                className="max-w-5xl"
            >
                <div className="flex flex-col h-[80vh]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 rounded-t-3xl">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Review Recipients
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Review and edit your recipient list before sending.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsReviewOpen(false)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50 p-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                                            Variable Message
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedRows.map((row) => {
                                        const isEditing = editingRowId === row.id;
                                        return (
                                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {row.name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editValues.message}
                                                            onChange={(e) =>
                                                                setEditValues({ ...editValues, message: e.target.value })
                                                            }
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        <span className="line-clamp-2" title={row.message}>
                                                            {row.message}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editValues.phone}
                                                            onChange={(e) =>
                                                                setEditValues({ ...editValues, phone: e.target.value })
                                                            }
                                                            className="w-full"
                                                        />
                                                    ) : row.phone ? (
                                                        <Badge color="success" variant="light">
                                                            {row.phone}
                                                        </Badge>
                                                    ) : (
                                                        <Badge color="warning" variant="light">
                                                            Missing
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => saveEditing(row.id)}
                                                                    className="h-8 w-8 p-0 rounded-full"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditing}
                                                                    className="h-8 w-8 p-0 rounded-full"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button

                                                                    onClick={() => startEditing(row)}
                                                                    className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button

                                                                    onClick={() => deleteRow(row.id)}
                                                                    className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedRows.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                No recipients found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer & Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-3xl">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            {/* Pagination Controls */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Page {currentPage} of {totalPages || 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4">
                                <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                                    Close Review
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}