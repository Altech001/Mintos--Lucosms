'use client';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChevronLeft,
    Layers,
    Search,
    Wand2,
    CheckSquare,
    Square,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Filter
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Input from '../../../components/form/input/InputField';
import TextArea from "../../../components/form/input/TextArea";
import Label from "../../../components/form/Label";
import Button from "../../../components/ui/button/Button";
import { moviesApi } from "../../../context/movies_api";
import useCustomToast from "../../../hooks/useCustomToast";

export default function SeriesFixer() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();

    // Selection state
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Metadata state
    const [serieName, setSerieName] = useState('');
    const [genre, setGenre] = useState('');
    const [vjName, setVjName] = useState('');
    const [description, setDescription] = useState('');

    // Queries
    const moviesQuery = useQuery({
        queryKey: ['fixer-movies', searchTerm],
        queryFn: async () => {
            if (searchTerm.trim().length >= 2) {
                const results = await moviesApi.ultimateSearch(searchTerm);
                return results
                    .filter(r => r.type === 'movie')
                    .map(r => r.item);
            }
            return moviesApi.getMovies(100, 0); // Initial list of 100 movies
        },
        staleTime: 30_000,
    });

    const movies = moviesQuery.data ?? [];

    // Mutations
    const convertMutation = useMutation({
        mutationFn: (payload: any) => moviesApi.convertToSeries(payload),
        onSuccess: (data) => {
            showSuccessToast(data.message || "Successfully converted movies to series");
            queryClient.invalidateQueries({ queryKey: ['fixer-movies'] });
            queryClient.invalidateQueries({ queryKey: ['admin-series'] });
            queryClient.invalidateQueries({ queryKey: ['admin-movies'] });

            // Reset state
            setSelectedIds([]);
            setSerieName('');
            setGenre('');
            setVjName('');
            setDescription('');
        },
        onError: (error: any) => {
            showErrorToast(error.message || "Failed to convert movies");
        }
    });

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleConvert = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedIds.length === 0) {
            showErrorToast("Please select at least one movie");
            return;
        }

        if (!serieName || !genre || !vjName) {
            showErrorToast("Please fill in all series metadata fields");
            return;
        }

        convertMutation.mutate({
            serie_name: serieName,
            genre,
            vj_name: vjName,
            description,
            movie_ids: selectedIds
        });
    };

    const selectSimilar = (movie: any) => {
        // Simple logic: select movies with similar names or same VJ
        const baseName = movie.name.split(' ').slice(0, 2).join(' ').toLowerCase();
        const similar = movies.filter((m: any) =>
            m.name.toLowerCase().includes(baseName) ||
            (m.vj_name === movie.vj_name && m.genre === movie.genre)
        );

        const newIds = similar.map((m: any) => m.id);
        setSelectedIds(prev => Array.from(new Set([...prev, ...newIds])));

        // Auto-fill metadata if empty
        if (!serieName) setSerieName(movie.name.replace(/Episode \d+|Part \d+|Ep \d+/gi, '').trim());
        if (!genre) setGenre(movie.genre);
        if (!vjName) setVjName(movie.vj_name);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50">
            <PageMeta
                title="Series Fixer"
                description="Convert group of movies to a unified Series"
            />
            <PageBreadcrumb pageTitle="Series Architect / Fixer" />

            <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => navigate('/admin/series')}
                            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-600 transition-colors mb-2 uppercase tracking-tighter"
                        >
                            <ChevronLeft size={14} />
                            Back to Library
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                            <Wand2 className="w-7 h-7 text-brand-500" />
                            Database Fixer
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Group multiple movie entries into a single Series with Episodes
                        </p>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="px-4 py-2 bg-brand-500/10 border border-brand-500/20 flex items-center gap-4">
                                <span className="text-sm font-bold text-brand-600 dark:text-brand-400 uppercase tracking-tighter">
                                    {selectedIds.length} Movies Selected
                                </span>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Movie Selection */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input
                                        placeholder="Search movies to fix..."
                                        className="pl-10 h-11 rounded-none border-gray-100 dark:border-gray-800"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-11 rounded-none px-4"
                                    onClick={() => moviesQuery.refetch()}
                                >
                                    <Filter size={16} className="mr-2" />
                                    Refresh
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[700px] pr-2 no-scrollbar">
                                {moviesQuery.isLoading ? (
                                    [...Array(6)].map((_, i) => (
                                        <div key={i} className="h-24 bg-gray-50 dark:bg-gray-800/40 animate-pulse border border-gray-100 dark:border-gray-800" />
                                    ))
                                ) : movies.length === 0 ? (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                                        <AlertCircle size={40} className="mb-2 opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-tighter">No candidates found for fixing</p>
                                    </div>
                                ) : (
                                    movies.map((m: any) => (
                                        <div
                                            key={m.id}
                                            onClick={() => toggleSelection(m.id)}
                                            className={`group relative flex gap-4 p-3 border transition-all cursor-pointer ${selectedIds.includes(m.id)
                                                ? 'bg-brand-500/5 border-brand-500 ring-1 ring-brand-500'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-800'
                                                }`}
                                        >
                                            <div className="w-14 h-20 bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 relative">
                                                <img src={m.poster_url} className="w-full h-full object-cover" alt="" />
                                                <div className={`absolute inset-0 flex items-center justify-center bg-brand-500/80 transition-opacity ${selectedIds.includes(m.id) ? 'opacity-100' : 'opacity-0'}`}>
                                                    <CheckCircle2 size={24} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter leading-tight">
                                                    {m.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-brand-500 uppercase">{m.genre}</span>
                                                    <span className="text-[10px] text-gray-400">•</span>
                                                    <span className="text-[10px] text-gray-500 font-mono">VJ {m.vj_name}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); selectSimilar(m); }}
                                                    className="mt-2 text-[9px] font-black text-gray-400 hover:text-brand-500 uppercase tracking-widest text-left opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Select Similar
                                                </button>
                                            </div>
                                            {selectedIds.includes(m.id) ? (
                                                <CheckSquare size={16} className="text-brand-500 shrink-0" />
                                            ) : (
                                                <Square size={16} className="text-gray-200 dark:text-gray-800 shrink-0 group-hover:text-brand-300" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Series Construction */}
                    <div className="lg:col-span-12 xl:col-span-5">
                        <div className="sticky top-24 space-y-6">
                            <form onSubmit={handleConvert} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8">
                                <div className="flex items-center gap-3 mb-8 border-b border-gray-50 dark:border-gray-800 pb-4">
                                    <div className="w-10 h-10 bg-brand-500/10 flex items-center justify-center">
                                        <Layers className="text-brand-500" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter">Construct Series</h2>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Master Metadata</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-tighter">Master Series Name</Label>
                                        <Input
                                            placeholder="e.g. Money Heist (Complete Saga)"
                                            className="h-11 rounded-none dark:bg-gray-800/40"
                                            value={serieName}
                                            onChange={(e) => setSerieName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-tighter">Primary Genre</Label>
                                            <Input
                                                placeholder="Action"
                                                className="h-11 rounded-none dark:bg-gray-800/40"
                                                value={genre}
                                                onChange={(e) => setGenre(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-tighter">Master VJ Name</Label>
                                            <Input
                                                placeholder="VJ Junior"
                                                className="h-11 rounded-none dark:bg-gray-800/40"
                                                value={vjName}
                                                onChange={(e) => setVjName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-tighter">Master Description</Label>
                                        <TextArea
                                            placeholder="The full series following the story of..."
                                            className="h-32 rounded-none dark:bg-gray-800/40"
                                            value={description}
                                            onChange={setDescription}
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 mb-6 relative">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversion Strategy</h4>
                                                <div className="flex gap-1">
                                                    {[...Array(Math.min(5, selectedIds.length))].map((_, i) => (
                                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                                    ))}
                                                </div>
                                            </div>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                                                    <CheckCircle2 size={12} className="text-brand-500" />
                                                    Create Series: {serieName || '...'}
                                                </li>
                                                <li className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase">
                                                    <CheckCircle2 size={12} className="text-brand-500" />
                                                    Generate {selectedIds.length} Episodes
                                                </li>
                                                <li className="flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                                                    <AlertCircle size={12} className="text-red-400" />
                                                    Destructive: Remove original movies
                                                </li>
                                            </ul>
                                        </div>

                                        <Button
                                            type="submit"
                                            isLoading={convertMutation.isPending}
                                            disabled={selectedIds.length === 0}
                                            className="w-full h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-none shadow-xl shadow-brand-600/20 uppercase font-black tracking-widest text-sm"
                                        >
                                            Infect Conversion
                                            <ArrowRight size={18} className="ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            {/* Info Card */}
                            <div className="bg-amber-500/5 border border-amber-500/10 p-6">
                                <div className="flex gap-4">
                                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-tighter mb-1">Architect Note</h4>
                                        <p className="text-[10px] text-amber-700/70 leading-relaxed font-medium">
                                            Episodes will be titled based on their original movie names. The first selected movie's poster will be used as the Series Master Poster.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
