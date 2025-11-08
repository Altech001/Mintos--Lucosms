'use client';

import { useMemo, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Search, Plus, Edit2, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import Switch from "../../components/form/switch/Switch";
import Label from "../../components/form/Label";
import Input from '../../components/form/input/InputField';
import { apiClient } from "../../lib/api/client";
import type { TemplateCreate, TemplateUpdate, TemplatesPublic, TemplatePublic } from "../../lib/api";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import useCustomToast from "../../hooks/useCustomToast";
import Select from "../../components/form/Select";

// API-backed implementation

export default function ListTemplates() {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<null | { id: string; name: string; content: string; _default?: boolean; tag?: string }>(null);
  const itemsPerPage = 6;

  // Form state
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [tag, setTag] = useState('');
  const [tagFilter, setTagFilter] = useState<string>("");

  // Queries
  const templatesQuery = useQuery<TemplatesPublic>({
    queryKey: ['templates', currentPage, itemsPerPage, tagFilter],
    queryFn: async () => {
      const skip = (currentPage - 1) * itemsPerPage;
      return apiClient.api.templates.templatesReadTemplates({ skip, limit: itemsPerPage, tag: tagFilter || undefined });
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const tagsQuery = useQuery<string[]>({
    queryKey: ['templateTags'],
    queryFn: async () => (await apiClient.api.templates.templatesGetTemplateTags()).filter((t): t is string => !!t),
    staleTime: 5 * 60_000,
  });

  const templates = useMemo<TemplatePublic[]>(() => {
    const data: TemplatePublic[] = templatesQuery.data?.data ?? [];
    // There is no server search, do quick filter within the current page
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(t => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
  }, [templatesQuery.data, searchTerm]);

  // Filter & Paginate
  const paginated = templates; // already server-paginated, optionally filtered within page
  const totalPages = Math.ceil((templatesQuery.data?.count ?? 0) / itemsPerPage) || 1;

  const createMutation = useMutation({
    mutationFn: async (payload: TemplateCreate) => apiClient.api.templates.templatesCreateTemplate({ templateCreate: payload }),
    onSuccess: () => {
      showSuccessToast('Template created');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => showErrorToast('Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: TemplateUpdate }) =>
      apiClient.api.templates.templatesUpdateTemplate({ id, templateUpdate: update }),
    onSuccess: () => {
      showSuccessToast('Template updated');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => showErrorToast('Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.api.templates.templatesDeleteTemplate({ id }),
    onSuccess: () => {
      showSuccessToast('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => showErrorToast('Failed to delete template'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, setDefault }: { id: string; setDefault: boolean }) =>
      setDefault
        ? apiClient.api.templates.templatesSetTemplateAsDefault({ id })
        : apiClient.api.templates.templatesUnsetTemplateAsDefault({ id }),
    onSuccess: () => {
      showSuccessToast('Default template updated');
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => showErrorToast('Failed to update default state'),
  });

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    const payload: TemplateCreate = { name: newName, content: newContent, _default: isDefault, tag: tag || undefined };
    await createMutation.mutateAsync(payload);
    setIsModalOpen(false);
    setNewName('');
    setNewContent('');
    setIsDefault(false);
    setTag('');
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const update: TemplateUpdate = {
      name: newName || undefined,
      content: newContent || undefined,
      _default: isDefault,
      tag: tag || undefined,
    };
    await updateMutation.mutateAsync({ id: editing.id, update });
    setIsModalOpen(false);
    setEditing(null);
    setNewName('');
    setNewContent('');
    setIsDefault(false);
    setTag('');
  };

  //

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
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
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
            <div className="min-w-48">
              <Select
                options={[{ value: '', label: 'All tags' }, ...(tagsQuery.data?.map(t => ({ value: t, label: t })) ?? [])]}
                placeholder="Filter by tag"
                defaultValue={""}
                onChange={(value) => { setTagFilter(value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setNewName('');
              setNewContent('');
              setIsDefault(false);
              setTag('');
              setIsModalOpen(true);
            }}
            size="md"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templatesQuery.isLoading && templates.length === 0 ? (
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
                    (template.tag ?? 'custom') === 'custom'
                      ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300'
                  }`}>
                    {template.tag ?? 'custom'}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-2 space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {template.name}
                    {template._default && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
                        Default
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {template.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(template.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Edit"
                      onClick={() => {
                        setEditing({ id: template.id, name: template.name, content: template.content, _default: template._default, tag: template.tag });
                        setNewName(template.name);
                        setNewContent(template.content);
                        setIsDefault(!!template._default);
                        setTag(template.tag ?? '');
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Copy"
                      onClick={async () => {
                        await navigator.clipboard.writeText(template.content);
                        showSuccessToast('Template content copied to clipboard');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete"
                      onClick={async () => {
                        if (confirm('Delete this template?')) {
                          await deleteMutation.mutateAsync(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Switch
                    label="Default"
                    defaultChecked={!!template._default}
                    onChange={(checked: boolean) => setDefaultMutation.mutate({ id: template.id, setDefault: checked })}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            {templatesQuery.isFetching ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Template' : 'Create New Template'}</h3>

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
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Characters: {newContent.length}</span>
                {/* Hint for SMS splitting could be added here if needed */}
              </div>
            </div>

            <div>
              <Label>Tag (optional)</Label>
              <Input
                placeholder="custom"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Set as Default</Label>
              <Switch
                label=""
                defaultChecked={isDefault}
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
                onClick={editing ? handleUpdate : handleCreate}
                disabled={!newName.trim() || !newContent.trim()}
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Save Changes' : 'Create Template'}
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