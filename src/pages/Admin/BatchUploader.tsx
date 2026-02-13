'use client';

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FileJson, Play, Save, Trash2, Upload, AlertCircle, CheckCircle2, Loader2, X, Edit3, Film } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from '../../components/form/input/InputField';
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import { moviesApi } from "../../context/movies_api";
import useCustomToast from "../../hooks/useCustomToast";

interface RawJsonMovie {
    name: string;
    url: string;
    poster_url?: string;
    genre?: string;
    stars?: number;
    description?: string;
    category_name?: string;
    release_date?: string;
    [key: string]: any;
}

interface ProcessingMovie extends RawJsonMovie {
    id_temp: string;
    status: 'idle' | 'uploading' | 'success' | 'error';
    error?: string;
}

export default function BatchUploader() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();

    const [movies, setMovies] = useState<ProcessingMovie[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [editingMovie, setEditingMovie] = useState<ProcessingMovie | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const data = Array.isArray(json) ? json : [json];

                const processed = data.map((m: RawJsonMovie) => ({
                    ...m,
                    id_temp: Math.random().toString(36).substring(7),
                    status: 'idle' as const,
                }));

                setMovies(processed);
                showSuccessToast(`${processed.length} movies loaded from JSON`);
            } catch (error) {
                showErrorToast("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    const removeMovie = (id_temp: string) => {
        setMovies(prev => prev.filter(m => m.id_temp !== id_temp));
    };

    const updateMovie = (updated: ProcessingMovie) => {
        setMovies(prev => prev.map(m => m.id_temp === updated.id_temp ? updated : m));
        setEditingMovie(null);
    };

    const processUploads = async () => {
        if (movies.length === 0) return;
        setIsUploading(true);

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            if (movie.status === 'success') continue;

            setMovies(prev => prev.map(m => m.id_temp === movie.id_temp ? { ...m, status: 'uploading' } : m));

            try {
                const payload = {
                    name: movie.name,
                    description: movie.description || '',
                    poster_url: movie.poster_url || '',
                    genre: movie.genre || '',
                    vj_name: movie.vj_name || null,
                    directors: movie.directors || [],
                    duration: movie.duration || null,
                    release_date: movie.release_date || '',
                    category_name: movie.category_name || null,
                    stars: Number(movie.stars || 0),
                    video_url: movie.url || movie.video_url,
                };

                await moviesApi.createMovie(payload);

                setMovies(prev => prev.map(m => m.id_temp === movie.id_temp ? { ...m, status: 'success' } : m));
            } catch (error: any) {
                setMovies(prev => prev.map(m => m.id_temp === movie.id_temp ? { ...m, status: 'error', error: error.message } : m));
                console.error(`Failed to upload ${movie.name}`, error);
            }
        }

        setIsUploading(false);
        showSuccessToast("Batch process completed");
        queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    };

    const stats = {
        total: movies.length,
        pending: movies.filter(m => m.status === 'idle').length,
        success: movies.filter(m => m.status === 'success').length,
        error: movies.filter(m => m.status === 'error').length,
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-20">
            <PageMeta title="Batch Movie Uploader" description="Upload and cleanse movie data" />
            <PageBreadcrumb pageTitle="Batch Data Allocation" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Actions Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/movies')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Processor</h1>
                            <p className="text-sm text-gray-500">Upload JSON and cleanse data before allocation</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button variant="outline" className="rounded-none border-gray-200 dark:border-gray-800">
                                <FileJson className="w-4 h-4 mr-2 text-amber-500" />
                                Load JSON
                            </Button>
                        </div>

                        {movies.length > 0 && (
                            <Button
                                onClick={processUploads}
                                isLoading={isUploading}
                                disabled={isUploading || stats.pending === 0}
                                className="rounded-none bg-brand-600 hover:bg-brand-700 text-white min-w-[140px]"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Upload ({stats.pending})
                            </Button>
                        )}
                    </div>
                </div>

                {/* Dashboard Stats */}
                {movies.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Loaded', value: stats.total, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-gray-900' },
                            { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
                            { label: 'Completed', value: stats.success, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                            { label: 'Failed', value: stats.error, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} border border-gray-100 dark:border-gray-800 p-4`}>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Movie List / Allocation Grid */}
                <div className="space-y-4">
                    {movies.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 p-20 text-center">
                            <div className="max-w-sm mx-auto">
                                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Data Loaded</h3>
                                <p className="text-sm text-gray-500 mb-6">Upload a JSON file containing movie metadata to begin the batch process.</p>
                                <div className="relative inline-block">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Button className="bg-brand-600 text-white rounded-none">Browse JSON File</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        movies.map((movie) => (
                            <div
                                key={movie.id_temp}
                                className={`bg-white dark:bg-gray-900 border ${movie.status === 'success' ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-gray-100 dark:border-gray-800'} p-4 flex flex-col md:flex-row gap-6 transition-all group`}
                            >
                                <div className="w-full md:w-48 h-32 bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative overflow-hidden">
                                    {movie.poster_url ? (
                                        <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Film className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        {movie.status === 'uploading' && <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />}
                                        {movie.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-white dark:bg-gray-900 rounded-full" />}
                                        {movie.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 bg-white dark:bg-gray-900 rounded-full" />}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">{movie.name}</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingMovie(movie)}
                                                    className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeMovie(movie.id_temp)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-gray-500 uppercase font-bold tracking-wider">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 font-medium lowercase">Genre:</span>
                                                <span className="text-gray-700 dark:text-gray-300">{movie.genre || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 font-medium lowercase">Rating:</span>
                                                <span className="text-gray-700 dark:text-gray-300">{movie.stars || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 font-medium lowercase">Release:</span>
                                                <span className="text-gray-700 dark:text-gray-300">{movie.release_date || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 font-medium lowercase">Category:</span>
                                                <span className="text-gray-700 dark:text-gray-300">{movie.category_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {movie.status === 'error' && (
                                        <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-[10px] text-red-600 font-bold uppercase tracking-tight">
                                            Error: {movie.error}
                                        </div>
                                    )}

                                    <div className="mt-4 text-[10px] font-mono text-gray-400 truncate">
                                        URL: {movie.url || movie.video_url}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Edit Modal */}
            {editingMovie && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Cleanse Movie Data</h3>
                            <button onClick={() => setEditingMovie(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1 block uppercase">Name</Label>
                                <Input
                                    value={editingMovie.name}
                                    onChange={(e) => setEditingMovie({ ...editingMovie, name: e.target.value })}
                                    className="rounded-none dark:bg-gray-800/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[11px] font-bold text-gray-400 mb-1 block uppercase">Genre</Label>
                                    <Input
                                        value={editingMovie.genre}
                                        onChange={(e) => setEditingMovie({ ...editingMovie, genre: e.target.value })}
                                        className="rounded-none dark:bg-gray-800/50"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-bold text-gray-400 mb-1 block uppercase">Stars</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={editingMovie.stars}
                                        onChange={(e) => setEditingMovie({ ...editingMovie, stars: Number(e.target.value) })}
                                        className="rounded-none dark:bg-gray-800/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1 block uppercase">Poster URL</Label>
                                <Input
                                    value={editingMovie.poster_url}
                                    onChange={(e) => setEditingMovie({ ...editingMovie, poster_url: e.target.value })}
                                    className="rounded-none dark:bg-gray-800/50"
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1 block uppercase">Description</Label>
                                <TextArea
                                    value={editingMovie.description}
                                    onChange={(val) => setEditingMovie({ ...editingMovie, description: val })}
                                    className="rounded-none dark:bg-gray-800/50 h-32"
                                />
                            </div>
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setEditingMovie(null)} className="rounded-none">Cancel</Button>
                                <Button onClick={() => updateMovie(editingMovie)} className="rounded-none bg-brand-600 text-white">Save Changes</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
