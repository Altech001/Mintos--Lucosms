'use client';

import { CheckCircle, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from '../../components/form/input/InputField';
import Button from "../../components/ui/button/Button";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

interface Group {
  id: number;
  name: string;
  contactsCount: number;
  createdAt: string;
}

interface ContactsByGroup {
  [groupId: number]: Contact[];
}

// ──────────────────────────────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────────────────────────────
const dummyGroups: Group[] = [
  { id: 1, name: "VIP Customers", contactsCount: 45, createdAt: "Oct 30, 2025" },
  { id: 2, name: "Newsletter Subscribers", contactsCount: 120, createdAt: "Oct 29, 2025" },
  { id: 3, name: "Support Team", contactsCount: 8, createdAt: "Oct 28, 2025" },
  { id: 4, name: "Marketing Leads", contactsCount: 67, createdAt: "Oct 27, 2025" },
];

const dummyContacts: ContactsByGroup = {
  1: [
    { id: 1, name: "John Doe", phone: "+1 234-567-8901", email: "john@example.com" },
    { id: 2, name: "Jane Smith", phone: "+1 987-654-3210", email: "jane@example.com" },
  ],
  2: [
    { id: 3, name: "Bob Johnson", phone: "+1 555-123-4567", email: "bob@example.com" },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function ContactGroups() {
  const [groups, setGroups] = useState<Group[]>(dummyGroups);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<Group | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPage, setContactsPage] = useState(1);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [singleContact, setSingleContact] = useState({ name: '', phone: '', email: '' });
  const [activeTab, setActiveTab] = useState<'single' | 'excel'>('single');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const itemsPerPage = 8;
  const contactsPerPage = 5;

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const handleCreateGroup = () => {
    if (!groupNameInput.trim()) return;
    const newGroup: Group = {
      id: Date.now(),
      name: groupNameInput,
      contactsCount: 0,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setGroups(prev => [newGroup, ...prev]);
    setGroupNameInput('');
    setIsCreateModalOpen(false);
  };

  const handleAddSingle = () => {
    if (!singleContact.name || !singleContact.phone) return;
    setGroups(prev => prev.map(g =>
      g.id === selectedGroupForAdd?.id
        ? { ...g, contactsCount: g.contactsCount + 1 }
        : g
    ));
    setSingleContact({ name: '', phone: '', email: '' });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploadStatus('uploading');
    setTimeout(() => {
      const imported = Math.floor(Math.random() * 50) + 10;
      setGroups(prev => prev.map(g =>
        g.id === selectedGroupForAdd?.id
          ? { ...g, contactsCount: g.contactsCount + imported }
          : g
      ));
      setUploadStatus('success');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setUploadStatus('idle');
      }, 1500);
    }, 800);
  }, [selectedGroupForAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xls'] },
    multiple: false,
  });

  // ──────────────────────────────────────────────────────────────────────
  // Pagination
  // ──────────────────────────────────────────────────────────────────────
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groups.slice(start, start + itemsPerPage);
  }, [groups, currentPage]);

  const totalPages = Math.ceil(groups.length / itemsPerPage);

  const groupContacts = selectedGroup ? dummyContacts[selectedGroup.id] || [] : [];
  const paginatedContacts = useMemo(() => {
    const start = (contactsPage - 1) * contactsPerPage;
    return groupContacts.slice(start, start + contactsPerPage);
  }, [groupContacts, contactsPage]);

  const contactsTotalPages = Math.ceil(groupContacts.length / contactsPerPage);

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta
        title="Contact Groups Collection"
        description="Manage Your Contacts Effectively with Contact Groups"
      />
      <PageBreadcrumb pageTitle="Contact Groups" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Contact Groups ({groups.length})
          </h2>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            startIcon={<Plus className="w-4 h-4" />}
            size="md"
            variant="primary"
          >
            Create Group
          </Button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {paginatedGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/3"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {group.name}
                </h3>
                <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {group.contactsCount} contacts
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{group.createdAt}</p>

              <div className="mt-4 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); /* Edit */ }}
                  startIcon={<Edit2 className="w-4 h-4" />}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete group?')) {
                      setGroups(prev => prev.filter(g => g.id !== group.id));
                    }
                  }}
                  startIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroupForAdd(group);
                    setIsAddModalOpen(true);
                  }}
                  startIcon={<UserPlus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              startIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page <span className="text-brand-600 dark:text-brand-400">{currentPage}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              startIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}

        {/* Group Details Dialog */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedGroup.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedGroup.contactsCount} contacts</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGroup(null)}
                    startIcon={<X className="w-5 h-5" />}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="border-b border-gray-100 dark:border-white/5">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Phone</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {paginatedContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.phone}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {contactsTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContactsPage(Math.max(1, contactsPage - 1))}
                      disabled={contactsPage === 1}
                      startIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Page {contactsPage} of {contactsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContactsPage(Math.min(contactsTotalPages, contactsPage + 1))}
                      disabled={contactsPage === contactsTotalPages}
                      startIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-white/10">
                <Button
                  className="w-full"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setSelectedGroup(null);
                    setSelectedGroupForAdd(selectedGroup);
                    setIsAddModalOpen(true);
                  }}
                >
                  Add Contacts to This Group
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Group</h3>
              <Label>Group Name</Label>
              <Input
                placeholder="e.g., VIP Customers"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                className="mt-1"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => { setIsCreateModalOpen(false); setGroupNameInput(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateGroup}
                  disabled={!groupNameInput.trim()}
                >
                  Create Group
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Contacts Modal – Creative Tabs */}
        {isAddModalOpen && selectedGroupForAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add to <span className="text-brand-600 dark:text-brand-400">{selectedGroupForAdd.name}</span>
                </h3>
                <Button
                children= ""
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsAddModalOpen(false); setUploadStatus('idle'); }}
                  startIcon={<X className="w-5 h-5" />}
                />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-white/10 mb-6">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'single'
                      ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Single Contact
                </button>
                <button
                  onClick={() => setActiveTab('excel')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'excel'
                      ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Excel Upload
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={singleContact.name}
                      onChange={(e) => setSingleContact(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      placeholder="+1 234-567-8901"
                      value={singleContact.phone}
                      onChange={(e) => setSingleContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input
                      placeholder="john@example.com"
                      value={singleContact.email}
                      onChange={(e) => setSingleContact(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAddSingle}
                    disabled={!singleContact.name || !singleContact.phone}
                    className="w-full"
                  >
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-brand-500'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {uploadStatus === 'idle' && (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Drop your Excel file here, or <span className="text-brand-600 dark:text-brand-400">click to browse</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Supports .xlsx with columns: Name, Phone, Email
                        </p>
                      </>
                    )}
                    {uploadStatus === 'uploading' && (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Importing contacts...</p>
                      </div>
                    )}
                    {uploadStatus === 'success' && (
                      <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                        <CheckCircle className="w-10 h-10 mb-2" />
                        <p className="text-sm font-medium">Imported successfully!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}