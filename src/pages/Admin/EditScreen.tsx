'use client';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Film, Plus, Save, Send, Trash2, Video, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from '../../components/form/input/InputField';
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import { MovieResponse, moviesApi, tmdbApi } from "../../context/movies_api";
import useCustomToast from "../../hooks/useCustomToast";

interface BatchMovie extends Partial<MovieResponse> {
    tempId: string;
}

export default function EditScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccessToast, showErrorToast } = useCustomToast();
    const isEditing = id && id !== 'new';

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [posterUrl, setPosterUrl] = useState('');
    const [genre, setGenre] = useState('');
    const [vjName, setVjName] = useState('');
    const [directors, setDirectors] = useState('');
    const [duration, setDuration] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [stars, setStars] = useState(0);
    const [videoUrl, setVideoUrl] = useState('');

    // TMDB Search state
    const [tmdbResults, setTmdbResults] = useState<any[]>([]);
    const [isTmdbSearching, setIsTmdbSearching] = useState(false);
    const [showTmdbResults, setShowTmdbResults] = useState(false);
    const searchTimeout = useRef<any>(null);

    // Batch state
    const [batch, setBatch] = useState<BatchMovie[]>([]);

    useEffect(() => {
        const savedBatch = localStorage.getItem('movie_batch');
        if (savedBatch) {
            try {
                setBatch(JSON.parse(savedBatch));
            } catch (e) {
                console.error('Failed to parse batch from localStorage');
            }
        }
    }, []);

    const saveBatchToLocal = (newBatch: BatchMovie[]) => {
        setBatch(newBatch);
        localStorage.setItem('movie_batch', JSON.stringify(newBatch));
    };

    // Fetch movie if editing
    const { data: movieData, isLoading } = useQuery({
        queryKey: ['movie', id],
        queryFn: () => moviesApi.getMovieById(Number(id)),
        enabled: !!isEditing,
    });

    useEffect(() => {
        if (movieData) {
            setName(movieData.name);
            setDescription(movieData.description || '');
            setPosterUrl(movieData.poster_url || '');
            setGenre(movieData.genre || '');
            setVjName(movieData.vj_name || '');
            setDirectors(movieData.directors?.join(', ') || '');
            setDuration(movieData.duration || '');
            setReleaseDate(movieData.release_date || '');
            setCategoryName(movieData.category_name || '');
            setStars(movieData.stars || 0);
            setVideoUrl(movieData.video_url || '');
        }
    }, [movieData]);

    const handleTmdbSearch = (val: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (val.length < 2) {
            setTmdbResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setIsTmdbSearching(true);
            try {
                const data = await tmdbApi.searchMovies(val);
                setTmdbResults(data.results?.slice(0, 5) || []);
                setShowTmdbResults(true);
            } catch (error) {
                console.error('TMDB Search failed', error);
            } finally {
                setIsTmdbSearching(false);
            }
        }, 500);
    };

    const selectTmdbMovie = async (tmdbMovie: any) => {
        setName(tmdbMovie.title);
        setShowTmdbResults(false);
        try {
            const details = await tmdbApi.getMovieDetails(tmdbMovie.id);
            setDescription(details.overview || '');
            setPosterUrl(details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '');
            setReleaseDate(details.release_date || '');
            setStars(Math.round((details.vote_average || 0) * 10) / 10);
            if (details.genres && details.genres.length > 0) setGenre(details.genres[0].name);
            if (details.credits && details.credits.crew) {
                const directorNames = details.credits.crew
                    .filter((c: any) => c.job === 'Director')
                    .map((c: any) => c.name)
                    .join(', ');
                setDirectors(directorNames);
            }
            showSuccessToast(`Imported metadata for ${tmdbMovie.title}`);
        } catch (error) {
            showErrorToast('Failed to fetch full movie details from TMDB');
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setPosterUrl('');
        setGenre('');
        setVjName('');
        setDirectors('');
        setDuration('');
        setReleaseDate('');
        setCategoryName('');
        setStars(0);
        setVideoUrl('');
    };

    const addToBatch = () => {
        if (!name || !videoUrl) {
            showErrorToast('Name and Video URL are required');
            return;
        }
        const newMovie: BatchMovie = {
            tempId: Math.random().toString(36).substr(2, 9),
            name,
            description,
            poster_url: posterUrl,
            genre,
            vj_name: vjName || null,
            directors: directors.split(',').map(d => d.trim()).filter(d => d !== ''),
            duration: duration || null,
            release_date: releaseDate,
            category_name: categoryName || null,
            stars: Number(stars),
            video_url: videoUrl,
        };
        saveBatchToLocal([...batch, newMovie]);
        resetForm();
        showSuccessToast('Added to batch');
    };

    const removeFromBatch = (tempId: string) => {
        saveBatchToLocal(batch.filter(m => m.tempId !== tempId));
    };

    const uploadMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (isEditing) {
                return moviesApi.updateMovie(Number(id), payload);
            } else {
                return moviesApi.createMovie(payload);
            }
        },
        onSuccess: () => {
            showSuccessToast(isEditing ? 'Movie updated' : 'Movie created');
            queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
            if (!isEditing) navigate('/admin/movies');
        },
        onError: (e: any) => showErrorToast(e.message || 'Operation failed'),
    });

    const sendBatchMutation = useMutation({
        mutationFn: async () => {
            for (const movie of batch) {
                const { tempId, ...payload } = movie;
                await moviesApi.createMovie(payload);
            }
        },
        onSuccess: () => {
            showSuccessToast(`Successfully added ${batch.length} movies`);
            saveBatchToLocal([]);
            queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
            navigate('/admin/movies');
        },
        onError: (e: any) => showErrorToast(e.message || 'Batch upload failed'),
    });

    const handleSave = () => {
        const payload = {
            name,
            description,
            poster_url: posterUrl,
            genre,
            vj_name: vjName || null,
            directors: directors.split(',').map(d => d.trim()).filter(d => d !== ''),
            duration: duration || null,
            release_date: releaseDate,
            category_name: categoryName || null,
            stars: Number(stars),
            video_url: videoUrl,
        };
        uploadMutation.mutate(payload);
    };

    if (isLoading && isEditing) {
        return <div className="p-8 text-center">Loading movie data...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-20">
            <PageMeta title={isEditing ? 'Edit Movie' : 'Add New Movie'} description="Manage movie content" />
            <PageBreadcrumb pageTitle={isEditing ? 'Edit Movie' : 'Add New Movie'} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/admin/movies')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Catalog
                    </button>

                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <Button variant="outline" onClick={addToBatch} className="rounded-none border-gray-200 dark:border-gray-800">
                                <Plus className="w-4 h-4 mr-2" />
                                Add to Batch
                            </Button>
                        )}
                        <Button onClick={handleSave} isLoading={uploadMutation.isPending} className="rounded-none bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]">
                            <Save className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Movie' : 'Save Movie'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Movie Title</Label>
                                <div className="relative">
                                    <Input
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); handleTmdbSearch(e.target.value); }}
                                        onFocus={() => tmdbResults.length > 0 && setShowTmdbResults(true)}
                                        className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 focus:border-brand-500 h-12 text-lg"
                                        placeholder="Start typing to search TMDB..."
                                    />
                                    {isTmdbSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {showTmdbResults && tmdbResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 z-[100] shadow-2xl max-h-80 overflow-y-auto">
                                            {tmdbResults.map((m) => (
                                                <button key={m.id} onClick={() => selectTmdbMovie(m)} className="w-full text-left px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0 flex gap-4 items-center group">
                                                    {m.poster_path ? (
                                                        <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-12 h-16 object-cover flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-12 h-16 bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                            <Film className="w-6 h-6 text-gray-300" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-600 transition-colors">{m.title}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.release_date?.split('-')[0] || 'N/A'} • Rating: {m.vote_average}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Video URL (Streaming Endpoint)</Label>
                                <div className="relative">
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 pl-10 h-11 font-mono text-xs"
                                        placeholder="https://example.com/movie.mp4"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Description</Label>
                                <TextArea
                                    value={description}
                                    onChange={setDescription}
                                    rows={5}
                                    className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 resize-none h-32"
                                    placeholder="Enter movie summary..."
                                />
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Genre</Label>
                                <Input value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 h-11" />
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Release Date</Label>
                                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 h-11" />
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Duration</Label>
                                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 1h 45m" className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 h-11" />
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Stars (0-10)</Label>
                                <Input type="number" step="0.1" value={stars} onChange={(e) => setStars(Number(e.target.value))} className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 h-11" />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Metadata */}
                    <div className="space-y-8">
                        {/* Batch Panel */}
                        {!isEditing && batch.length > 0 && (
                            <div className="bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-brand-900 dark:text-brand-100 flex items-center gap-2">
                                        <Wand2 className="w-4 h-4" />
                                        Batch Queue ({batch.length})
                                    </h3>
                                    <Button onClick={() => sendBatchMutation.mutate()} isLoading={sendBatchMutation.isPending} className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-none px-4">
                                        <Send className="w-3 h-3 mr-2" />
                                        Send All
                                    </Button>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {batch.map((m) => (
                                        <div key={m.tempId} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 border border-brand-100 dark:border-brand-900/30 group">
                                            {m.poster_url ? (
                                                <img src={m.poster_url} className="w-8 h-10 object-cover" />
                                            ) : (
                                                <div className="w-8 h-10 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <Video className="w-4 h-4 text-gray-300" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{m.name}</div>
                                                <div className="text-[9px] text-gray-500 uppercase">{m.genre}</div>
                                            </div>
                                            <button onClick={() => removeFromBatch(m.tempId)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 space-y-6">
                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Poster Preview</Label>
                                <div className="aspect-[2/3] bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-center relative overflow-hidden group">
                                    {posterUrl ? (
                                        <>
                                            <img src={posterUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => setPosterUrl('')} className="bg-white p-2 rounded-full text-red-600 hover:scale-110 transition-transform">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <Film className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                            <p className="text-[10px] text-gray-400">No poster URL provided</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <Label className="text-[10px] text-gray-400 mb-1 block">Poster URL</Label>
                                    <Input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://..." className="rounded-none dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 h-9 text-xs" />
                                </div>
                            </div>

                            <div>
                                <Label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Additional Info</Label>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[10px] text-gray-400 mb-1 block">Directors (Comma separated)</Label>
                                        <Input value={directors} onChange={(e) => setDirectors(e.target.value)} className="rounded-none dark:bg-gray-800/50 border-gray-100 h-9 text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-gray-400 mb-1 block">VJ Name</Label>
                                        <Input value={vjName} onChange={(e) => setVjName(e.target.value)} className="rounded-none dark:bg-gray-800/50 border-gray-100 h-9 text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-gray-400 mb-1 block">Category</Label>
                                        <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="rounded-none dark:bg-gray-800/50 border-gray-100 h-9 text-xs" />
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
