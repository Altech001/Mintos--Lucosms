"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, Users, Zap, CheckCircle, Download } from "lucide-react"
// Dynamically import xlsx only when needed to reduce bundle size

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

const CHUNK_SIZE = 100

const ColorVariants = [
  { bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/50", badge: "bg-cyan-500/30 text-cyan-200" },
  {
    bg: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/50",
    badge: "bg-purple-500/30 text-purple-200",
  },
  { bg: "from-green-500/20 to-emerald-500/20", border: "border-green-500/50", badge: "bg-green-500/30 text-green-200" },
  { bg: "from-orange-500/20 to-red-500/20", border: "border-orange-500/50", badge: "bg-orange-500/30 text-orange-200" },
  {
    bg: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/50",
    badge: "bg-yellow-500/30 text-yellow-200",
  },
  {
    bg: "from-indigo-500/20 to-violet-500/20",
    border: "border-indigo-500/50",
    badge: "bg-indigo-500/30 text-indigo-200",
  },
]

export default function ContactChunker() {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [totalContacts, setTotalContacts] = useState<number>(0)
  const [, setIsProcessing] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const parseFile = useCallback((file: File) => {
    setIsProcessing(true)
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

        // Filter out invalid contacts
        contacts = contacts.filter((c) => (c.email && c.email !== "N/A") || (c.phone && c.phone !== "undefined"))

        setTotalContacts(contacts.length)
        setFileName(file.name)

        // Split into chunks
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
      } catch (error) {
        alert(`Error processing file: ${error}`)
      } finally {
        setIsProcessing(false)
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

  const downloadGroup = (group: ContactGroup) => {
    const csv = [["Name", "Email", "Phone"], ...group.contacts.map((c) => [c.name, c.email, c.phone || ""])]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contacts-group-${group.number}.csv`
    a.click()
  }

  // const currentColor =
  //   selectedGroup !== null
  //     ? ColorVariants[groups.findIndex((g) => g.id === selectedGroup) % ColorVariants.length]
  //     : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Contact Chunker
            </h1>
          </div>
          <p className="text-slate-400">
            Upload CSV or XLSX files and automatically split large contact lists into manageable groups
          </p>
        </div>

        {groups.length === 0 ? (
          // Upload Zone
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isDragActive ? "Drop your file here" : "Drag and drop your file here"}
            </h2>
            <p className="text-slate-400 mb-4">or click to select a CSV or XLSX file</p>
            <p className="text-sm text-slate-500">Files with 100+ contacts will be automatically split into groups</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">File Name</p>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {fileName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Contacts</p>
                  <p className="text-white font-semibold">{totalContacts}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Groups Created</p>
                  <p className="text-white font-semibold text-lg">{groups.length}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setGroups([])
                      setFileName("")
                      setTotalContacts(0)
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Upload New File
                  </button>
                </div>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {groups.map((group, idx) => {
                const color = ColorVariants[idx % ColorVariants.length]
                const isSelected = selectedGroup === group.id

                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(isSelected ? null : group.id)}
                    className={`relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all transform hover:scale-105 border-2 ${
                      isSelected ? `border-opacity-100 ${color.border}` : "border-slate-700 border-opacity-50"
                    } bg-gradient-to-br ${color.bg} hover:${color.bg}`}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-sm font-medium ${color.badge}`}>GROUP {group.number}</p>
                          <h3 className="text-2xl font-bold text-white mt-2">{group.contacts.length} contacts</h3>
                        </div>
                        {isSelected && <CheckCircle className="w-6 h-6 text-green-400" />}
                      </div>

                      <p className="text-slate-300 text-sm mb-4">
                        Contacts {group.startIndex} - {group.endIndex}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadGroup(group)
                          }}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedGroup(isSelected ? null : group.id)
                          }}
                          className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {isSelected ? "Hide" : "Preview"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Preview Panel */}
            {selectedGroup !== null && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  {groups.find((g) => g.id === selectedGroup)?.number
                    ? `Group ${groups.find((g) => g.id === selectedGroup)?.number} Preview`
                    : "Preview"}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr className="text-slate-400">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Email</th>
                        <th className="text-left py-3 px-4 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups
                        .find((g) => g.id === selectedGroup)
                        ?.contacts.slice(0, 10)
                        .map((contact, idx) => (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 text-white">{contact.name}</td>
                            <td className="py-3 px-4 text-slate-300">{contact.email}</td>
                            <td className="py-3 px-4 text-slate-400">{contact.phone || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="text-slate-400 text-sm mt-4 text-center">
                    Showing first 10 of {groups.find((g) => g.id === selectedGroup)?.contacts.length || 0} contacts
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
