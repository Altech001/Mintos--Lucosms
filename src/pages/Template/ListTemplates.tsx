'use client';

import { useState, useEffect, useMemo } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Search, Plus, Edit2, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import Switch from "../../components/form/switch/Switch";
import Label from "../../components/form/Label";
import Input from '../../components/form/input/InputField';

// Dummy data
const dummyTemplates = [
  { id: 1, name: "Welcome Message", content: "Hi {{name}}, welcome to our platform!", type: "custom" as const, isDefault: true, createdAt: "Oct 30, 2025" },
  { id: 2, name: "Order Confirmation", content: "Your order #{{id}} is confirmed!", type: "prebuilt" as const, isDefault: false, createdAt: "Oct 29, 2025" },
  { id: 3, name: "Password Reset", content: "Click to reset: {{link}}", type: "prebuilt" as const, isDefault: false, createdAt: "Oct 28, 2025" },
  { id: 4, name: "Meeting Reminder", content: "Meeting at {{time}} with {{person}}", type: "custom" as const, isDefault: false, createdAt: "Oct 27, 2025" },
  { id: 5, name: "Promo Code", content: "Use {{code}} for 20% off!", type: "custom" as const, isDefault: false, createdAt: "Oct 26, 2025" },
];

export default function ListTemplates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<typeof dummyTemplates>([]);
  const itemsPerPage = 6;

  // Form state
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Simulate API
  useEffect(() => {
    const timer = setTimeout(() => {
      setTemplates(dummyTemplates);
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filter & Paginate
  const filtered = useMemo(() => {
    return templates.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) return;
    const newTemplate = {
      id: Date.now(),
      name: newName,
      content: newContent,
      type: 'custom' as const,
      isDefault,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTemplates(prev => [newTemplate, ...prev]);
    setIsModalOpen(false);
    setNewName('');
    setNewContent('');
    setIsDefault(false);
  };

  const toggleDefault = (id: number) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, isDefault: !t.isDefault } : { ...t, isDefault: false }
    ));
  };

  return (
    <div>
      <PageMeta
        title="List Templates"
        description="View, Create, Edit and Delete Templates"
      />
      <PageBreadcrumb pageTitle="Custom Templates and Pre-Made Templates" />

      <div className="min-h-auto rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-100" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            size="md"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <SkeletonGrid />
          ) : paginated.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
              No templates found.
            </p>
          ) : (
            paginated.map((template) => (
              <div
                key={template.id}
                className="group relative rounded-2xl border border-gray-200 bg-white p-5  transition-all hover:shadow-md dark:border-white/10 dark:bg-white/3"
              >
                {/* Tag */}
                <div className="absolute -top-3 left-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    template.type === 'custom'
                      ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300'
                  }`}>
                    {template.type}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-2 space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {template.name}
                    {template.isDefault && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
                        Default
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {template.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {template.createdAt}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Switch
                    label="Default"
                    // checked={template.isDefault}
                    onChange={() => toggleDefault(template.id)}
                    // size="sm"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:hover:bg-white/10'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page <span className="text-brand-600 dark:text-brand-400">{currentPage}</span> of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border ${currentPage === totalPages ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-white/5' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:hover:bg-white/10'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Template</h3>

            <div>
              <Label>Name</Label>
              <Input
                placeholder="Welcome Message"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div>
              <Label>Content</Label>
              <TextArea
                placeholder="Hi {{name}}, welcome to our platform!"
                value={newContent}
                onChange={setNewContent}
                rows={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Set as Default</Label>
              <Switch
                label=""
                // checked={isDefault}
                onChange={setIsDefault}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || !newContent.trim()}
              >
                Create Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Skeleton Grid */
function SkeletonGrid() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/3 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="mt-4 flex justify-between">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      ))}
    </>
  );
}