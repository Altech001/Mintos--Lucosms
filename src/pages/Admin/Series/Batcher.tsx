'use client';

import { useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    FileJson,
    FolderUp,
    List,
    Loader2,
    Pause,
    Play,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { moviesApi } from "../../../context/movies_api";
import useCustomToast from "../../../hooks/useCustomToast";

// ─── Types ──────────────────────────────────────────────
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

type FileStatus = 'queued' | 'reading' | 'uploading' | 'success' | 'error';

interface BatchFile {
    id: string;
    file: File;
    fileName: string;
    fileSize: number;
    status: FileStatus;
    error?: string;
    /** How many series were found inside this JSON file */
    seriesCount?: number;
    /** How many series have been fully uploaded */
    seriesUploaded?: number;
    /** Current series name being uploaded */
    currentSeriesName?: string;
    /** Current episode progress within the active series */
    currentEpIndex?: number;
    totalEps?: number;
}

// ─── Component ──────────────────────────────────────────
export default function Batcher() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();

    const [files, setFiles] = useState<BatchFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const abortRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // ── Helpers ──────────────────────────────────────────
    const updateFile = useCallback((id: string, patch: Partial<BatchFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
    }, []);

    const addFiles = useCallback((incoming: FileList | File[]) => {
        const newFiles: BatchFile[] = Array.from(incoming)
            .filter(f => f.name.endsWith('.json'))
            .map(f => ({
                id: Math.random().toString(36).substring(2, 10),
                file: f,
                fileName: f.name,
                fileSize: f.size,
                status: 'queued' as const,
            }));

        if (newFiles.length === 0) {
            showErrorToast('No valid .json files selected');
            return;
        }

        setFiles(prev => [...prev, ...newFiles]);
        showSuccessToast(`${newFiles.length} file(s) added to queue`);
    }, [showSuccessToast, showErrorToast]);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
    }, []);

    // ── Drag & Drop ─────────────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles]);

    // ── Read a single JSON file ─────────────────────────
    const readJsonFile = (file: File): Promise<RawSeries[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    const data: RawSeries[] = Array.isArray(json) ? json : [json];
                    resolve(data);
                } catch {
                    reject(new Error('Invalid JSON'));
                }
            };
            reader.onerror = () => reject(new Error('Could not read file'));
            reader.readAsText(file);
        });
    };

    // ── Upload one series (reused from SeriesBatchUploader) ──
    const uploadOneSeries = async (
        series: RawSeries,
        fileId: string,
    ) => {
        // 1. Create the series
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

        // 2. Upload episodes one by one
        for (let i = 0; i < series.episodes.length; i++) {
            if (abortRef.current) throw new Error('Aborted by user');

            const ep = series.episodes[i];
            updateFile(fileId, {
                currentEpIndex: i + 1,
                totalEps: series.episodes.length,
            });

            await moviesApi.createEpisode(seriesId, {
                name: ep.name,
                video_url: ep.video_url,
                poster_url: ep.poster_url || series.poster_url || '',
                genre: ep.genre || series.genre || '',
                stars: Number(ep.stars || series.stars || 0),
                vj_name: ep.vj_name || series.vj_name || '',
            });
        }
    };

    // ── Process all files sequentially ──────────────────
    const processQueue = async () => {
        setIsProcessing(true);
        abortRef.current = false;

        const pending = files.filter(f => f.status === 'queued' || f.status === 'error');

        for (const batchFile of pending) {
            if (abortRef.current) break;

            // Step 1 – Read file
            updateFile(batchFile.id, { status: 'reading', error: undefined });

            let seriesList: RawSeries[];
            try {
                seriesList = await readJsonFile(batchFile.file);
            } catch (err: any) {
                updateFile(batchFile.id, { status: 'error', error: err.message });
                continue; // skip to next file
            }

            updateFile(batchFile.id, {
                status: 'uploading',
                seriesCount: seriesList.length,
                seriesUploaded: 0,
            });

            // Step 2 – Upload each series inside this file
            let allGood = true;
            for (let si = 0; si < seriesList.length; si++) {
                if (abortRef.current) {
                    allGood = false;
                    break;
                }

                const series = seriesList[si];
                updateFile(batchFile.id, {
                    currentSeriesName: series.name,
                    seriesUploaded: si,
                    currentEpIndex: 0,
                    totalEps: series.episodes.length,
                });

                try {
                    await uploadOneSeries(series, batchFile.id);
                } catch (err: any) {
                    updateFile(batchFile.id, {
                        status: 'error',
                        error: `"${series.name}": ${err.message}`,
                    });
                    allGood = false;
                    break; // stop processing this file
                }
            }

            if (allGood) {
                updateFile(batchFile.id, {
                    status: 'success',
                    seriesUploaded: seriesList.length,
                    currentSeriesName: undefined,
                    currentEpIndex: undefined,
                    totalEps: undefined,
                });
            }
        }

        setIsProcessing(false);
        queryClient.invalidateQueries({ queryKey: ['admin-series'] });
        if (!abortRef.current) {
            showSuccessToast('Batch processing complete!');
        }
    };

    const stopProcessing = () => {
        abortRef.current = true;
    };

    // ── Stats ───────────────────────────────────────────
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.status === 'success').length;
    const errorFiles = files.filter(f => f.status === 'error').length;
    const queuedFiles = files.filter(f => f.status === 'queued').length;

    // ── Status UI helpers ───────────────────────────────
    const statusIcon = (status: FileStatus) => {
        switch (status) {
            case 'queued':
                return <FileJson className="w-5 h-5 text-gray-400" />;
            case 'reading':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'uploading':
                return <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />;
            case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const statusLabel = (f: BatchFile) => {
        switch (f.status) {
            case 'queued':
                return 'Queued';
            case 'reading':
                return 'Reading file…';
            case 'uploading':
                return `Uploading ${f.currentSeriesName || ''} — EP ${f.currentEpIndex || 0}/${f.totalEps || 0} (${(f.seriesUploaded || 0) + 1}/${f.seriesCount || '?'} series)`;
            case 'success':
                return `Done — ${f.seriesUploaded} series uploaded`;
            case 'error':
                return f.error || 'Failed';
        }
    };

    const statusColor = (status: FileStatus) => {
        switch (status) {
            case 'queued': return 'border-gray-200 dark:border-gray-800';
            case 'reading': return 'border-blue-200 dark:border-blue-900';
            case 'uploading': return 'border-brand-200 dark:border-brand-900';
            case 'success': return 'border-emerald-200 dark:border-emerald-900';
            case 'error': return 'border-red-200 dark:border-red-900';
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ─── Render ─────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-20">
            <PageMeta title="Multi-File Batcher" description="Upload many series JSON files at once" />
            <PageBreadcrumb pageTitle="Multi-File Batcher" />

            <div className="max-w-5xl mx-auto px-4 mt-8">
                {/* ── Header ─────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/series')}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderUp className="w-7 h-7 text-brand-600" />
                                Multi-File Batcher
                            </h1>
                            <p className="text-sm text-gray-500">
                                Drop up to 30+ JSON files — they'll be uploaded one at a time.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Hidden multi-file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            multiple
                            onChange={(e) => {
                                if (e.target.files) addFiles(e.target.files);
                                e.target.value = '';
                            }}
                            className="hidden"
                        />

                        <Button
                            variant="outline"
                            className="rounded-none"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            <FileJson className="w-4 h-4 mr-2 text-amber-500" />
                            Add JSON Files
                        </Button>

                        {completedFiles > 0 && (
                            <Button
                                variant="outline"
                                className="rounded-none text-xs"
                                onClick={clearCompleted}
                                disabled={isProcessing}
                            >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Clear Done
                            </Button>
                        )}

                        {totalFiles > 0 && !isProcessing && (
                            <Button
                                onClick={processQueue}
                                className="rounded-none bg-brand-600 text-white min-w-[160px]"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Batch ({queuedFiles + errorFiles})
                            </Button>
                        )}

                        {isProcessing && (
                            <Button
                                onClick={stopProcessing}
                                className="rounded-none bg-red-600 text-white min-w-[160px]"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Stop
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Stats Bar ──────────────────── */}
                {totalFiles > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Total', value: totalFiles, color: 'text-gray-700 dark:text-gray-200' },
                            { label: 'Queued', value: queuedFiles, color: 'text-gray-500' },
                            { label: 'Done', value: completedFiles, color: 'text-emerald-600' },
                            { label: 'Failed', value: errorFiles, color: 'text-red-600' },
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center"
                            >
                                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Overall Progress ───────────── */}
                {isProcessing && totalFiles > 0 && (
                    <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                Overall Progress
                            </span>
                            <span className="text-xs font-bold text-brand-600">
                                {completedFiles} / {totalFiles} files
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                                className="h-full bg-brand-600 transition-all duration-500 ease-out"
                                style={{ width: `${totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Drop Zone / File List ───────── */}
                {totalFiles === 0 ? (
                    <div
                        ref={dropRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`bg-white dark:bg-gray-900 border-2 border-dashed p-20 text-center transition-all cursor-pointer ${isDragOver
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                            : 'border-gray-200 dark:border-gray-800'
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Drop JSON Files Here
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Select or drag up to 30+ series JSON files. Each file will be processed one at a time.
                        </p>
                        <span className="px-6 py-2 bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-colors">
                            Browse Files
                        </span>
                    </div>
                ) : (
                    <div
                        ref={dropRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="space-y-2"
                    >
                        {/* Drop-more hint */}
                        {isDragOver && (
                            <div className="border-2 border-dashed border-brand-500 bg-brand-50 dark:bg-brand-950/20 p-6 text-center text-brand-600 font-bold text-sm">
                                Drop to add more files…
                            </div>
                        )}

                        {files.map((f, idx) => (
                            <div
                                key={f.id}
                                className={`bg-white dark:bg-gray-900 border transition-all ${statusColor(f.status)}`}
                            >
                                <div className="p-4 flex items-center gap-4">
                                    {/* Index */}
                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-500 flex-shrink-0">
                                        {idx + 1}
                                    </div>

                                    {/* Status icon */}
                                    <div className="flex-shrink-0">
                                        {statusIcon(f.status)}
                                    </div>

                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                {f.fileName}
                                            </h4>
                                            <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                                                {formatSize(f.fileSize)}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] mt-0.5 truncate ${f.status === 'error'
                                            ? 'text-red-500 font-semibold'
                                            : f.status === 'success'
                                                ? 'text-emerald-600 font-semibold'
                                                : 'text-gray-400'
                                            }`}>
                                            {statusLabel(f)}
                                        </p>

                                        {/* Episode progress bar for active file */}
                                        {f.status === 'uploading' && f.totalEps && f.totalEps > 0 && (
                                            <div className="mt-2 w-full h-1.5 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-500 transition-all duration-300"
                                                    style={{
                                                        width: `${(f.currentEpIndex || 0) / f.totalEps * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Series count badge */}
                                    {f.seriesCount != null && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-brand-600 uppercase tracking-widest flex-shrink-0">
                                            <List className="w-3 h-3" />
                                            {f.seriesCount} series
                                        </div>
                                    )}

                                    {/* Remove button */}
                                    {!isProcessing && (
                                        <button
                                            onClick={() => removeFile(f.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add more area */}
                        {!isProcessing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-200 dark:border-gray-800 p-4 text-center text-gray-400 hover:text-brand-600 hover:border-brand-400 transition-all text-sm font-bold"
                            >
                                + Add More Files
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
