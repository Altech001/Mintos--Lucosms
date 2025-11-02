"use client";

import {
  AlertTriangle,
  BrushCleaning,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CloudUploadIcon,
  Eye,
  Loader,
  LucideGalleryHorizontal,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { TrashBinIcon } from "../../icons";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";

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
  const [templateIndex, setTemplateIndex] = useState(0);

  const balance = 730;
  const costPerSms = 32;
  const charLimit = 160;
  const remaining = charLimit - message.length;
  const selectedContactCount = Array.from(selectedGroups).reduce(
    (sum, groupId) => {
      return sum + (groups.find((g) => g.id === groupId)?.contacts.length || 0);
    },
    0
  );
  const totalCost =
    selectedContactCount *
    (messageSegments.length + (message.length > 0 ? 1 : 0)) *
    costPerSms;

  // ──────────────────────────────────────────────────────────────────────
  // File Import
  // ──────────────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
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
          const workbook = XLSX.read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<
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
      setTotalContacts(totalContacts + 1);
    }

    setManualName("");
    setManualPhone("");
    setShowAddNumber(false);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;

    if (
      newMessage.length > CHARACTER_LIMIT &&
      messageSegments.length < MAX_TOTAL_SEGMENTS
    ) {
      setShowOverflowModal(true);
    } else if (newMessage.length <= CHARACTER_LIMIT) {
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
    if (
      selectedGroups.size === 0 ||
      (message.trim() === "" && messageSegments.length === 0)
    )
      return;

    setIsSending(true);
    setShowQueue(true);

    const newQueue: QueueItem[] = Array.from(selectedGroups).map((groupId) => ({
      id: `queue-${groupId}-${Date.now()}`,
      groupId,
      status: "pending" as const,
      progress: 0,
      sentCount: 0,
      totalCount: groups.find((g) => g.id === groupId)?.contacts.length || 0,
    }));

    setQueue(newQueue);

    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];
      const group = groups.find((g) => g.id === item.groupId);
      if (!group) continue;

      item.status = "sending";
      setQueue([...newQueue]);

      for (let j = 0; j < group.contacts.length; j++) {
        const contact = group.contacts[j];
        item.currentContact = `${contact.name} (${contact.phone})`;
        item.sentCount = j + 1;
        item.progress = Math.round(((j + 1) / group.contacts.length) * 100);
        setQueue([...newQueue]);
        await new Promise((resolve) =>
          setTimeout(resolve, 100 + Math.random() * 150)
        );
      }

      item.status = "completed";
      setQueue([...newQueue]);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsSending(false);
    setTimeout(() => {
      setMessage("");
      setSelectedGroups(new Set());
      setQueue([]);
      setShowQueue(false);
    }, 500);
  };

  const sendToSingle = async () => {
    if (
      !sendToSingleNumber.trim() ||
      (message.trim() === "" && messageSegments.length === 0)
    )
      return;

    setIsSending(true);
    setShowQueue(true);

    const queueItem: QueueItem = {
      id: `single-${Date.now()}`,
      groupId: "single",
      status: "sending",
      progress: 0,
      sentCount: 0,
      totalCount: 1,
      currentContact: sendToSingleNumber,
    };

    setQueue([queueItem]);

    for (let i = 0; i < 1; i++) {
      queueItem.sentCount = i + 1;
      queueItem.progress = 100;
      setQueue([queueItem]);
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 300)
      );
    }

    queueItem.status = "completed";
    setQueue([queueItem]);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSending(false);
    setSendToSingleNumber("");
    setTimeout(() => {
      setShowSendSingleModal(false);
      setQueue([]);
      setShowQueue(false);
    }, 500);
  };

  // ──────────────────────────────────────────────────────────────────────
  // Dummy Data
  // ──────────────────────────────────────────────────────────────────────

  const dummyTemplates: Template[] = [
    {
      id: "1",
      title: "Welcome",
      body: "Welcome to our service! Enjoy 10% off your first purchase.",
      category: "Promotions",
    },
    {
      id: "2",
      title: "Payment Reminder",
      body: "Your invoice is due in 3 days. Pay now to avoid late fees.",
      category: "Billing",
    },
    {
      id: "3",
      title: "Appointment",
      body: "Your appointment is confirmed for tomorrow at 10 AM.",
      category: "Reminders",
    },
    {
      id: "4",
      title: "Birthday",
      body: "Happy Birthday! Here’s a special gift just for you.",
      category: "Greetings",
    },
  ];

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb & Meta */}
      <PageMeta title="Compose SMS" description="Send SMS to your contacts" />
      <PageBreadcrumb pageTitle="Compose Messages" />
      <ComponentCard
        title="Bulk Message Compose"
        desc="Import contacts, compose messages, and send messages in bulk with ease."
      >
        <div className="min-h-auto p-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ────────────────────── LEFT: Groups ────────────────────── */}
            <div className="lg:col-span-1">
              <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 rounded-2xl p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    Contacts ({groups.length})
                  </h3>
                  <Button onClick={() => setShowAddNumber(true)}>
                    <Plus className="w-4 h-4" />
                    Add Number
                  </Button>
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
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
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

                <div className="space-y-2 border-t border-gray-300 dark:border-gray-700 pt-4">
                  <Button onClick={selectAllGroups} className="w-full">
                    {selectedGroups.size === groups.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

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
                    <div className="float-right gap-2 flex">
                      <Button onClick={selectAllGroups} variant="outline">
                        <BrushCleaning className="w-6 h-6 text-gray-400 cursor-pointer float-right mr-2" />
                        {selectedGroups.size === groups.length
                          ? "Deselect All"
                          : "Select All"}
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
                  <textarea
                    className="w-full h-40 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Y`ello, Luco type message."
                    value={message}
                    onChange={handleMessageChange}
                    cols={30}
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
                    <span className="text-gray-400">
                      Balance: {balance} UGX
                    </span>
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
                        (message.trim() === "" && messageSegments.length === 0)
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
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-brand-500" : "border-gray-600 "
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
              <div className="flex overflow-x-auto gap-4 p-4 snap-x snap-mandatory scroll-smooth no-scrollbar">
                {dummyTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="snap-center shrink-0 w-80 bg-gray-800 rounded-xl p-5 cursor-pointer hover:ring-2 hover:ring-brand-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">
                        {template.title}
                      </h4>
                      <Badge size="sm" color="success">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {template.body}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTemplateIndex(Math.max(0, templateIndex - 1))}
                disabled={templateIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 p-2 rounded-full disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setTemplateIndex(
                    Math.min(dummyTemplates.length - 1, templateIndex + 1)
                  )
                }
                disabled={templateIndex === dummyTemplates.length - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 p-2 rounded-full disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </ComponentCard>
      </Modal>

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
                    className={`p-4 rounded-xl border-2 ${
                      isSingle
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
                        className={`h-full rounded-full transition-all ${
                          item.status === "completed"
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
                ?.contacts.map((c, i) => (
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
                        {c.phone}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
