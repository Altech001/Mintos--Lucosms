"use client"

import type React from "react"

import { CheckCircle, Eye, Loader, MessageCircle, Phone, Plus, Send, Upload, User, X } from "lucide-react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
// Dynamically import xlsx when needed to reduce bundle size

interface Contact {
  name: string
  email: string
  phone?: string
}

interface ContactGroup {
  id: string
  number: number
  contacts: Contact[]
  startIndex: number
  endIndex: number
}

interface QueueItem {
  id: string
  groupId: string
  status: "pending" | "sending" | "completed" | "failed"
  progress: number
  sentCount: number
  totalCount: number
  currentContact?: string
}

const CHUNK_SIZE = 100

const ColorVariants = [
  {
    bg: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/50",
    badge: "bg-cyan-500/30 text-cyan-200",
    accent: "text-cyan-400",
  },
  {
    bg: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/50",
    badge: "bg-purple-500/30 text-purple-200",
    accent: "text-purple-400",
  },
  {
    bg: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/50",
    badge: "bg-green-500/30 text-green-200",
    accent: "text-green-400",
  },
  {
    bg: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/50",
    badge: "bg-orange-500/30 text-orange-200",
    accent: "text-orange-400",
  },
  {
    bg: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/50",
    badge: "bg-yellow-500/30 text-yellow-200",
    accent: "text-yellow-400",
  },
  {
    bg: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500/50",
    badge: "bg-indigo-500/30 text-indigo-200",
    accent: "text-indigo-400",
  },
]

interface CharacterLimitState {
  showOverflowModal: boolean
  overflowAction: "create-segment" | null
}

const CHARACTER_LIMIT = 160
const MAX_TOTAL_SEGMENTS = 10

