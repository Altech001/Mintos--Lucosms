'use client';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChevronLeft, Film, Plus, Save, Trash2,
    X, Edit3, Play, LayoutGrid
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from '../../../components/form/input/InputField';
import TextArea from "../../../components/form/input/TextArea";
import Button from "../../../components/ui/button/Button";
import { moviesApi, Episode, tmdbApi } from "../../../context/movies_api";
import useCustomToast from "../../../hooks/useCustomToast";

export default function SeriesEditScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();
    const isEditing = id && id !== 'new';

    // Series state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [posterUrl, setPosterUrl] = useState('');
    const [genre, setGenre] = useState('');
    const [vjName, setVjName] = useState('');
    const [duration, setDuration] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [categoryName, setCategoryName] = useState('Series');
    const [stars, setStars] = useState(0);

    // Episode state for modal
    const [showEpisodeModal, setShowEpisodeModal] = useState(false);
    const [editingEpisode, setEditingEpisode] = useState<Partial<Episode> | null>(null);
    const [epName, setEpName] = useState('');
    const [epVideoUrl, setEpVideoUrl] = useState('');
    const [epPosterUrl, setEpPosterUrl] = useState('');
    const [epGenre, setEpGenre] = useState('');
    const [epStars, setEpStars] = useState(0);
    const [epVjName, setEpVjName] = useState('');

    // TMDB Search state
    const [tmdbResults, setTmdbResults] = useState<any[]>([]);
    const [showTmdbResults, setShowTmdbResults] = useState(false);
    const searchTimeout = useRef<any>(null);

    // Fetch series data
    const { data: seriesData, isLoading } = useQuery({
        queryKey: ['series', id],
        queryFn: () => moviesApi.getSeriesById(Number(id)),
        enabled: !!isEditing,
    });

    useEffect(() => {
        if (seriesData) {
            setName(seriesData.name);
            setDescription(seriesData.description || '');
            setPosterUrl(seriesData.poster_url || '');
            setGenre(seriesData.genre || '');
            setVjName(seriesData.vj_name || '');
            setDuration(seriesData.duration || '');
            setReleaseDate(seriesData.release_date || '');
            setCategoryName(seriesData.category_name || 'Series');
            setStars(seriesData.stars || 0);
        }
    }, [seriesData]);

    const handleTmdbSearch = (val: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (val.length < 2) return;

        searchTimeout.current = setTimeout(async () => {
            try {
                // For series, we use search/tv
                const resp = await fetch(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(val)}`, {
                    headers: { 'Authorization': `Bearer ${tmdbApi.searchMovies.toString().match(/Bearer (.*)'/)?.[1]}`, 'Accept': 'application/json' }
                });
                const data = await resp.json();
                setTmdbResults(data.results?.slice(0, 5) || []);
                setShowTmdbResults(true);
            } catch (e) {
                console.error(e);
            }
        }, 500);
    };

    const selectTmdbSeries = async (s: any) => {
        setName(s.name);
        setShowTmdbResults(false);
        try {
            // Fetch TV details
            const resp = await fetch(`https://api.themoviedb.org/3/tv/${s.id}?append_to_response=credits`, {
                headers: { 'Authorization': `Bearer ${tmdbApi.searchMovies.toString().match(/Bearer (.*)'/)?.[1]}`, 'Accept': 'application/json' }
            });
            const details = await resp.json();
            setDescription(details.overview || '');
            setPosterUrl(details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '');
            setReleaseDate(details.first_air_date || '');
            setStars(Math.round((details.vote_average || 0) * 10) / 10);
            if (details.genres?.length) setGenre(details.genres[0].name);
            showSuccessToast(`Imported metadata for ${s.name}`);
        } catch (e) {
            showErrorToast('Failed to fetch TMDB details');
        }
    };

    const upsertSeriesMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (isEditing) return moviesApi.updateSeries(Number(id), payload);
            return moviesApi.createSeries(payload);
        },
        onSuccess: (data) => {
            showSuccessToast(isEditing ? 'Series updated' : 'Series created');
            queryClient.invalidateQueries({ queryKey: ['admin-series'] });
            if (!isEditing) navigate(`/admin/series/edit/${data.id}`);
        },
        onError: (e: any) => showErrorToast(e.message)
    });

    const upsertEpisodeMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editingEpisode?.id) return moviesApi.updateEpisode(editingEpisode.id, payload);
            return moviesApi.createEpisode(Number(id), payload);
        },
        onSuccess: () => {
            showSuccessToast('Episode saved');
            queryClient.invalidateQueries({ queryKey: ['series', id] });
            setShowEpisodeModal(false);
            resetEpForm();
        },
        onError: (e: any) => showErrorToast(e.message)
    });

    const deleteEpisodeMutation = useMutation({
        mutationFn: (epId: number) => moviesApi.deleteEpisode(epId),
        onSuccess: () => {
            showSuccessToast('Episode deleted');
            queryClient.invalidateQueries({ queryKey: ['series', id] });
        }
    });

    const resetEpForm = () => {
        setEditingEpisode(null);
        setEpName('');
        setEpVideoUrl('');
        setEpPosterUrl('');
        setEpGenre(genre);
        setEpStars(0);
        setEpVjName(vjName);
    };

    const handleEpEdit = (ep: Episode) => {
        setEditingEpisode(ep);
        setEpName(ep.name);
        setEpVideoUrl(ep.video_url);
        setEpPosterUrl(ep.poster_url);
        setEpGenre(ep.genre);
        setEpStars(ep.stars);
        setEpVjName(ep.vj_name);
        setShowEpisodeModal(true);
    };

    if (isLoading) return <div className="p-20 text-center uppercase font-bold tracking-widest animate-pulse">Initializing Data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-20">
            <PageMeta title={isEditing ? 'Edit Series' : 'Create Series'} description="Series content management" />
            <PageBreadcrumb pageTitle={isEditing ? 'Series Architect' : 'Show Designer'} />

            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/admin/series')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 font-bold transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Catalog
                    </button>

                    <Button
                        onClick={() => upsertSeriesMutation.mutate({
                            name, description, poster_url: posterUrl, genre, vj_name: vjName,
                            duration, release_date: releaseDate, category_name: categoryName, stars: Number(stars)
                        })}
                        isLoading={upsertSeriesMutation.isPending}
                        className="rounded-none bg-brand-600 text-white min-w-[160px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? 'Save Series' : 'Create Show'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Series Basic Info */}
                    <div className="lg:col-span-2 space-y-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Series Title</Label>
                                <div className="relative">
                                    <Input
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); handleTmdbSearch(e.target.value); }}
                                        className="h-12 text-lg rounded-none dark:bg-gray-800/40"
                                        placeholder="Enter show name..."
                                    />
                                    {showTmdbResults && tmdbResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 z-[100] shadow-2xl">
                                            {tmdbResults.map(s => (
                                                <button key={s.id} onClick={() => selectTmdbSeries(s)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 flex gap-4 items-center group">
                                                    <img src={`https://image.tmdb.org/t/p/w92${s.poster_path}`} className="w-10 h-14 object-cover" />
                                                    <div>
                                                        <div className="text-sm font-bold group-hover:text-brand-600">{s.name}</div>
                                                        <div className="text-[10px] text-gray-400">{s.first_air_date}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Description</Label>
                                <TextArea
                                    value={description}
                                    onChange={setDescription}
                                    className="h-32 rounded-none dark:bg-gray-800/40"
                                    placeholder="Brief plot summary..."
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Genre</Label>
                                <Input value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-none h-11" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Stars (0-10)</Label>
                                <Input type="number" step="0.1" value={stars} onChange={(e) => setStars(Number(e.target.value))} className="rounded-none h-11" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Release Date</Label>
                                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="rounded-none h-11 whitespace-pre" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Category</Label>
                                <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="rounded-none h-11" />
                            </div>
                        </div>

                        {/* Episodes Section */}
                        {isEditing && (
                            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold flex items-center gap-3">
                                        <LayoutGrid className="w-5 h-5 text-brand-600" />
                                        Episode Allocation
                                    </h2>
                                    <Button onClick={() => { resetEpForm(); setShowEpisodeModal(true); }} className="h-9 px-4 rounded-none bg-gray-900 border-none text-white text-xs">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Episode
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {seriesData?.episodes?.length ? seriesData.episodes.map(ep => (
                                        <div key={ep.id} className="bg-gray-50 dark:bg-gray-800/40 p-3 flex items-center gap-4 group">
                                            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-800 flex-shrink-0 relative overflow-hidden">
                                                {ep.poster_url && <img src={ep.poster_url} className="w-full h-full object-cover" />}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <Play className="w-4 h-4 text-white fill-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate">{ep.name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono truncate">{ep.video_url}</div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEpEdit(ep)} className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteEpisodeMutation.mutate(ep.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center border border-dashed border-gray-200 dark:border-gray-800">
                                            <p className="text-sm text-gray-400">No episodes allocated yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Metadata */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6">
                            <Label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-tighter">Show Identity (Poster)</Label>
                            <div className="aspect-[2/3] bg-gray-50 dark:bg-gray-800/40 border-2 border-dashed border-gray-100 dark:border-gray-800 mb-4 overflow-hidden relative group">
                                {posterUrl ? (
                                    <img src={posterUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film className="w-10 h-10 text-gray-100" />
                                    </div>
                                )}
                            </div>
                            <Input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="Poster URL..." className="rounded-none text-xs" />

                            <div className="mt-6 space-y-4">
                                <div>
                                    <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">VJ / Commentator</Label>
                                    <Input value={vjName} onChange={(e) => setVjName(e.target.value)} className="rounded-none h-9 text-xs" />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Show Length</Label>
                                    <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 10 Episodes" className="rounded-none h-9 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Episode Modal */}
            {showEpisodeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-sm">
                                {editingEpisode ? 'Edit Episode' : 'Allocate Episode'}
                            </h3>
                            <button onClick={() => setShowEpisodeModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Episode Title</Label>
                                <Input value={epName} onChange={(e) => setEpName(e.target.value)} className="rounded-none" placeholder="e.g. S01E01" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Stream Endpoint (Video URL)</Label>
                                <Input value={epVideoUrl} onChange={(e) => setEpVideoUrl(e.target.value)} className="rounded-none font-mono text-xs h-11" placeholder="https://..." />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Thumbnail / Poster</Label>
                                <Input value={epPosterUrl} onChange={(e) => setEpPosterUrl(e.target.value)} className="rounded-none h-9 text-xs" placeholder="Inherit from series if blank..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Commentator (VJ)</Label>
                                    <Input value={epVjName} onChange={(e) => setEpVjName(e.target.value)} className="rounded-none h-9 text-xs" />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Stars</Label>
                                    <Input type="number" step="0.1" value={epStars} onChange={(e) => setEpStars(Number(e.target.value))} className="rounded-none h-9 text-xs" />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowEpisodeModal(false)} className="rounded-none text-xs">Cancel</Button>
                                <Button
                                    onClick={() => upsertEpisodeMutation.mutate({
                                        name: epName, video_url: epVideoUrl, poster_url: epPosterUrl || posterUrl,
                                        genre: epGenre || genre, stars: Number(epStars), vj_name: epVjName
                                    })}
                                    isLoading={upsertEpisodeMutation.isPending}
                                    className="rounded-none bg-brand-600 text-white min-w-[120px]"
                                >
                                    Save Entry
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
