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

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  createdAt: string;
  updatedAt: string;
}

type ModalMode = 'view' | 'edit' | 'create';

// ──────────────────────────────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────────────────────────────
const dummyTickets: Ticket[] = [
  { 
    id: 1, 
    title: "Payment Failed Notification", 
    description: "User reports payment failure SMS not received", 
    status: 'open', 
    priority: 'high', 
    assignee: "Support Team", 
    createdAt: "Oct 31, 2025", 
    updatedAt: "Oct 31, 2025" 
  },
  { 
    id: 2, 
    title: "Verification Code Delay", 
    description: "SMS verification code arrives 2 minutes late", 
    status: 'in-progress', 
    priority: 'medium', 
    assignee: "Dev Team", 
    createdAt: "Oct 30, 2025", 
    updatedAt: "Oct 31, 2025" 
  },
  { 
    id: 3, 
    title: "Bulk Send Limit Exceeded", 
    description: "Error when sending to 500+ contacts", 
    status: 'resolved', 
    priority: 'low', 
    assignee: "Admin", 
    createdAt: "Oct 29, 2025", 
    updatedAt: "Oct 30, 2025" 
  },
  { 
    id: 4, 
    title: "Template Preview Broken", 
    description: "Preview doesn't show variables like {{name}}", 
    status: 'closed', 
    priority: 'urgent', 
    assignee: "Support Team", 
    createdAt: "Oct 28, 2025", 
    updatedAt: "Oct 31, 2025" 
  },
];

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(dummyTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open' as Ticket['status'],
    priority: 'medium' as Ticket['priority'],
    assignee: '',
  });

  const itemsPerPage = 6;

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const openModal = useCallback((ticket: Ticket | null, mode: ModalMode) => {
    setSelectedTicket(ticket);
    setModalMode(mode);
    if (ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
      });
    } else {
      setFormData({ title: '', description: '', status: 'open', priority: 'medium', assignee: '' });
    }
    setIsLoading(false);
  }, []);

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    const newTicket: Ticket = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee: formData.assignee || 'Unassigned',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTickets(prev => [newTicket, ...prev]);
    setModalMode('view');
  };

  const handleUpdate = () => {
    if (!selectedTicket) return;
    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id
        ? { ...t, ...formData, updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
        : t
    ));
    setModalMode('view');
  };

  const handleDelete = () => {
    if (!selectedTicket || !confirm('Delete this ticket?')) return;
    setTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
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
    return tickets.filter(t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

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
            Tickets ({filteredTickets.length})
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-white/5 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>
            <Button
              onClick={() => openModal(null, 'create')}
              startIcon={<Plus className="w-4 h-4" />}
              size="md"
              variant="primary"
            >
              New Ticket
            </Button>
          </div>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {isLoading ? (
            <SkeletonTicket />
          ) : paginatedTickets.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
              No tickets found.
            </p>
          ) : (
            paginatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openModal(ticket, 'view')}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md dark:border-white/10 dark:bg-white/3"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {ticket.title}
                  </h3>
                  <Badge
                    size="sm"
                    color={
                      ticket.status === 'open' ? 'warning' :
                      ticket.status === 'in-progress' ? 'info' :
                      ticket.status === 'resolved' ? 'success' : 'gray'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                  {ticket.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{ticket.assignee}</span>
                  <span>{ticket.createdAt}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    startIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
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
              startIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}

        {/* Ticket Modal */}
        {selectedTicket || modalMode === 'create' ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {modalMode === 'create' ? 'New Ticket' : modalMode === 'edit' ? 'Edit Ticket' : selectedTicket?.title}
                    </h3>
                    {selectedTicket && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: #{selectedTicket.id} • Updated: {selectedTicket.updatedAt}
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
                      <Label>Title</Label>
                      <Input
                        placeholder="Ticket title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
                        value={formData.assignee}
                        onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
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
                        <Badge color={selectedTicket.status === 'open' ? 'warning' : selectedTicket.status === 'in-progress' ? 'info' : selectedTicket.status === 'resolved' ? 'success' : 'gray'}>
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <Label>Priority</Label>
                        <Badge color={selectedTicket.priority === 'low' ? 'gray' : selectedTicket.priority === 'medium' ? 'info' : selectedTicket.priority === 'high' ? 'warning' : 'error'}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Assignee</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedTicket.assignee}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Created: {selectedTicket.createdAt}</span>
                      <span>Updated: {selectedTicket.updatedAt}</span>
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
                      disabled={!formData.title.trim() || !formData.description.trim()}
                      className="flex-1"
                    >
                      Create Ticket
                    </Button>
                  )}
                  {modalMode === 'edit' && (
                    <>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleUpdate}
                        disabled={!formData.title.trim() || !formData.description.trim()}
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
                  {modalMode === 'view' && selectedTicket && (
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

// ──────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────
function SkeletonTicket() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/3 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="mt-4 flex justify-end gap-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      ))}
    </>
  );
}