'use client';

import { useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle, CheckCircle2,
    ChevronLeft,
    Edit3,
    FileJson,
    Film,
    Layers, List,
    Loader2,
    Play, Trash2, Upload,
    X
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Input from '../../../components/form/input/InputField';
import TextArea from "../../../components/form/input/TextArea";
import Label from "../../../components/form/Label";
import Button from "../../../components/ui/button/Button";
import { moviesApi } from "../../../context/movies_api";
import useCustomToast from "../../../hooks/useCustomToast";

interface RawEpisode {
    name: string;
    video_url: string;
    poster_url?: string;
    genre?: string;
    stars?: number;
    vj_name?: string;
}

interface RawSeries {
    name: string;
    poster_url?: string;
    genre?: string;
    stars?: number;
    vj_name?: string;
    duration?: string;
    description?: string;
    category_name?: string;
    release_date?: string;
    episodes: RawEpisode[];
}

interface ProcessingSeries extends RawSeries {
    id_temp: string;
    status: 'idle' | 'uploading_series' | 'uploading_episodes' | 'success' | 'error';
    current_ep_index?: number;
    error?: string;
}

export default function SeriesBatchUploader() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();

    const [seriesList, setSeriesList] = useState<ProcessingSeries[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [editingSeries, setEditingSeries] = useState<ProcessingSeries | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const data = Array.isArray(json) ? json : [json];

                const processed = data.map((s: RawSeries) => ({
                    ...s,
                    id_temp: Math.random().toString(36).substring(7),
                    status: 'idle' as const,
                }));

                setSeriesList(processed);
                showSuccessToast(`${processed.length} series loaded`);
            } catch (error) {
                showErrorToast("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    const processUploads = async () => {
        if (seriesList.length === 0) return;
        setIsUploading(true);

        for (const series of seriesList) {
            if (series.status === 'success') continue;

            setSeriesList(prev => prev.map(s => s.id_temp === series.id_temp ? { ...s, status: 'uploading_series' } : s));

            try {
                // 1. Create Series
                const seriesPayload = {
                    name: series.name,
                    poster_url: series.poster_url || '',
                    genre: series.genre || '',
                    stars: Number(series.stars || 0),
                    vj_name: series.vj_name || '',
                    duration: series.duration || '',
                    description: series.description || '',
                    category_name: series.category_name || 'Series',
                    release_date: series.release_date || '',
                };

                const createdSeries = await moviesApi.createSeries(seriesPayload);
                const seriesId = createdSeries.id;

                // 2. Upload Episodes
                setSeriesList(prev => prev.map(s => s.id_temp === series.id_temp ? { ...s, status: 'uploading_episodes', current_ep_index: 0 } : s));

                for (let i = 0; i < series.episodes.length; i++) {
                    const ep = series.episodes[i];
                    setSeriesList(prev => prev.map(s => s.id_temp === series.id_temp ? { ...s, current_ep_index: i } : s));

                    await moviesApi.createEpisode(seriesId, {
                        name: ep.name,
                        video_url: ep.video_url,
                        poster_url: ep.poster_url || series.poster_url || '',
                        genre: ep.genre || series.genre || '',
                        stars: Number(ep.stars || series.stars || 0),
                        vj_name: ep.vj_name || series.vj_name || '',
                    });
                }

                setSeriesList(prev => prev.map(s => s.id_temp === series.id_temp ? { ...s, status: 'success' } : s));
            } catch (error: any) {
                setSeriesList(prev => prev.map(s => s.id_temp === series.id_temp ? { ...s, status: 'error', error: error.message } : s));
                console.error(`Failed to upload ${series.name}`, error);
            }
        }

        setIsUploading(false);
        showSuccessToast("Series batch process completed");
        queryClient.invalidateQueries({ queryKey: ['admin-series'] });
    };

    const removeSeries = (id_temp: string) => {
        setSeriesList(prev => prev.filter(s => s.id_temp !== id_temp));
    };

    const updateSeries = (updated: ProcessingSeries) => {
        setSeriesList(prev => prev.map(s => s.id_temp === updated.id_temp ? updated : s));
        setEditingSeries(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-20">
            <PageMeta title="Series Batch Uploader" description="Bulk upload TV shows and episodes" />
            <PageBreadcrumb pageTitle="Series Data Pipeline" />

            <div className="max-w-7xl mx-auto px-4 mt-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/series')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Layers className="w-7 h-7 text-brand-600" />
                                Series Batch Processor
                            </h1>
                            <p className="text-sm text-gray-500">Automated show allocation and episode mapping</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Button variant="outline" className="rounded-none">
                                <FileJson className="w-4 h-4 mr-2 text-amber-500" />
                                Import Series JSON
                            </Button>
                        </div>
                        {seriesList.length > 0 && (
                            <Button onClick={processUploads} isLoading={isUploading} className="rounded-none bg-brand-600 text-white min-w-[160px]">
                                <Play className="w-4 h-4 mr-2" />
                                Start Pipeline
                            </Button>
                        )}
                    </div>
                </div>

                {/* Queue */}
                <div className="space-y-4">
                    {seriesList.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 p-20 text-center">
                            <Upload className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Queue Empty</h3>
                            <p className="text-sm text-gray-500 mb-6">Load show metadata with nested episode objects.</p>
                            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" id="json-upload" />
                            <label htmlFor="json-upload" className="px-6 py-2 bg-brand-600 text-white font-bold text-sm cursor-pointer hover:bg-brand-700 transition-colors">
                                Browse Files
                            </label>
                        </div>
                    ) : (
                        seriesList.map((s) => (
                            <div key={s.id_temp} className={`bg-white dark:bg-gray-900 border transition-all ${s.status === 'success' ? 'border-emerald-100' : 'border-gray-100 dark:border-gray-800'}`}>
                                <div className="p-4 flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-32 aspect-[2/3] bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0">
                                        {s.poster_url ? <img src={s.poster_url} className="w-full h-full object-cover" /> : <Film className="w-8 h-8 m-auto text-gray-300" />}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            {s.status === 'uploading_series' && <Loader2 className="w-6 h-6 text-white animate-spin" />}
                                            {s.status === 'uploading_episodes' && (
                                                <div className="text-white text-[10px] font-bold text-center">
                                                    <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin" />
                                                    EP {s.current_ep_index! + 1}/{s.episodes.length}
                                                </div>
                                            )}
                                            {s.status === 'success' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                                            {s.status === 'error' && <AlertCircle className="w-8 h-8 text-red-500" />}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">{s.name}</h3>
                                                <div className="flex gap-4 mt-1">
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600 uppercase tracking-widest">
                                                        <List className="w-3 h-3" />
                                                        {s.episodes.length} Episodes Allocated
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingSeries(s)} className="p-2 text-gray-400 hover:text-brand-600"><Edit3 className="w-4 h-4" /></button>
                                                <button onClick={() => removeSeries(s.id_temp)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] uppercase font-black tracking-tight text-gray-400">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2">
                                                <div className="mb-1 text-gray-300">Genre</div>
                                                <div className="text-gray-800 dark:text-gray-200 truncate">{s.genre || 'NONE'}</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2">
                                                <div className="mb-1 text-gray-300">Rating</div>
                                                <div className="text-gray-800 dark:text-gray-200">{s.stars || 0}</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2">
                                                <div className="mb-1 text-gray-300">DJ / VJ</div>
                                                <div className="text-gray-800 dark:text-gray-200 truncate">{s.vj_name || 'NONE'}</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2">
                                                <div className="mb-1 text-gray-300">Release</div>
                                                <div className="text-gray-800 dark:text-gray-200">{s.release_date || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {s.error && <div className="mt-4 p-3 bg-red-50 text-[10px] font-bold text-red-600 uppercase border border-red-100">Error: {s.error}</div>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Edit modal for Series Cleansing */}
            {editingSeries && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold uppercase tracking-widest text-sm">Series Cleansing</h3>
                            <button onClick={() => setEditingSeries(null)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <Label className="text-[10px] font-bold uppercase mb-1 block text-gray-400">Title</Label>
                                <Input value={editingSeries.name} onChange={(e) => setEditingSeries({ ...editingSeries, name: e.target.value })} className="rounded-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[10px] font-bold uppercase mb-1 block text-gray-400">Genre</Label>
                                    <Input value={editingSeries.genre} onChange={(e) => setEditingSeries({ ...editingSeries, genre: e.target.value })} className="rounded-none h-10" />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold uppercase mb-1 block text-gray-400">VJ Name</Label>
                                    <Input value={editingSeries.vj_name} onChange={(e) => setEditingSeries({ ...editingSeries, vj_name: e.target.value })} className="rounded-none h-10" />
                                </div>
                            </div>
                            <TextArea value={editingSeries.description} onChange={(val) => setEditingSeries({ ...editingSeries, description: val })} className="rounded-none h-32" />
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <Button variant="outline" onClick={() => setEditingSeries(null)} className="rounded-none">Discard</Button>
                                <Button onClick={() => updateSeries(editingSeries)} className="rounded-none bg-brand-600 text-white">Update Entry</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
