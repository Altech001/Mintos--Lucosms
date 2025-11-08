import { CheckCircle, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from '../../components/form/input/InputField';
import Button from "../../components/ui/button/Button";
import { apiClient } from "../../lib/api/client";
import type { ContactCreate, ContactGroupsPublic, ContactsPublic } from "../../lib/api";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Skeleton from "../../components/ui/Skeleton";
import useCustomToast from "../../hooks/useCustomToast";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Group {
  id: string;
  name: string;
  contactsCount: number;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────
// API-backed state replaces dummy data

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function ContactGroups() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsCount, setGroupsCount] = useState(0);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [groupContacts, setGroupContacts] = useState<Contact[]>([]);
  const [groupContactsCount, setGroupContactsCount] = useState(0);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const itemsPerPage = 8;
  const contactsPerPage = 5;

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const groupsQuery = useQuery<ContactGroupsPublic>({
    queryKey: ['contactGroups', currentPage, itemsPerPage],
    queryFn: async () => {
      const skip = (currentPage - 1) * itemsPerPage;
      return apiClient.api.contacts.contactsGetContactGroups({ skip, limit: itemsPerPage });
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) =>
      apiClient.api.contacts.contactsDeleteContactGroup({ groupId }),
    onSuccess: () => {
      showSuccessToast('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['contactGroups'] });
    },
    onError: () => showErrorToast('Failed to delete group'),
  });

  useEffect(() => {
    const res = groupsQuery.data;
    if (res) {
      setGroups(
        res.data.map(g => ({
          id: g.id,
          name: g.name,
          contactsCount: g.contactCount ?? 0,
          createdAt: new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }))
      );
      setGroupsCount(res.count);
    }
  }, [groupsQuery.data]);

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) =>
      apiClient.api.contacts.contactsCreateContactGroup({ contactGroupCreate: { name } }),
    onSuccess: () => {
      showSuccessToast('Group created successfully');
      queryClient.invalidateQueries({ queryKey: ['contactGroups'] });
    },
    onError: () => showErrorToast('Failed to create group'),
  });

  const handleCreateGroup = useCallback(async () => {
    if (!groupNameInput.trim()) return;
    await createGroupMutation.mutateAsync(groupNameInput);
    setGroupNameInput('');
    setIsCreateModalOpen(false);
  }, [groupNameInput, createGroupMutation]);

  const contactsQuery = useQuery<ContactsPublic | null>({
    queryKey: ['groupContacts', selectedGroup?.id, contactsPage, contactsPerPage],
    queryFn: async () => {
      if (!selectedGroup?.id) return null;
      const skip = (contactsPage - 1) * contactsPerPage;
      return apiClient.api.contacts.contactsGetGroupContacts({ groupId: selectedGroup.id, skip, limit: contactsPerPage });
    },
    enabled: !!selectedGroup?.id,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  useEffect(() => {
    const res = contactsQuery.data;
    if (res) {
      setGroupContacts(
        res.data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email ?? undefined,
        }))
      );
      setGroupContactsCount(res.count);
    }
  }, [contactsQuery.data]);

  const createContactMutation = useMutation({
    mutationFn: async (payload: ContactCreate) =>
      apiClient.api.contacts.contactsCreateContact({ contactCreate: payload }),
    onSuccess: () => {
      showSuccessToast('Contact added');
      queryClient.invalidateQueries({ queryKey: ['contactGroups'] });
      queryClient.invalidateQueries({ queryKey: ['groupContacts'] });
    },
    onError: () => showErrorToast('Failed to add contact'),
  });

  const handleAddSingle = useCallback(async () => {
    if (!singleContact.name || !singleContact.phone || !selectedGroupForAdd?.id) return;
    const payload: ContactCreate = {
      name: singleContact.name,
      phone: singleContact.phone,
      email: singleContact.email || undefined,
      groupId: selectedGroupForAdd.id,
    };
    try {
      await createContactMutation.mutateAsync(payload);
      setSingleContact({ name: '', phone: '', email: '' });
    } catch (e) {
      console.error('Failed to add contact', e);
    }
  }, [singleContact, selectedGroupForAdd, createContactMutation]);

  const bulkCreateMutation = useMutation({
    mutationFn: async (payload: ContactCreate[]) =>
      apiClient.api.contacts.contactsBulkCreateContacts({ contactCreate: payload }),
    onSuccess: () => {
      showSuccessToast('Imported contacts successfully');
      queryClient.invalidateQueries({ queryKey: ['contactGroups'] });
      queryClient.invalidateQueries({ queryKey: ['groupContacts'] });
    },
    onError: () => showErrorToast('Bulk import failed'),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !selectedGroupForAdd?.id) return;
    setUploadStatus('uploading');
    setUploadProgress(0);
    try {
      const file = acceptedFiles[0];
      const { read, utils } = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Array<{ Name?: string; name?: string; Phone?: string; phone?: string; Email?: string; email?: string }> = utils.sheet_to_json(ws);
      const payload: ContactCreate[] = rows
        .map((r) => ({
          name: String(r.Name ?? r.name ?? '').trim(),
          phone: String(r.Phone ?? r.phone ?? '').trim(),
          email: r.Email ?? r.email ?? undefined,
          groupId: selectedGroupForAdd.id,
        }))
        .filter((r) => r.name && r.phone);

      if (payload.length === 0) throw new Error('No valid rows. Expected columns: Name, Phone, Email');
      // fake progress while API runs
      const iv = setInterval(() => {
        setUploadProgress((p) => (p < 95 ? p + 5 : p));
      }, 150);
      await bulkCreateMutation.mutateAsync(payload);
      clearInterval(iv);
      setUploadStatus('success');
      setUploadProgress(100);
      // refresh lists
      setTimeout(() => {
        setIsAddModalOpen(false);
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 1200);
    } catch (e) {
      console.error('Bulk import failed', e);
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  }, [selectedGroupForAdd, bulkCreateMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  // ──────────────────────────────────────────────────────────────────────
  // Pagination
  // ──────────────────────────────────────────────────────────────────────
  const paginatedGroups = useMemo(() => groups, [groups]);

  const totalPages = Math.ceil(groupsCount / itemsPerPage) || 1;
  const paginatedContacts = groupContacts;

  const contactsTotalPages = Math.ceil(groupContactsCount / contactsPerPage) || 1;

  useEffect(() => {
    if (selectedGroup) {
      setContactsPage(1);
    }
  }, [selectedGroup]);
  // contactsQuery handles fetching on dependencies

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
          {groupsQuery.isLoading && groups.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/3">
                <Skeleton className="h-5 w-1/2 mb-3" />
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-1/4" />
                <div className="mt-4 flex justify-end gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))
          ) : (
          paginatedGroups.map((group) => (
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
                  isLoading={deletingGroupId === group.id && deleteGroupMutation.isPending}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete group?')) {
                      try {
                        setDeletingGroupId(group.id);
                        await deleteGroupMutation.mutateAsync(group.id);
                        setDeletingGroupId(null);
                        // Clamp current page if needed will be handled by query refetch
                      } catch (err) {
                        setDeletingGroupId(null);
                        console.error('Failed to delete group', err);
                      }
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
          ))
          )}
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
                      {contactsQuery.isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2"><Skeleton className="h-4 w-40" /></td>
                            <td className="px-4 py-2"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-4 py-2"><Skeleton className="h-4 w-52" /></td>
                          </tr>
                        ))
                      ) : (
                        paginatedContacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.phone}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{contact.email || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {contactsTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContactsPage(Math.max(1, contactsPage - 1))}
                      disabled={contactsPage === 1 || contactsQuery.isFetching}
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
                      disabled={contactsPage === contactsTotalPages || contactsQuery.isFetching}
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
                  isLoading={false}
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
                  isLoading={createGroupMutation.isPending}
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
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsAddModalOpen(false); setUploadStatus('idle'); setUploadProgress(0); setSingleContact({ name: '', phone: '', email: '' }); }}
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
                    isLoading={createContactMutation.isPending}
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
                      <div className="flex flex-col items-center w-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Importing contacts...</p>
                        <div className="w-full mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-2 bg-brand-600 transition-all" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
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