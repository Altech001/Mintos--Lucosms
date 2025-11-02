/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Copy, Grid3X3, Key, Plus, Table as TableIcon, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

type ViewMode = 'cards' | 'table';

// ──────────────────────────────────────────────────────────────────────
const generateKey = () => {
  const prefix = 'sk_live_' + Math.random().toString(36).substring(2, 8);
  const suffix = Math.random().toString(36).substring(2, 15);
  return { prefix, full: prefix + '_' + suffix };
};

const dummyKeys: ApiKey[] = [
  {
    id: '1',
    name: "Production API",
    key: generateKey().full,
    prefix: generateKey().prefix,
    createdAt: "Oct 30, 2025",
    lastUsed: "Oct 31, 2025",
    isActive: true,
  },
  {
    id: '2',
    name: "Staging Environment",
    key: generateKey().full,
    prefix: generateKey().prefix,
    createdAt: "Oct 28, 2025",
    lastUsed: "Oct 30, 2025",
    isActive: true,
  },
  {
    id: '3',
    name: "Old Key (Revoked)",
    key: generateKey().full,
    prefix: generateKey().prefix,
    createdAt: "Sep 15, 2025",
    lastUsed: undefined,
    isActive: false,
  },
];

// ──────────────────────────────────────────────────────────────────────
export default function Developer() {
  const [keys, setKeys] = useState<ApiKey[]>(dummyKeys);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const itemsPerPage = viewMode === 'cards' ? 6 : 10;

  // Handlers
  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const { prefix, full } = generateKey();
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: full,
      prefix,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUsed: undefined,
      isActive: true,
    };
    setKeys(prev => [newKey, ...prev]);
    setSelectedKey(newKey);
    setIsCreateModalOpen(false);
    setIsViewModalOpen(true);
    setNewKeyName('');
  };

  const handleCopy = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      alert('Failed to copy');
    }
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Revoke this API key?')) return;
    setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: false, lastUsed: undefined } : k));
    if (selectedKey?.id === id) {
      setSelectedKey(prev => prev ? { ...prev, isActive: false } : null);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this API key permanently?')) return;
    setKeys(prev => prev.filter(k => k.id !== id));
    if (selectedKey?.id === id) {
      setIsViewModalOpen(false);
      setSelectedKey(null);
    }
  };

  const openView = (key: ApiKey) => {
    setSelectedKey(key);
    setIsViewModalOpen(true);
  };

  // Filter & Pagination
  const filteredKeys = useMemo(() => {
    return keys.filter(k =>
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.prefix.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [keys, searchTerm]);

  const paginatedKeys = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredKeys.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredKeys]);

  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta
        title="Developer API Keys"
        description="Manage your API keys for SMS integration"
      />
      <PageBreadcrumb pageTitle="Developer API Keys" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              API Keys ({filteredKeys.length})
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'cards' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                startIcon={<Grid3X3 className="w-4 h-4" />}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                startIcon={<TableIcon className="w-4 h-4" />}
              >
                Table
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-white/5 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              startIcon={<Plus className="w-4 h-4" />}
              size="md"
              variant="primary"
            >
              Create Key
            </Button>
          </div>
        </div>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {paginatedKeys.length === 0 ? (
              <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
                No API keys found.
              </p>
            ) : (
              paginatedKeys.map((key) => (
                <div
                  key={key.id}
                  onClick={() => openView(key)}
                  className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md dark:border-white/10 dark:bg-white/3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {key.name}
                    </h3>
                    <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                      {key.prefix}...
                    </code>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {key.createdAt}
                    {key.lastUsed && ` • Last used: ${key.lastUsed}`}
                  </p>

                  <div className="mt-4 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); handleCopy(key.key, key.id); }}
                      startIcon={copySuccess === key.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    >
                      {copySuccess === key.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); handleRevoke(key.id); }}
                      startIcon={<AlertCircle className="w-4 h-4" />}
                      disabled={!key.isActive}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto mb-8">
            <table className="w-full table-auto">
              <thead className="border-b border-gray-100 dark:border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Prefix</th>
                  <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Created</th>
                  <th className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No API keys found.
                    </td>
                  </tr>
                ) : (
                  paginatedKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-800 dark:text-white/90">{key.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                          {key.prefix}...
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          key.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-sm">
                        {key.createdAt}
                        {key.lastUsed && <span className="block text-xs">Last: {key.lastUsed}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(key.key, key.id)}
                            startIcon={copySuccess === key.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          >
                            {copySuccess === key.id ? 'Copied!' : 'Copy'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(key.id)}
                            startIcon={<AlertCircle className="w-4 h-4" />}
                            disabled={!key.isActive}
                          >
                            Revoke
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openView(key)}
                            startIcon={<Key className="w-4 h-4" />}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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

        {/* Create Key Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New API Key</h3>
              <Label>Key Name</Label>
              <Input
                placeholder="e.g., Production API"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mt-1"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => { setIsCreateModalOpen(false); setNewKeyName(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim()}
                >
                  Create Key
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Key Modal */}
        {isViewModalOpen && selectedKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedKey.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created: {selectedKey.createdAt}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsViewModalOpen(false); setSelectedKey(null); }}
                  startIcon={<X className="w-5 h-5" />}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-5">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                  <Label>Full API Key (copy now — won’t be shown again)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 font-mono text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-700">
                      {selectedKey.key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedKey.key, selectedKey.id)}
                      startIcon={copySuccess === selectedKey.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    >
                      {copySuccess === selectedKey.id ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Status</Label>
                    <p className={`text-sm font-medium ${selectedKey.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {selectedKey.isActive ? 'Active' : 'Revoked'}
                    </p>
                  </div>
                  {selectedKey.lastUsed && (
                    <div>
                      <Label>Last Used</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{selectedKey.lastUsed}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleRevoke(selectedKey.id)}
                    disabled={!selectedKey.isActive}
                    className="flex-1"
                    startIcon={<AlertCircle className="w-4 h-4" />}
                  >
                    Revoke Key
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleDelete(selectedKey.id)}
                    className="flex-1"
                    startIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete Key
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}