export default function MessagingApp() {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [, setFileName] = useState<string>("")
  const [totalContacts, setTotalContacts] = useState<number>(0)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isSending, setIsSending] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showAddNumber, setShowAddNumber] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [overflowModal, setOverflowModal] = useState<CharacterLimitState>({
    showOverflowModal: false,
    overflowAction: null,
  })
  const [messageSegments, setMessageSegments] = useState<string[]>([])
  const [showImportModal, setShowImportModal] = useState(true) // Show import modal on load
  const [sendToSingleNumber, setSendToSingleNumber] = useState<string>("")
  const [showSendSingleModal, setShowSendSingleModal] = useState(false)
  // const queueIntervalRef = useRef<NodeJS.Timeout>()

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        let contacts: Contact[] = []

        if (file.name.endsWith(".csv")) {
          const text = data as string
          const lines = text.split("\n").filter((line) => line.trim())
          const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

          contacts = lines.slice(1).map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
            return {
              name: values[headers.indexOf("name")] || values[0] || "N/A",
              email: values[headers.indexOf("email")] || values[1] || "N/A",
              phone: values[headers.indexOf("phone")] || values[2],
            }
          })
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const { read, utils } = await import("xlsx")
          const workbook = read(data as string, { type: "binary" })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = utils.sheet_to_json(worksheet) as Record<string, string>[]

          contacts = jsonData.map((row) => ({
            name: row.name || row.Name || row.NAME || row.contact || row.Contact || "N/A",
            email: row.email || row.Email || row.EMAIL || row.e_mail || row.E_mail || "N/A",
            phone: row.phone || row.Phone || row.PHONE,
          }))
        }

        contacts = contacts.filter((c) => (c.email && c.email !== "N/A") || (c.phone && c.phone !== "undefined"))

        setTotalContacts(contacts.length)
        setFileName(file.name)

        const newGroups: ContactGroup[] = []
        for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
          const chunk = contacts.slice(i, i + CHUNK_SIZE)
          newGroups.push({
            id: `group-${newGroups.length}`,
            number: newGroups.length + 1,
            contacts: chunk,
            startIndex: i + 1,
            endIndex: Math.min(i + CHUNK_SIZE, contacts.length),
          })
        }

        setGroups(newGroups)
        setShowImportModal(false) // Close modal after successful import
      } catch (error) {
        alert(`Error processing file: ${error}`)
      }
    }

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsText(file)
    }
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        parseFile(acceptedFiles[0])
      }
    },
    [parseFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  })

  const addManualContact = () => {
    if (!manualPhone.trim()) {
      alert("Please enter a phone number")
      return
    }

    const newContact: Contact = {
      name: manualName.trim() || "Manual Entry",
      email: `manual-${Date.now()}@local`,
      phone: manualPhone.trim(),
    }

    if (groups.length === 0) {
      setGroups([
        {
          id: "group-0",
          number: 1,
          contacts: [newContact],
          startIndex: 1,
          endIndex: 1,
        },
      ])
      setTotalContacts(1)
    } else {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup.contacts.length < CHUNK_SIZE) {
        lastGroup.contacts.push(newContact)
        lastGroup.endIndex += 1
        setGroups([...groups])
      } else {
        const newGroup: ContactGroup = {
          id: `group-${groups.length}`,
          number: groups.length + 1,
          contacts: [newContact],
          startIndex: totalContacts + 1,
          endIndex: totalContacts + 1,
        }
        setGroups([...groups, newGroup])
      }
      setTotalContacts(totalContacts + 1)
    }

    setManualName("")
    setManualPhone("")
    setShowAddNumber(false)
  }

  const sendToSingle = async () => {
    if (!sendToSingleNumber.trim() || (message.trim() === "" && messageSegments.length === 0)) {
      alert("Please enter a phone number and message")
      return
    }

    setIsSending(true)
    setShowQueue(true)

    const queueItem: QueueItem = {
      id: `single-${Date.now()}`,
      groupId: "single",
      status: "sending",
      progress: 0,
      sentCount: 0,
      totalCount: 1,
      currentContact: sendToSingleNumber,
    }

    setQueue([queueItem])

    // Simulate sending to single contact
    for (let i = 0; i < 1; i++) {
      queueItem.sentCount = i + 1
      queueItem.progress = 100
      setQueue([queueItem])
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 300))
    }

    queueItem.status = "completed"
    setQueue([queueItem])

    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSending(false)
    setSendToSingleNumber("")
    setTimeout(() => {
      setShowSendSingleModal(false)
      setQueue([])
      setShowQueue(false)
    }, 500)
  }

  const sendMessages = async () => {
    if (selectedGroups.size === 0 || (message.trim() === "" && messageSegments.length === 0)) {
      alert("Please select groups and enter a message")
      return
    }

    setIsSending(true)
    setShowQueue(true)

    const newQueue: QueueItem[] = Array.from(selectedGroups).map((groupId) => ({
      id: `queue-${groupId}-${Date.now()}`,
      groupId,
      status: "pending" as const,
      progress: 0,
      sentCount: 0,
      totalCount: groups.find((g) => g.id === groupId)?.contacts.length || 0,
    }))

    setQueue(newQueue)

    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i]
      const group = groups.find((g) => g.id === item.groupId)
      if (!group) continue

      item.status = "sending"
      setQueue([...newQueue])

      // Simulate sending contacts individually
      for (let j = 0; j < group.contacts.length; j++) {
        const contact = group.contacts[j]
        item.currentContact = `${contact.name} (${contact.phone || contact.email})`
        item.sentCount = j + 1
        item.progress = Math.round(((j + 1) / group.contacts.length) * 100)
        setQueue([...newQueue])

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150))
      }

      item.status = "completed"
      setQueue([...newQueue])
    }

    // Keep queue visible for 3 seconds then clear
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsSending(false)
    setTimeout(() => {
      setMessage("")
      setSelectedGroups(new Set())
      setQueue([])
      setShowQueue(false)
    }, 500)
  }

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId)
    } else {
      newSelected.add(groupId)
    }
    setSelectedGroups(newSelected)
  }

  const selectAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(groups.map((g) => g.id)))
    }
  }

  const selectedContactCount = Array.from(selectedGroups).reduce((sum, groupId) => {
    return sum + (groups.find((g) => g.id === groupId)?.contacts.length || 0)
  }, 0)

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value

    if (newMessage.length > CHARACTER_LIMIT && messageSegments.length < MAX_TOTAL_SEGMENTS) {
      setOverflowModal({
        showOverflowModal: true,
        overflowAction: null,
      })
    } else if (newMessage.length <= CHARACTER_LIMIT) {
      setMessage(newMessage)
    } else {
      alert(`Maximum ${MAX_TOTAL_SEGMENTS} segments allowed`)
      return
    }

    if (newMessage.length <= CHARACTER_LIMIT) {
      setMessage(newMessage)
    }
  }

  const createNewSegment = () => {
    const newSegments = [...messageSegments, message]
    setMessageSegments(newSegments)
    setMessage("")
    setOverflowModal({
      showOverflowModal: false,
      overflowAction: null,
    })
  }

  const continueInCurrentMessage = () => {
    setOverflowModal({
      showOverflowModal: false,
      overflowAction: null,
    })
  }

  if (groups.length === 0 || showImportModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <MessageCircle className="w-10 h-10 text-cyan-400" />
              <h1 className="text-4xl font-bold text-white">Bulk Messenger</h1>
            </div>
            <p className="text-slate-400 text-lg">Import contacts and send messages at scale</p>
          </div>

          {/* Import Options Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Upload File Option */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
              <h3 className="text-xl font-bold text-white mb-2">Import File</h3>
              <p className="text-sm text-slate-400 mb-3">
                {isDragActive ? "Drop your file here" : "Drag and drop or click to select"}
              </p>
              <p className="text-xs text-slate-500">CSV or XLSX files supported</p>
            </div>

            {/* Add Manual Contact Option */}
            <div
              onClick={() => {
                setShowAddNumber(true)
                setShowImportModal(false)
              }}
              className="border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/50"
            >
              <Plus className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-bold text-white mb-2">Add Manually</h3>
              <p className="text-sm text-slate-400 mb-3">Add contacts one by one</p>
              <p className="text-xs text-slate-500">Perfect for small lists</p>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-white text-sm">How it works:</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center">
                  <span className="text-cyan-400 text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Import Contacts</p>
                  <p className="text-xs text-slate-400">Upload CSV/XLSX file with 100+ contacts</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Auto Chunk</p>
                  <p className="text-xs text-slate-400">Contacts split into groups of 100</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Send Bulk Messages</p>
                  <p className="text-xs text-slate-400">Send to groups or individual numbers</p>
                </div>
              </div>
            </div>
          </div>

          {showAddNumber && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Add Contact</h3>
                  <button
                    onClick={() => setShowAddNumber(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Name (Optional)</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddNumber(false)
                      setShowImportModal(true)
                    }}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      addManualContact()
                      setShowAddNumber(false)
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-96 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white mb-2">Contact Groups</h1>
            <p className="text-slate-400 text-sm">
              {groups.length} groups • {totalContacts} contacts
            </p>
          </div>

          {/* Add Contacts / Select All */}
          <div className="p-4 border-b border-slate-800 flex gap-2">
            <button
              onClick={() => setShowAddNumber(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Number
            </button>
            <button
              onClick={selectAllGroups}
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              {selectedGroups.size === groups.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {groups.map((group, idx) => {
                const color = ColorVariants[idx % ColorVariants.length]
                const isSelected = selectedGroups.has(group.id)

                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      onClick={() => toggleGroupSelection(group.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? `${color.border} ${color.bg}`
                          : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${color.badge}`}>GROUP {group.number}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-white font-medium">{group.contacts.length} contacts</p>
                      <p className="text-xs text-slate-400">
                        #{group.startIndex} - #{group.endIndex}
                      </p>
                    </button>
                    <button
                      onClick={() => setShowPreview(group.id)}
                      className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Preview Numbers
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selection Summary */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <p className="text-sm text-slate-400 mb-1">Selected</p>
            <p className="text-lg font-bold text-white">{selectedContactCount} contacts</p>
            <p className="text-xs text-slate-500">
              {selectedGroups.size} group{selectedGroups.size !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Info */}
          <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Composing to {selectedContactCount} contact{selectedContactCount !== 1 ? "s" : ""}
            </h2>
            <p className="text-slate-400">
              To:{" "}
              {selectedGroups.size === 0
                ? "No groups selected"
                : `${selectedGroups.size} group${selectedGroups.size !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Compose Area */}
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            {/* Message Segments Display */}
            {messageSegments.length > 0 && (
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-purple-300">Message Segments ({messageSegments.length})</p>
                  <button
                    onClick={() => {
                      setMessageSegments([])
                      setMessage("")
                    }}
                    className="text-xs px-2 py-1 hover:bg-purple-500/20 rounded transition-colors text-purple-300"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {messageSegments.map((seg, idx) => (
                    <div key={idx} className="text-xs bg-slate-800 p-2 rounded border border-slate-700 text-slate-300">
                      <p className="font-medium text-purple-300 mb-1">Segment {idx + 1}:</p>
                      <p className="line-clamp-2">{seg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3">Message</label>
              <textarea
                value={message}
                onChange={handleMessageChange}
                placeholder="Type your message here..."
                className="w-full h-48 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
              />
            </div>

            {/* Message Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div
                className={`rounded-lg p-3 border ${
                  message.length > CHARACTER_LIMIT
                    ? "bg-red-500/10 border-red-500/50"
                    : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">Characters</p>
                <p className={`text-2xl font-bold ${message.length > CHARACTER_LIMIT ? "text-red-400" : "text-white"}`}>
                  {message.length} / {CHARACTER_LIMIT}
                </p>
                {message.length > CHARACTER_LIMIT && (
                  <p className="text-xs text-red-400 mt-1">Exceeds limit - create segment</p>
                )}
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Segments</p>
                <p className="text-2xl font-bold text-white">{messageSegments.length + (message.length > 0 ? 1 : 0)}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Est. Cost</p>
                <p className="text-2xl font-bold text-white">
                  ${(selectedContactCount * (messageSegments.length + (message.length > 0 ? 1 : 0)) * 0.05).toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Est. Balance</p>
                <p className="text-2xl font-bold text-green-400">$250.00</p>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex gap-3">
              <button
                onClick={sendMessages}
                disabled={
                  isSending || selectedGroups.size === 0 || (message.trim() === "" && messageSegments.length === 0)
                }
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send to {selectedGroups.size} Group{selectedGroups.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSendSingleModal(true)}
                disabled={isSending || (message.trim() === "" && messageSegments.length === 0)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Send to 1
              </button>
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Queue ({queue.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Preview - Group {groups.find((g) => g.id === showPreview)?.number}
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-2">
                {groups
                  .find((g) => g.id === showPreview)
                  ?.contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{contact.name}</p>
                        <div className="flex items-center gap-2">
                          {contact.phone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={() => setShowPreview(null)}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add Contact</h3>
              <button
                onClick={() => setShowAddNumber(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setShowAddNumber(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addManualContact}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendSingleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Send to Single Number</h3>
              <button
                onClick={() => setShowSendSingleModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={sendToSingleNumber}
                  onChange={(e) => setSendToSingleNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Message Summary</p>
                <p className="text-sm text-white font-medium">
                  {messageSegments.length + (message.length > 0 ? 1 : 0)} segment
                  {messageSegments.length + (message.length > 0 ? 1 : 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setShowSendSingleModal(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={sendToSingle}
                disabled={isSending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {overflowModal.showOverflowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Message Too Long
              </h3>
              <p className="text-sm text-slate-400 mt-2">Your message exceeds the {CHARACTER_LIMIT} character limit</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-300 mb-2">
                  <span className="font-medium text-white">{message.length}</span> characters entered
                </p>
                <p className="text-xs text-slate-400">
                  Maximum allowed: <span className="text-white font-medium">{CHARACTER_LIMIT}</span> characters
                </p>
                <p className="text-xs text-red-400 mt-2">Exceeds by {message.length - CHARACTER_LIMIT} characters</p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-purple-200">
                  Save this message as <span className="font-medium">Segment {messageSegments.length + 1}</span> to send
                  it separately?
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={continueInCurrentMessage}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createNewSegment}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors font-medium"
              >
                Create Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Modal with Real-time Progress */}
      {showQueue && queue.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-96 flex flex-col">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Sending Queue</h3>
              <p className="text-sm text-slate-400 mt-1">Real-time message delivery</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {queue.map((item) => {
                const group = groups.find((g) => g.id === item.groupId)
                const idx = groups.findIndex((g) => g.id === item.groupId)
                const color = idx >= 0 ? ColorVariants[idx % ColorVariants.length] : ColorVariants[0]

                const isSingleSend = item.groupId === "single"

                return (
                  <div
                    key={item.id}
                    className={`border-2 ${isSingleSend ? "border-green-500/50 from-green-500/20 to-emerald-500/20" : `${color.border} ${color.bg}`} rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-white">
                          {isSingleSend ? "Single Contact" : `Group ${group?.number}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {item.sentCount} / {item.totalCount} sent
                        </p>
                        {item.currentContact && (
                          <p className="text-xs text-slate-300 mt-1 truncate">
                            {isSingleSend ? `To: ${item.currentContact}` : `Now sending: ${item.currentContact}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === "completed" && (
                          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                        )}
                        {item.status === "sending" && (
                          <Loader className="w-6 h-6 text-cyan-400 animate-spin flex-shrink-0" />
                        )}
                        {item.status === "pending" && (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.status === "completed"
                            ? "bg-green-500"
                            : item.status === "sending"
                              ? isSingleSend
                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                : "bg-gradient-to-r from-cyan-500 to-blue-500"
                              : "bg-slate-700"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-400 mt-2 text-right">{item.progress}% complete</p>
                  </div>
                )
              })}
            </div>

            {!isSending && (
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
