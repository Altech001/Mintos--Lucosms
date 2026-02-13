'use client';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Calendar, ChevronLeft, ChevronRight,
    Film, FileJson, Plus, Search, Star, Trash2, Video,
    Layers, Play
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Input from '../../../components/form/input/InputField';
import Button from "../../../components/ui/button/Button";
import { moviesApi } from "../../../context/movies_api";
import useCustomToast from "../../../hooks/useCustomToast";

export default function SeriesEditor() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Queries
    const seriesQuery = useQuery({
        queryKey: ['admin-series'],
        queryFn: async () => moviesApi.getSeries(),
        staleTime: 60_000,
    });

    const series = useMemo(() => {
        const data = seriesQuery.data ?? [];
        if (!searchTerm.trim()) return data;
        const q = searchTerm.toLowerCase();
        return data.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.genre?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q)
        );
    }, [seriesQuery.data, searchTerm]);

    const totalPages = Math.ceil(series.length / itemsPerPage) || 1;
    const paginatedSeries = series.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => moviesApi.deleteSeries(id),
        onSuccess: () => {
            showSuccessToast('Series deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-series'] });
        },
        onError: (error: any) => showErrorToast(error.message || 'Failed to delete series'),
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50">
            <PageMeta
                title="Series Editor"
                description="Manage your TV series catalog"
            />
            <PageBreadcrumb pageTitle="Series Content Management" />

            <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Layers className="w-7 h-7 text-brand-600" />
                            Series Catalog
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage TV shows, seasons and episode allocations
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search series..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 rounded-none border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/admin/series/batch')}
                            className="w-full sm:w-auto rounded-none border-gray-200 dark:border-gray-800"
                        >
                            <FileJson className="w-4 h-4 mr-2" />
                            Batch Upload
                        </Button>
                        <Button
                            onClick={() => navigate('/admin/series/new')}
                            className="w-full sm:w-auto rounded-none bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Series
                        </Button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {seriesQuery.isLoading ? (
                        <SkeletonGrid />
                    ) : series.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <Film className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Series Found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs text-center">Start by creating your first series catalog item.</p>
                        </div>
                    ) : (
                        paginatedSeries.map((s) => (
                            <div
                                key={s.id}
                                className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden transition-all hover:border-brand-200 dark:hover:border-brand-900/40"
                            >
                                {/* Poster */}
                                <div className="aspect-[2/3] relative bg-gray-100 dark:bg-gray-800">
                                    {s.poster_url ? (
                                        <img
                                            src={s.poster_url}
                                            alt={s.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Video className="w-12 h-12 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold rounded uppercase tracking-wider">
                                        {s.category_name || 'Series'}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <Button
                                            onClick={() => navigate(`/admin/series/edit/${s.id}`)}
                                            className="w-full bg-white text-black hover:bg-white/90 rounded-none h-9 text-xs font-bold"
                                        >
                                            Manage Content
                                        </Button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{s.genre}</span>
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500">{s.stars}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate mb-1">{s.name}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Play className="w-3 h-3" />
                                            {s.episodes?.length || 0} Episodes
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {s.release_date || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-[10px] text-gray-400 font-mono">ID: {s.id}</div>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete entire series "${s.name}"? This will remove all episodes.`)) {
                                                    deleteMutation.mutate(s.id);
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-4">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1 || seriesQuery.isFetching}
                            className={`p-2 transition-colors border ${currentPage === 1
                                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <span>{currentPage}</span>
                            <span className="text-gray-400">/</span>
                            <span>{totalPages}</span>
                        </div>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || seriesQuery.isFetching}
                            className={`p-2 transition-colors border ${currentPage === totalPages
                                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800'
                                }`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SkeletonGrid() {
    return (
        <>{[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-800"></div>
                <div className="p-4 space-y-3">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 w-1/4"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 w-3/4"></div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 w-1/2"></div>
                </div>
            </div>
        ))}</>
    );
}
