/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  AlertTriangle,
  BrushCleaning,
  CheckCircle,
  ChevronRight,
  CloudUpload,
  CloudUploadIcon,
  Eye,
  Loader,
  LucideGalleryHorizontal,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  SpellCheckIcon,
  Users,
  X
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import useCustomToast from "../../hooks/useCustomToast";
import { TrashBinIcon } from "../../icons";
import type { ContactGroupsPublic, TemplatePublic, TemplatesPublic } from "../../lib/api";
import { apiClient } from "../../lib/api/client";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ContactGroup {
  id: string;
  number: number;
  contacts: Contact[];
  startIndex: number;
  endIndex: number;
}

interface Template {
  id: string;
  title: string;
  body: string;
  category: string;
}

interface QueueItem {
  id: string;
  groupId: string;
  status: "pending" | "sending" | "completed" | "failed";
  progress: number;
  sentCount: number;
  totalCount: number;
  currentContact?: string;
}

const CHUNK_SIZE = 100;
const CHARACTER_LIMIT = 160;
const MAX_TOTAL_SEGMENTS = 10;

const ColorVariants = [
  {
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    badge: "bg-cyan-100 text-cyan-700",
    accent: "text-cyan-600",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-300",
    badge: "bg-purple-100 text-purple-700",
    accent: "text-purple-600",
  },
  {
    bg: "bg-green-50",
    border: "border-green-300",
    badge: "bg-green-100 text-green-700",
    accent: "text-green-600",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-300",
    badge: "bg-orange-100 text-orange-700",
    accent: "text-orange-600",
  },
  {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    badge: "bg-yellow-100 text-yellow-700",
    accent: "text-yellow-600",
  },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    badge: "bg-indigo-100 text-indigo-700",
    accent: "text-indigo-600",
  },
];

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function ComposePage() {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSendSingleModal, setShowSendSingleModal] = useState(false);
  const [sendToSingleNumber, setSendToSingleNumber] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [messageSegments, setMessageSegments] = useState<string[]>([]);
  const [showOverflowModal, setShowOverflowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGroupImport, setShowGroupImport] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showChooseBatch, setShowChooseBatch] = useState(false);
  const [isGroupImporting, setIsGroupImporting] = useState(false);
  const templatesScrollerRef = useRef<HTMLDivElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [senderId, setSenderId] = useState<string>("");
  const [showUseNumbersModal, setShowUseNumbersModal] = useState(false);
  const [rawNumbersInput, setRawNumbersInput] = useState("");

  // Helpers: API error handling
  const isAuthError = (err: unknown) => {
    if (typeof err === 'object' && err !== null) {
      const obj = err as Record<string, unknown>;
      const status = typeof obj.status === 'number' ? obj.status : undefined;
      const msg = typeof obj.message === 'string' ? obj.message : undefined;
      if (status === 401 || status === 403) return true;
      if (msg && /(401|403|unauthor)/i.test(msg)) return true;
    }
    return false;
  };

  const errorMessage = (err: unknown, fallback = 'Something went wrong') => {
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && err !== null) {
      const obj = err as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
    }
    return fallback;
  };

  // Format phone numbers to E.164 format (+256xxxxxxxxx)
  // Handles various input formats:
  // - 7xx, 70x, 77x, 78x, 79x → +2567xx
  // - 070x, 075x, 077x, 078x, 079x → +2567xx (removes leading 0)
  // - 2567xx → +2567xx
  // - +2567xx → +2567xx (already formatted)
  const DEFAULT_CC = (import.meta as any).env?.VITE_DEFAULT_COUNTRY_CODE as string | undefined;
  const normalizePhones = (raw: string[]): { valid: string[]; invalid: number } => {
    const result = new Set<string>();
    let invalid = 0;

    for (const n of raw) {
      let input = (n || '').toString().trim();
      if (!input) {
        invalid++;
        continue;
      }

      // Remove all non-digit characters except +
      input = input.replace(/[^+\d]/g, '');

      // Format Uganda numbers to +256 format
      // Case 1: Starts with 7 (local format without 0) → +2567xx
      if (/^7\d{8}$/.test(input)) {
        input = '+256' + input;
      }
      // Case 2: Starts with 07 (local format with 0) → +2567xx (remove leading 0)
      else if (/^07\d{8}$/.test(input)) {
        input = '+256' + input.substring(1);
      }
      // Case 3: Starts with 256 (country code without +) → +2567xx
      else if (/^256\d{9}$/.test(input)) {
        input = '+' + input;
      }
      // Case 4: Already has + prefix → validate it
      else if (input.startsWith('+')) {
        // Keep as is, will be validated below
      }
      // Case 5: Short numbers like just "7" or "70" → add +256
      else if (/^7\d*$/.test(input) && input.length < 9) {
        input = '+256' + input;
      }
      // Case 6: Starts with 0 but not 07 pattern → remove 0 and add +256
      else if (/^0\d+$/.test(input)) {
        input = '+256' + input.substring(1);
      }

      try {
        // Parse and validate using libphonenumber-js
        const pn = input.startsWith('+')
          ? parsePhoneNumberFromString(input)
          : parsePhoneNumberFromString((DEFAULT_CC || '+256') + input.replace(/^0+/, ''));

        if (!pn || !pn.isValid()) {
          invalid++;
          continue;
        }

        const e164 = pn.number; // E.164 format: +CCCxxxxxxxxx

        // Only accept Uganda numbers (+256)
        if (!e164.startsWith('+256')) {
          invalid++;
          continue;
        }

        result.add(e164);
      } catch {
        invalid++;
      }
    }

    return { valid: Array.from(result), invalid };
  };

  // Fetch user stats (wallet balance and sms cost)
  const statsQuery = useQuery({
    queryKey: ["userStats"],
    queryFn: async () => apiClient.api.userData.userDataGetUserStats(),
    staleTime: 30_000,
  });

  const balance = Number(statsQuery.data?.walletBalance ?? 0);
  const costPerSms = Number(statsQuery.data?.smsCost ?? 32);
  const charLimit = 160;
  const remaining = charLimit - message.length;
  const selectedContactCount = Array.from(selectedGroups).reduce(
    (sum, groupId) => {
      return sum + (groups.find((g) => g.id === groupId)?.contacts.length || 0);
    },
    0
  );
  const totalSegments = messageSegments.length + (message.trim().length > 0 ? 1 : 0);
  const totalCost = selectedContactCount * totalSegments * costPerSms;
  const isInsufficient = !statsQuery.isLoading && totalCost > balance;

  // ──────────────────────────────────────────────────────────────────────
  // File Import
  // ──────────────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        let contacts: Contact[] = [];

        if (file.name.endsWith(".csv")) {
          const text = data as string;
          const lines = text.split("\n").filter((line) => line.trim());
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());

          contacts = lines.slice(1).map((line, idx) => {
            const values = line
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));
            return {
              id: `import-${Date.now()}-${idx}`,
              name: values[headers.indexOf("name")] || values[0] || "N/A",
              phone: values[headers.indexOf("phone")] || values[2] || "",
              email: values[headers.indexOf("email")] || values[1] || "",
            };
          });
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const { read, utils } = await import("xlsx");
          const workbook = read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = utils.sheet_to_json(worksheet) as Record<
            string,
            string
          >[];

          contacts = jsonData.map((row, idx) => ({
            id: `import-${Date.now()}-${idx}`,
            name:
              row.name ||
              row.Name ||
              row.NAME ||
              row.contact ||
              row.Contact ||
              "N/A",
            phone: row.phone || row.Phone || row.PHONE || "",
            email: row.email || row.Email || row.EMAIL || "",
          }));
        }

        contacts = contacts.filter((c) => c.phone && c.phone !== "undefined");

        setTotalContacts(contacts.length);

        const newGroups: ContactGroup[] = [];
        for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
          const chunk = contacts.slice(i, i + CHUNK_SIZE);
          newGroups.push({
            id: `group-${newGroups.length}`,
            number: newGroups.length + 1,
            contacts: chunk,
            startIndex: i + 1,
            endIndex: Math.min(i + CHUNK_SIZE, contacts.length),
          });
        }

        setGroups(newGroups);
        setShowImport(false);
      } catch (error) {
        alert(`Error processing file: ${error}`);
      }
    };

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // API Fetches: Templates and Contact Groups
  // ──────────────────────────────────────────────────────────────────────
  const templatesQuery = useQuery<TemplatesPublic>({
    queryKey: ["templates", 0, 100],
    queryFn: async () => apiClient.api.templates.templatesReadTemplates({ skip: 0, limit: 100 }),
    staleTime: 60_000,
  });

  const contactGroupsQuery = useQuery<ContactGroupsPublic>({
    queryKey: ["contactGroups"],
    queryFn: async () => apiClient.api.contacts.contactsGetContactGroups({}),
    enabled: showGroupImport,
    staleTime: 60_000,
  });



  const importContactsFromGroup = useCallback(async (backendGroupId: string) => {
    // Fetch contacts for selected backend group (paginate if needed)
    setIsGroupImporting(true);
    try {
      const limit = 1000;
      // Single fetch first; expand if backend supports pagination total
      const resp = await apiClient.api.contacts.contactsGetGroupContacts({ groupId: backendGroupId, skip: 0, limit });
      const all = resp.data;

      // Map to local Contact type
      const imported: Contact[] = all.map((c) => ({
        id: `api-${c.id}`,
        name: (c.name || "N/A"),
        phone: c.phone,
        email: c.email || "",
      }));

      // Create batches of CHUNK_SIZE and append to existing groups
      const newGroups: ContactGroup[] = [];
      const existingCount = totalContacts;
      for (let i = 0; i < imported.length; i += CHUNK_SIZE) {
        const chunk = imported.slice(i, i + CHUNK_SIZE);
        const startIndex = existingCount + i + 1;
        const endIndex = existingCount + i + chunk.length;
        newGroups.push({
          id: `group-${groups.length + newGroups.length}`,
          number: groups.length + newGroups.length + 1,
          contacts: chunk,
          startIndex,
          endIndex,
        });
      }

      if (newGroups.length > 0) {
        setGroups(prev => [...prev, ...newGroups]);
        setTotalContacts(prev => prev + imported.length);
        showSuccessToast(`Imported ${imported.length} contacts in ${newGroups.length} batch(es).`);
      } else {
        showErrorToast("Selected group has no contacts to import.");
      }
      setShowGroupImport(false);
    } catch (e) {
      const err = e as Error;
      showErrorToast(err.message || "Failed to import contacts from group.");
    } finally {
      setIsGroupImporting(false);
    }
  }, [groups.length, totalContacts, showSuccessToast, showErrorToast]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        parseFile(acceptedFiles[0]);
      }
    },
    [parseFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map((g) => g.id)));
    }
  };

  const applyTemplate = (template: Template) => {
    setMessage(template.body);
    setShowTemplates(false);
    setSelectedTemplateId(template.id);
  };

  const addManualContact = () => {
    if (!manualPhone.trim()) return;

    const newContact: Contact = {
      id: `manual-${Date.now()}`,
      name: manualName.trim() || "Manual Entry",
      phone: manualPhone.trim(),
    };

    if (groups.length === 0) {
      setGroups([
        {
          id: "group-0",
          number: 1,
          contacts: [newContact],
          startIndex: 1,
          endIndex: 1,
        },
      ]);
      setTotalContacts(1);
    } else {
      if (selectedBatchId) {
        const idx = groups.findIndex(g => g.id === selectedBatchId);
        if (idx >= 0) {
          const target = groups[idx];
          if (target.contacts.length < CHUNK_SIZE) {
            target.contacts.push(newContact);
            target.endIndex += 1;
            setGroups([...groups]);
          } else {
            alert("Selected batch is full. Please choose another batch.");
            return;
          }
        } else {
          // fallback to last group
          const lastGroup = groups[groups.length - 1];
          if (lastGroup.contacts.length < CHUNK_SIZE) {
            lastGroup.contacts.push(newContact);
            lastGroup.endIndex += 1;
            setGroups([...groups]);
          } else {
            const newGroup: ContactGroup = {
              id: `group-${groups.length}`,
              number: groups.length + 1,
              contacts: [newContact],
              startIndex: totalContacts + 1,
              endIndex: totalContacts + 1,
            };
            setGroups([...groups, newGroup]);
          }
        }
      } else {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup.contacts.length < CHUNK_SIZE) {
          lastGroup.contacts.push(newContact);
          lastGroup.endIndex += 1;
          setGroups([...groups]);
        } else {
          const newGroup: ContactGroup = {
            id: `group-${groups.length}`,
            number: groups.length + 1,
            contacts: [newContact],
            startIndex: totalContacts + 1,
            endIndex: totalContacts + 1,
          };
          setGroups([...groups, newGroup]);
        }
      }
      setTotalContacts(totalContacts + 1);
    }

    setManualName("");
    setManualPhone("");
    setShowAddNumber(false);
  };

  const handleMessageChange = (newMessage: string) => {
    if (
      newMessage.length > CHARACTER_LIMIT &&
      messageSegments.length < MAX_TOTAL_SEGMENTS
    ) {
      setShowOverflowModal(true);
    } else if (newMessage.length <= CHARACTER_LIMIT) {
      // If the user manually edits the message, treat it as a custom SMS
      if (selectedTemplateId) setSelectedTemplateId(null);
      setMessage(newMessage);
    } else {
      alert(`Maximum ${MAX_TOTAL_SEGMENTS} segments allowed`);
    }
  };

  const createNewSegment = () => {
    setMessageSegments([...messageSegments, message]);
    setMessage("");
    setShowOverflowModal(false);
  };

  const sendMessages = async () => {
    // Validate
    const finalMessage = [...messageSegments, message].join("").trim();
    if (selectedGroups.size === 0) {
      showErrorToast("Please select at least one group.");
      return;
    }
    if (finalMessage === "") {
      showErrorToast("Message cannot be empty.");
      return;
    }

    if (isInsufficient) {
      showErrorToast("Insufficient balance to send these messages.");
      return;
    }

    // Gather unique recipient numbers from selected groups
    const selectedIds = new Set(selectedGroups);
    const rawTo: string[] = groups
      .filter((g) => selectedIds.has(g.id))
      .flatMap((g) => g.contacts.map((c) => c.phone).filter(Boolean));
    const { valid: to, invalid } = normalizePhones(rawTo);

    if (to.length === 0) {
      showErrorToast("No valid phone numbers found in the selected groups.");
      return;
    }

    // Validate Sender ID (optional). Default if empty
    const sid = (senderId.trim() || 'ATUpdates');
    if (!/^[A-Za-z0-9]{3,11}$/.test(sid)) {
      showErrorToast("Sender ID must be 3-11 alphanumeric characters.");
      return;
    }

    setIsSending(true);
    try {
      await apiClient.api.sms.smsSendSms({
        sendSMSRequest: {
          to,
          message: finalMessage,
          templateId: selectedTemplateId || undefined,
          from: sid,
          enqueue: true,
        },
      });
      if (invalid > 0) {
        showSuccessToast(`Queued ${to.length} SMS. Skipped ${invalid} invalid number(s).`);
      } else {
        showSuccessToast(`Queued SMS to ${to.length} recipient(s).`);
      }

      // Reset state
      setMessage("");
      setMessageSegments([]);
      setSelectedTemplateId(null);
      setSelectedGroups(new Set());
      setQueue([]);
      setSenderId("");
    } catch (e) {
      if (isAuthError(e)) {
        showErrorToast("You must be signed in to send SMS.");
      } else {
        showErrorToast(errorMessage(e, "Failed to send SMS."));
      }
    } finally {
      setIsSending(false);
    }
  };

  const sendToSingle = async () => {
    const finalMessage = [...messageSegments, message].join("").trim();
    const toNumber = sendToSingleNumber.trim();
    if (!toNumber) {
      showErrorToast("Please enter a recipient number.");
      return;
    }
    if (finalMessage === "") {
      showErrorToast("Message cannot be empty.");
      return;
    }

    const required = totalSegments * costPerSms; // single recipient
    if (required > balance) {
      showErrorToast("Insufficient balance to send this message.");
      return;
    }

    // Validate Sender ID (optional). Default if empty
    const sid = (senderId.trim() || 'ATUpdates');
    if (!/^[A-Za-z0-9]{3,11}$/.test(sid)) {
      showErrorToast("Sender ID must be 3-11 alphanumeric characters.");
      return;
    }

    setIsSending(true);
    try {
      const normalized = normalizePhones([toNumber]);
      if (normalized.valid.length === 0) {
        showErrorToast("Invalid phone number.");
        setIsSending(false);
        return;
      }
      await apiClient.api.sms.smsSendSms({
        sendSMSRequest: {
          to: normalized.valid,
          message: finalMessage,
          templateId: selectedTemplateId || undefined,
          from: sid,
          enqueue: true,
        },
      });
      showSuccessToast(`Queued SMS to ${normalized.valid[0]}.`);

      setSendToSingleNumber("");
      setMessage("");
      setMessageSegments([]);
      setSelectedTemplateId(null);
      setShowSendSingleModal(false);
      setQueue([]);
    } catch (e) {
      const err = e as Error;
      showErrorToast(err.message || "Failed to send SMS.");
    } finally {
      setIsSending(false);
    }
  };

  const handleProcessNumbers = () => {
    const rawList = rawNumbersInput.split(/[\n,;\s]+/).filter(s => s.trim());
    const { valid, invalid } = normalizePhones(rawList);

    if (valid.length === 0) {
      showErrorToast("No valid phone numbers found.");
      return;
    }

    const newContacts: Contact[] = valid.map((phone, idx) => ({
      id: `manual-bulk-${Date.now()}-${idx}`,
      name: `Number ${idx + 1}`,
      phone: phone,
    }));

    const newGroup: ContactGroup = {
      id: `group-manual-${Date.now()}`,
      number: groups.length + 1,
      contacts: newContacts,
      startIndex: totalContacts + 1,
      endIndex: totalContacts + newContacts.length,
    };

    setGroups([...groups, newGroup]);
    setTotalContacts(prev => prev + newContacts.length);
    setSelectedGroups(prev => new Set(prev).add(newGroup.id));

    showSuccessToast(`Added ${valid.length} numbers. ${invalid > 0 ? `Skipped ${invalid} invalid.` : ''}`);

    setRawNumbersInput("");
    setShowUseNumbersModal(false);
  };

  // ──────────────────────────────────────────────────────────────────────
  // Templates from API → map to local Template interface
  const apiTemplates: Template[] = (templatesQuery.data?.data || []).map((t: TemplatePublic) => ({
    id: t.id,
    title: t.name,
    body: t.content,
    category: t.tag || "General",
  }));

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb & Meta */}
      <PageMeta title="Compose Messages" description="Send SMS to your contacts" />
      <PageBreadcrumb pageTitle="Compose Messages" />
      <ComponentCard
        title="Bulk Message Compose"
        desc="Import contacts, compose messages, use templates, and send messages in bulk with ease."
      >
        <div className="min-h-auto p-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ────────────────────── LEFT: Groups ────────────────────── */}
            <div className="lg:col-span-1">
              <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 rounded-2xl p-5 h-full max-h-[75vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    Contacts ({groups.length})
                  </h3>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setShowImport(true)}
                      className="flex items-center flex-col gap-2 text-brand-500 text-sm hover:underline mt-1"
                    >
                      <CloudUpload />
                      Re Import
                    </button>
                    <Button onClick={() => setShowAddNumber(true)}>
                      <Plus className="w-4 h-4" />
                      Add Number
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                  {groups.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      <Users className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                      <p className="text-sm text-gray-400">No groups yet</p>
                      <button
                        onClick={() => setShowImport(true)}
                        className="text-brand-400 text-sm hover:underline mt-1"
                      >
                        Import contacts to get started
                      </button>
                    </div>
                  ) : (
                    groups.map((group, idx) => {
                      const color = ColorVariants[idx % ColorVariants.length];
                      const isSelected = selectedGroups.has(group.id);

                      return (
                        <div
                          key={group.id}
                          onClick={() => toggleGroupSelection(group.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                            ? `${color.border} `
                            : "border-gray-200 dark:border-gray-700 bg-transparent   hover:border-gray-300"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-full ${color.badge}`}
                            >
                              {group.number}
                            </span>
                            <Badge color="success"> Batch {group.number}</Badge>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <p className="font-medium dark:text-white p-1">
                            {group.contacts.length} contacts
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            #{group.startIndex} - #{group.endIndex}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPreview(group.id);
                            }}
                            className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <Button
                  onClick={() => setShowGroupImport(true)}
                  variant="outline"
                >
                  <Users className="w-4 h-4" />
                  Import From Group
                </Button>

                <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedContactCount} contact
                    {selectedContactCount !== 1 ? "s" : ""} selected
                  </p>
                </div>
              </div>
            </div>

            {/* ────────────────────── RIGHT: Compose ────────────────────── */}
            <div className="lg:col-span-2">
              <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] rounded-2xl p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    Composing to {selectedContactCount} contact
                    {selectedContactCount !== 1 ? "s" : ""}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowUseNumbersModal(true)}
                      variant="primary"
                    >
                      <SpellCheckIcon className="w-4 h-4" />
                      Use Numbers
                    </Button>
                    <Button
                      onClick={() => setShowTemplates(true)}
                      variant="outline"
                    >
                      <LucideGalleryHorizontal className="w-4 h-4 text-blue-500" />
                      Use Template
                    </Button>
                    <Button
                      onClick={() => setSelectedGroups(new Set())}
                      variant="outline"
                    >
                      <TrashBinIcon className="w-4 h-4 text-red-500" />
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Recipients */}
                <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 min-h-20">
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        To: {selectedGroups.size} group
                        {selectedGroups.size !== 1 ? "s" : ""}
                      </p>
                      <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
                        {selectedContactCount} contact
                        {selectedContactCount !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                    <div className="float-right gap-2 flex items-center">
                      <Input
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value)}
                        placeholder="Sender ID / ATUpdates"

                        maxLength={11}
                      />
                      <Button onClick={selectAllGroups} variant="outline">
                        <BrushCleaning className="w-6 h-6 text-gray-400 cursor-pointer float-right mr-2" />
                        {selectedGroups.size === groups.length
                          ? "Deselect Batch"
                          : "Select All"
                        }
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedGroups(new Set())}
                      >
                        <TrashBinIcon className="w-6 h-6 text-red-500 cursor-pointer float-right" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Message Segments */}
                {messageSegments.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-purple-900/20 border border-purple-700 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-purple-300">
                        Segments ({messageSegments.length})
                      </p>
                      <Button
                        onClick={() => {
                          setMessageSegments([]);
                          setMessage("");
                        }}
                        variant="outline"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {messageSegments.map((seg, i) => (
                        <div
                          key={i}
                          className="text-xs dabg-gray-800 p-2 rounded"
                        >
                          <span className="text-purple-400">Part {i + 1}:</span>{" "}
                          {seg.substring(0, 50)}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="flex-1 mb-4">
                  <TextArea
                    className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Y`ello, Luco Type message Here."
                    value={message}
                    onChange={handleMessageChange}
                  />
                </div>

                {/* Attach */}
                <div className="flex items-center gap-3 mb-4 text-gray-400">
                  <button className="flex items-center gap-1 text-sm hover:text-white">
                    <Paperclip className="w-4 h-4" />
                    SMS Segment
                  </button>
                  <button className="flex items-center gap-1 text-sm hover:text-white">
                    {messageSegments.length + (message.length > 0 ? 1 : 0)}
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <span
                      className={
                        remaining < 0 ? "text-red-400" : "text-gray-400"
                      }
                    >
                      {Math.abs(remaining)} characters{" "}
                      {remaining < 0 ? "over" : "remaining"}
                    </span>
                    <span className="text-gray-400">Cost: {totalCost} UGX</span>
                    <span className={isInsufficient ? "text-red-400" : "text-gray-400"}>
                      Balance: {balance} UGX
                    </span>
                    {isInsufficient && (
                      <span className="text-red-500 font-medium">Insufficient balance</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowQueue(!showQueue)}
                      variant="outline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Queue ({queue.length})
                    </Button>
                    <Button
                      onClick={sendMessages}
                      disabled={
                        isSending ||
                        selectedGroups.size === 0 ||
                        (message.trim() === "" && messageSegments.length === 0) ||
                        isInsufficient
                      }
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>
      {/* ────────────────────── Import Modal ────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-brand-500" : "border-gray-600 "
                }`}
            >
              {/* <Input {...getInputProps()} /> */}
              <CloudUploadIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium dark:text-white mb-2">
                {isDragActive
                  ? "Drop the file here..."
                  : "Drag & Drop File Here"}
              </p>
              <p className="text-sm text-gray-400 mb-4">CSV, XLS, XLSX</p>
              <input {...getInputProps()} />
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                Browse File
              </button>
            </div>
            <div className="mt-4 text-center">
              <Button
                onClick={() => setShowImport(false)}
                className="text-sm text-gray-500 hover:text-white w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── Add Number Modal ────────────────────── */}
      {showAddNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Name (Optional)
              </label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Luco Mintos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Phone
              </label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="+256 700 123456 / 070 0123456"
              />
            </div>
            {groups.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Optional: choose a batch to add this number</span>
                <Button variant="outline" size="sm" onClick={() => setShowChooseBatch(true)}>Choose Batch</Button>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowAddNumber(false);
                  setManualName("");
                  setManualPhone("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={addManualContact}
                disabled={!manualPhone.trim()}
                variant="primary"
              >
                Add Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Choose Batch Modal */}
      {showChooseBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Select Batch</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedBatchId(g.id); setShowChooseBatch(false); }}
                  disabled={g.contacts.length >= CHUNK_SIZE}
                  className={`w-full text-left p-3 rounded border ${selectedBatchId === g.id ? "border-brand-500" : "border-gray-300 dark:border-gray-700"} ${g.contacts.length >= CHUNK_SIZE ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Batch {g.number}</span>
                    <span className="text-xs text-gray-500">{g.contacts.length}/{CHUNK_SIZE}</span>
                  </div>
                  <div className="text-xs text-gray-500">Range #{g.startIndex} - #{g.endIndex}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowChooseBatch(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── Overflow Modal ────────────────────── */}
      {showOverflowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Message Too Long
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your message exceeds {CHARACTER_LIMIT} characters. Save as a new
              segment?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowOverflowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createNewSegment}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Create Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── Send to Single Modal ────────────────────── */}
      {showSendSingleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Send to Single Number
            </h3>
            <Input
              type="tel"
              value={sendToSingleNumber}
              onChange={(e) => setSendToSingleNumber(e.target.value)}
              placeholder="+256 700 123456"
              className=""
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendSingleModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendToSingle}
                disabled={isSending}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────── Templates Modal ────────────────────── */}
      <Modal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        className="max-w-3xl"
      >
        <ComponentCard title="Choose Your Template" desc="Templates from Archive.">
          <div className="p-8">
            <div className="relative">
              <div
                ref={templatesScrollerRef}
                className="flex overflow-x-auto gap-4 p-4 snap-x snap-mandatory scroll-smooth no-scrollbar"
              >
                {templatesQuery.isLoading && (
                  <div className="text-sm text-gray-400">Loading templates...</div>
                )}
                {!templatesQuery.isLoading && apiTemplates.length === 0 && (
                  <div className="text-sm text-gray-400">No templates found.</div>
                )}
                {apiTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="snap-center shrink-0 w-72  border border-gray-700/60 rounded-xl p-4 cursor-pointer hover:border-brand-500/60 hover:shadow-md transition"
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-300">{template.category}</div>
                    <div className="text-gray-900 dark:text-gray-300 font-semibold">{template.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{template.body}</div>
                  </div>
                ))}
              </div>
              {/* Left arrow */}
              <button
                type="button"
                aria-label="Scroll templates left"
                onClick={() => templatesScrollerRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800/80 hover:bg-brand-700 text-white p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              {/* Right arrow */}
              <button
                type="button"
                aria-label="Scroll templates right"
                onClick={() => templatesScrollerRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800/80 hover:bg-brand-700 text-white p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </ComponentCard>
      </Modal>

      {/* ────────────────────── Group Import Modal ────────────────────── */}
      {showGroupImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import From Contact Group</h3>
              <button
                onClick={() => setShowGroupImport(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contactGroupsQuery.isLoading && (
              <div className="text-sm text-gray-400">Loading groups...</div>
            )}

            {contactGroupsQuery.isError && (
              <div className="text-sm text-red-400">Failed to load groups.</div>
            )}

            {!contactGroupsQuery.isLoading && !contactGroupsQuery.isError && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(contactGroupsQuery.data?.data || []).length === 0 ? (
                  <div className="text-sm text-gray-400">No groups available.</div>
                ) : (
                  (contactGroupsQuery.data?.data || []).map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{g.name}</div>
                        {typeof g.contactCount === 'number' && (
                          <div className="text-xs text-gray-500">{g.contactCount} contacts</div>
                        )}
                      </div>
                      <Button
                        onClick={() => importContactsFromGroup(g.id)}
                        disabled={isGroupImporting}
                        variant="outline"
                      >
                        {isGroupImporting ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" /> Importing...
                          </>
                        ) : (
                          <>Import</>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowGroupImport(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── Queue Modal ────────────────────── */}
      {showQueue && queue.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-96 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Sending Queue
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {queue.map((item) => {
                const group = groups.find((g) => g.id === item.groupId);
                const idx = groups.findIndex((g) => g.id === item.groupId);
                const color =
                  idx >= 0
                    ? ColorVariants[idx % ColorVariants.length]
                    : ColorVariants[0];
                const isSingle = item.groupId === "single";

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border-2 ${isSingle
                      ? "border-green-300 bg-green-50"
                      : `${color.border} ${color.bg}`
                      }`}
                  >
                    <div className="flex justify-between mb-2">
                      <p className="font-medium">
                        {isSingle ? "Single Contact" : `Group ${group?.number}`}
                      </p>
                      {item.status === "completed" && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {item.status === "sending" && (
                        <Loader className="w-5 h-5 text-brand-600 animate-spin" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {item.sentCount} / {item.totalCount}
                    </p>
                    {item.currentContact && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {item.currentContact}
                      </p>
                    )}
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${item.status === "completed"
                          ? "bg-green-600"
                          : "bg-brand-600"
                          }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {!isSending && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────── Preview Modal ────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999999 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-white">
                Preview Group
              </h3>
              <button onClick={() => setShowPreview(null)}>
                <X className="w-5 h-5 font-bold dark:text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {groups
                .find((g) => g.id === showPreview)
                ?.contacts.map((c, i) => {
                  // Format phone number for display
                  const formatted = normalizePhones([c.phone]);
                  const displayPhone = formatted.valid.length > 0 ? formatted.valid[0] : c.phone;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:text-white text-xs dark:bg-gray-700 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-brand-600  rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {displayPhone}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────── Use Numbers Modal ────────────────────── */}
      {showUseNumbersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Paste Numbers
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Paste your phone numbers below. They will be automatically formatted to +256.
              Separated by newlines, commas, or spaces.
            </p>
            <TextArea
              className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="0771234567&#10;0701234567&#10;+256781234567"
              value={rawNumbersInput}
              onChange={(val) => setRawNumbersInput(val)}
            />
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowUseNumbersModal(false);
                  setRawNumbersInput("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessNumbers}
                disabled={!rawNumbersInput.trim()}
                variant="primary"
              >
                Process Numbers
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
