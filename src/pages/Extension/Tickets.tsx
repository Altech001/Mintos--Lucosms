'use client';

import { ChevronLeft, ChevronRight, Edit2, Plus, TicketCheck, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Select from '../../components/form/Select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from "../../lib/api/client";
import type { TicketPublic, TicketsPublic, TicketCreate, TicketUpdate } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type ModalMode = 'view' | 'edit' | 'create';

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const { user } = useAuth();
  const isSuper = user?.isSuperuser === true;
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] = useState<TicketPublic | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filters (admin only can filter by priority too)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Form states
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    status: 'open' as NonNullable<TicketPublic['status']>,
    priority: 'medium' as NonNullable<TicketPublic['priority']>,
    assignedTo: '',
  });

  const itemsPerPage = 6;

  // Queries
  const ticketsQuery = useQuery<TicketsPublic>({
    queryKey: ['tickets', isSuper ? 'all' : 'mine', currentPage, itemsPerPage, statusFilter, isSuper ? priorityFilter : ''],
    queryFn: async () => {
      const skip = (currentPage - 1) * itemsPerPage;
      if (isSuper) {
        return apiClient.api.tickets.ticketsGetAllTickets({ skip, limit: itemsPerPage, status: statusFilter || undefined, priority: priorityFilter || undefined });
      }
      return apiClient.api.tickets.ticketsGetMyTickets({ skip, limit: itemsPerPage, status: statusFilter || undefined });
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: TicketCreate) => apiClient.api.tickets.ticketsCreateTicket({ ticketCreate: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setModalMode('view');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: TicketUpdate }) => apiClient.api.tickets.ticketsUpdateTicket({ ticketId: id, ticketUpdate: update }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setModalMode('view');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.api.tickets.ticketsDeleteTicket({ ticketId: id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const openModal = useCallback((ticket: TicketPublic | null, mode: ModalMode) => {
    setSelectedTicket(ticket);
    setModalMode(mode);
    if (ticket) {
      setFormData({
        subject: ticket.subject,
        description: ticket.description,
        status: (ticket.status ?? 'open') as NonNullable<TicketPublic['status']>,
        priority: (ticket.priority ?? 'medium') as NonNullable<TicketPublic['priority']>,
        assignedTo: ticket.assignedTo ?? '',
      });
    } else {
      setFormData({ subject: '', description: '', status: 'open', priority: 'medium', assignedTo: '' });
    }
  }, []);

  const handleCreate = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) return;
    const payload: TicketCreate = {
      subject: formData.subject,
      description: formData.description,
      priority: formData.priority,
      category: undefined,
    };
    await createMutation.mutateAsync(payload);
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    if (!isSuper) return; // Only superadmin can update
    const update: TicketUpdate = {
      subject: formData.subject || undefined,
      description: formData.description || undefined,
      status: formData.status || undefined,
      priority: formData.priority || undefined,
      category: undefined,
    };
    await updateMutation.mutateAsync({ id: selectedTicket.id, update });
  };

  const handleDelete = async () => {
    if (!selectedTicket || !confirm('Delete this ticket?')) return;
    if (!isSuper) return; // Only superadmin can delete
    await deleteMutation.mutateAsync(selectedTicket.id);
    setSelectedTicket(null);
    setModalMode('view');
  };

  const handleClose = () => {
    setSelectedTicket(null);
    setModalMode('view');
  };

  // ──────────────────────────────────────────────────────────────────────
  // Filter & Pagination
  // ──────────────────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    const data = ticketsQuery.data?.data ?? [];
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.assignedTo ?? '').toLowerCase().includes(q)
    );
  }, [ticketsQuery.data, searchTerm]);

  const paginatedTickets = filteredTickets; // already server-paginated, optionally filtered within page

  const totalPages = Math.ceil((ticketsQuery.data?.count ?? 0) / itemsPerPage) || 1;

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta
        title="Tickets & Reports"
        description="Manage SMS tickets, reports, and support requests"
      />
      <PageBreadcrumb pageTitle="Tickets" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Tickets ({ticketsQuery.data?.count ?? 0})
          </h2>
          <div className="flex items-center gap-4 w-auto">
              <Input
                type="text"
                placeholder="Search Tickets..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-auto pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg:white/5 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
              />
            
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              options={[{ value: '', label: 'All Status' }, { value: 'open', label: 'Open' }, { value: 'in-progress', label: 'In Progress' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]}
             className="w-auto"
           />
            {isSuper && (
              <Select
                value={priorityFilter}
                onChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}
                options={[{ value: '', label: 'All Priority' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]}
              />
            )}
            <Button
              onClick={() => openModal(null, 'create')}
              startIcon={<Plus className="w-4 h-4" />}
              size="md"
              variant="primary"
              
            >
              Ticket
            </Button>
          </div>
        </div>

        {/* Tickets Grid (no skeletons; buttons handle loading) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {ticketsQuery.isLoading && !ticketsQuery.data ? null :
          (paginatedTickets.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
              No tickets found.
            </p>
          ) : (
            paginatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openModal(ticket, 'view')}
                className="group cursor-pointer rounded-2xl border border-gray-200  p-5 transition-all hover:shadow-md dark:border-white/10 dark:bg:white/3"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {ticket.subject}
                  </h3>
                  <Badge
                    size="sm"
                    color={
                      ticket.status === 'open' ? 'warning' :
                      ticket.status === 'in-progress' ? 'info' :
                      ticket.status === 'resolved' ? 'success' : 'light'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                  {ticket.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{ticket.assignedTo ?? 'Unassigned'}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isSuper && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openModal(ticket, 'edit'); }}
                        startIcon={<Edit2 className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                        isLoading={deleteMutation.isPending}
                        startIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !ticketsQuery.isLoading && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              isLoading={ticketsQuery.isFetching}
              startIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page <span className="text-brand-600 dark:text-brand-400">{currentPage}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              isLoading={ticketsQuery.isFetching}
              startIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}

        {/* Ticket Modal */}
        {selectedTicket || modalMode === 'create' ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-999999 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {modalMode === 'create' ? 'New Ticket' : modalMode === 'edit' ? 'Edit Ticket' : selectedTicket?.subject}
                    </h3>
                    {selectedTicket && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: #{selectedTicket.id} • Updated: {new Date(selectedTicket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    startIcon={<X className="w-5 h-5" />}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {modalMode !== 'view' && (
                  <>
                    <div>
                      <Label>Subject</Label>
                      <Input
                        placeholder="Ticket subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <TextArea
                        placeholder="Describe the issue..."
                        value={formData.description}
                        onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                          options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in-progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'closed', label: 'Closed' },
                          ]}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={formData.priority}
                          onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                          options={[
                            { value: 'low', label: 'Low' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'high', label: 'High' },
                            { value: 'urgent', label: 'Urgent' },
                          ]}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Assignee</Label>
                      <Input
                        placeholder="e.g., Support Team"
                        value={formData.assignedTo}
                        onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {modalMode === 'view' && selectedTicket && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <TicketCheck className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Description</h4>
                        <p className="text-gray-600 dark:text-gray-300">{selectedTicket.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <Badge color={selectedTicket.status === 'open' ? 'warning' : selectedTicket.status === 'in-progress' ? 'info' : selectedTicket.status === 'resolved' ? 'success' : 'light'}>
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <Label>Priority</Label>
                        <Badge color={selectedTicket.priority === 'low' ? 'light' : selectedTicket.priority === 'medium' ? 'info' : selectedTicket.priority === 'high' ? 'warning' : 'error'}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Assignee</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTicket.assignedTo ?? 'Unassigned'}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>Updated: {new Date(selectedTicket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  {modalMode === 'create' && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleCreate}
                      disabled={!formData.subject.trim() || !formData.description.trim()}
                      isLoading={createMutation.isPending}
                      className="flex-1"
                    >
                      Create Ticket
                    </Button>
                  )}
                  {modalMode === 'edit' && isSuper && (
                    <>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleUpdate}
                        disabled={!formData.subject.trim() || !formData.description.trim()}
                        isLoading={updateMutation.isPending}
                        className="flex-1"
                      >
                        Update Ticket
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setModalMode('view')}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {modalMode === 'view' && selectedTicket && isSuper && (
                    <>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setModalMode('edit')}
                        className="flex-1"
                        startIcon={<Edit2 className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={handleDelete}
                        isLoading={deleteMutation.isPending}
                        className="flex-1"
                        startIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}