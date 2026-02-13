'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit2, Film, FileJson, Plus, Search, Star, Trash2, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from '../../components/form/input/InputField';
import Button from "../../components/ui/button/Button";
import { moviesApi } from "../../context/movies_api";
import useCustomToast from "../../hooks/useCustomToast";

export default function MoviesEditor() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Queries
    const moviesQuery = useQuery({
        queryKey: ['admin-movies', currentPage, itemsPerPage, searchTerm],
        queryFn: async () => {
            if (searchTerm.trim().length >= 2) {
                const results = await moviesApi.ultimateSearch(searchTerm);
                // Filter for movies and return the items
                return results
                    .filter(r => r.type === 'movie')
                    .map(r => r.item as any); // Cast as any for simplicity in mapping
            }
            const skip = (currentPage - 1) * itemsPerPage;
            return moviesApi.getMovies(itemsPerPage, skip);
        },
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

    const totalCountQuery = useQuery({
        queryKey: ['movies-count'],
        queryFn: () => moviesApi.getMoviesCount(),
        staleTime: 5 * 60_000,
        enabled: !searchTerm.trim(), // Only need count for pagination when not searching
    });

    const movies = moviesQuery.data ?? [];

    const totalPages = Math.ceil((totalCountQuery.data ?? 0) / itemsPerPage) || 1;

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => moviesApi.deleteMovie(id),
        onSuccess: () => {
            showSuccessToast('Movie deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
            queryClient.invalidateQueries({ queryKey: ['movies-count'] });
        },
        onError: (error: any) => showErrorToast(error.message || 'Failed to delete movie'),
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50">
            <PageMeta
                title="Movies Editor"
                description="Manage your movies catalog"
            />
            <PageBreadcrumb pageTitle="Movies Content Management" />

            <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                            Movies Catalog
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Movies: {totalCountQuery.data ?? 0}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search movies..."
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
                            onClick={() => navigate('/admin/movies/batch')}
                            className="w-full sm:w-auto rounded-none border-gray-200 dark:border-gray-800"
                        >
                            <FileJson className="w-4 h-4 mr-2" />
                            Batch Upload
                        </Button>
                        <Button
                            onClick={() => navigate('/admin/movies/new')}
                            className="w-full sm:w-auto rounded-none bg-brand-600 hover:bg-brand-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Movie
                        </Button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moviesQuery.isLoading ? (
                        <SkeletonGrid />
                    ) : movies.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <Film className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No movies found in this page.</p>
                        </div>
                    ) : (
                        movies.map((movie) => (
                            <div
                                key={movie.id}
                                className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                <div className="flex h-full">
                                    {/* Poster Thumbnail */}
                                    <div className="w-1/3 relative bg-gray-100 dark:bg-gray-800 border-r border-gray-100 dark:border-gray-800">
                                        {movie.poster_url ? (
                                            <img
                                                src={movie.poster_url}
                                                alt={movie.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-8 h-8 text-gray-300" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-sm">
                                            ID: {movie.id}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="w-2/3 p-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                                                    {movie.genre || 'Uncategorized'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{movie.stars}</span>
                                                </div>
                                            </div>

                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-2">
                                                {movie.name}
                                            </h3>

                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 leading-relaxed">
                                                {movie.description}
                                            </p>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{movie.release_date || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{movie.duration || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/movies/edit/${movie.id}`)}
                                                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30"
                                                title="Edit Movie"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Are you sure you want to delete "${movie.name}"?`)) {
                                                        await deleteMutation.mutateAsync(movie.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                                title="Delete Movie"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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
                            disabled={currentPage === 1 || moviesQuery.isFetching}
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
                            disabled={currentPage === totalPages || moviesQuery.isFetching}
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
        <>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 h-48 animate-pulse flex">
                    <div className="w-1/3 bg-gray-100 dark:bg-gray-800"></div>
                    <div className="w-2/3 p-4 space-y-3">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 w-1/4"></div>
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 w-3/4"></div>
                        <div className="h-10 bg-gray-100 dark:bg-gray-800 w-full"></div>
                        <div className="flex justify-end gap-2 mt-4">
                            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800"></div>
                            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800"></div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
