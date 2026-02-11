import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Input from '@/components/form/input/InputField';
import {
    Play,
    Search,
    ChevronRight,
    Home,
    Download,
    ArrowLeft,
    PlusCircle,
    User,
    X,
    Loader2,
    SkipForward
} from 'lucide-react';
import Modal from '@/components/ui/modal/Modal';
import React, { useState, useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Button from '@/components/ui/button/Button';
import { useMovies } from '@/context/MovieContext';
import { MovieResponse } from '@/context/movies_api';
import { useToast } from '@/context/ToastContext';
import AdsLeft from './AdsLeft';
import DonationDialog from './DonationDialog';
import { useNavigate } from 'react-router';

const ArtPlayerComponent: React.FC<{ url: string; poster: string }> = ({ url, poster }) => {
    const artRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!artRef.current) return;

        const art = new Artplayer({
            container: artRef.current,
            url: url,
            poster: poster,
            volume: 0.5,
            isLive: false,
            muted: false,
            autoplay: false,
            pip: true,
            autoSize: true,
            autoMini: true,
            screenshot: true,
            setting: true,
            loop: true,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: true,
            subtitleOffset: true,
            miniProgressBar: true,
            mutex: true,
            backdrop: true,
            playsInline: true,
            autoPlayback: true,
            airplay: true,
            theme: '#465fff',
        });

        return () => {
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, [url, poster]);

    return <div ref={artRef} className="w-full aspect-video rounded-none overflow-hidden bg-black shadow-none" />;
};

const MovieSkeleton = () => (
    <div className="flex flex-col gap-2">
        <div className="relative aspect-[10/14] rounded-none overflow-hidden bg-gray-800 animate-pulse">
            <div className="absolute top-2 right-2 w-12 h-3 bg-gray-700 rounded-none" />
            <div className="absolute top-2 left-2 w-6 h-3 bg-gray-700 rounded-none" />
        </div>
        <div className="h-2 w-2/3 bg-gray-800 rounded-none animate-pulse" />
    </div>
);

const Movies: React.FC = () => {
    const {
        movies,
        movieCount,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        requestedMovies,
        isLoadingRequests,
        isSubmittingRequest,
        requestMovie,
        searchTerm,
        setSearchTerm,
        searchResults,
        isSearching,
        isSearchMode,
        refreshMovies,
        error
    } = useMovies();
    const { showInfoToast, showSuccessToast, showErrorToast } = useToast();
    const [selectedGenre] = useState('All');
    const [selectedMovie, setSelectedMovie] = useState<MovieResponse | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);
    const navigate = useNavigate();

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestData, setRequestData] = useState({ name: '', reason: '' });

    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestData.name || !requestData.reason) {
            showErrorToast('Please fill in all fields');
            return;
        }

        try {
            await requestMovie(requestData.name, requestData.reason);
            showSuccessToast(`Request for "${requestData.name}" submitted successfully!`);
            setIsRequestModalOpen(false);
            setRequestData({ name: '', reason: '' });
        } catch (error) {
            showErrorToast('Failed to submit request. Please try again.');
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, selectedMovie, error]);

    // When in search mode, use server-wide search results; otherwise use paginated movies
    const displayMovies = isSearchMode ? searchResults : movies;
    const filteredMovies = displayMovies.filter(movie => {
        const matchesGenre = selectedGenre === 'All' || movie.genre?.includes(selectedGenre);
        return matchesGenre;
    });

    const handleMovieClick = (movie: MovieResponse) => {
        // Save current scroll position before navigating to detail
        scrollPositionRef.current = window.scrollY;
        setSelectedMovie(movie);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setSelectedMovie(null);
        // Restore scroll position after the movie list re-renders
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
            });
        });
    };

    // Get "Play Next" movies — same genre first, then fill with others
    const getNextMovies = (): MovieResponse[] => {
        if (!selectedMovie) return [];
        const currentGenre = selectedMovie.genre?.split(',')[0]?.trim().toLowerCase();
        const otherMovies = movies.filter(m => m.id !== selectedMovie.id);

        // Prioritize same-genre movies
        const sameGenre = otherMovies.filter(m =>
            m.genre?.toLowerCase().includes(currentGenre || '')
        );
        const different = otherMovies.filter(m =>
            !m.genre?.toLowerCase().includes(currentGenre || '')
        );

        // Shuffle and take up to 14
        const shuffled = [...sameGenre.sort(() => Math.random() - 0.5), ...different.sort(() => Math.random() - 0.5)];
        return shuffled.slice(0, 14);
    };

    const handleDownload = () => {
        if (!selectedMovie || !selectedMovie.video_url) return;
        setIsDownloadModalOpen(true);
    };

    const confirmDownload = async () => {
        if (!selectedMovie || !selectedMovie.video_url) return;

        setIsDownloading(true);
        showInfoToast(`Preparing your download for: ${selectedMovie.name.toUpperCase()}...`);

        try {
            const response = await fetch(selectedMovie.video_url);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedMovie.name}.mp4`);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSuccessToast('Download started successfully!');
            setIsDownloadModalOpen(false);
        } catch (error) {
            console.error('Download error:', error);
            // Fallback for CORS issues
            const link = document.createElement('a');
            link.href = selectedMovie.video_url;
            link.setAttribute('download', `${selectedMovie.name}.mp4`);
            link.target = '_blank';
            link.click();
            showInfoToast('Download initiated via browser.');
            setIsDownloadModalOpen(false);
        } finally {
            setIsDownloading(false);
        }
    };

    const getYear = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.split('-')[0];
    };

    const formatRequestDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 text-white">
            <div className="px-3 sm:p-8 lg:px-20 xl:px-32 2xl:px-48 max-w-[1800px] mx-auto">
                {/* Sticky Header */}
                <div className="sticky top-0 z-50 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 -mx-3 px-3 sm:-mx-8 sm:px-8 lg:-mx-20 lg:px-20 xl:-mx-32 xl:px-32 2xl:-mx-48 2xl:px-48">
                    <div className="max-w-[1800px] mx-auto">
                        {/* Row 1: Search bar */}
                        <div className="flex items-center gap-3 pt-3 pb-2">
                            <div className="relative group flex-1 sm:flex-initial">
                                {isSearching ? (
                                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" size={16} />
                                ) : (
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-500 transition-colors" size={16} />
                                )}
                                <Input
                                    type="text"
                                    placeholder="Search movies..."
                                    className="pl-10 pr-10 py-2 bg-gray-900/50 rounded-none focus:outline-none focus:ring-1 shadow-none focus:ring-brand-500 text-sm transition-all w-full sm:w-80 lg:w-84 focus:sm:w-96"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {/* Desktop-only theme toggle in search row */}
                            <div className="hidden sm:flex items-center gap-2 ml-auto">
                                <Button
                                    className='rounded-none bg-brand-500 hover:bg-brand-600 text-xs'
                                    startIcon={<PlusCircle size={14} />}
                                    onClick={() => navigate('/series')}
                                >
                                    <span className="hidden md:inline">Series</span>
                                    <span className="md:hidden">Series</span>
                                </Button>
                                <Button
                                    className='rounded-none bg-brand-500 hover:bg-brand-600 text-xs'
                                    startIcon={<PlusCircle size={14} />}
                                    onClick={() => setIsRequestModalOpen(true)}
                                >
                                    <span className="hidden md:inline">Request Movie</span>
                                    <span className="md:hidden">Request</span>
                                </Button>
                                <Button color='red' className='rounded-none bg-red-800 hover:bg-red-600 text-xs' onClick={() => setIsDonationModalOpen(true)}>
                                    <span className="hidden md:inline">🤍 Donate / Support</span>
                                    <span className="md:hidden">🤍 Donate</span>
                                </Button>
                                <Button
                                    className='rounded-none text-xs hover:bg-gray-800 transition-colors'
                                    onClick={() => {
                                        refreshMovies();
                                        showInfoToast('Refreshing movie library...');
                                    }}
                                >
                                    {movieCount.toLocaleString()} Movies
                                </Button>
                                <ThemeToggleButton />
                            </div>
                        </div>

                        {/* Row 2: Mobile action bar */}
                        <div className="flex sm:hidden items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
                            <Button
                                className='rounded-none bg-brand-500 hover:bg-brand-600 text-[10px] shrink-0 !py-1.5 !px-3'
                                startIcon={<PlusCircle size={12} />}
                                onClick={() => setIsRequestModalOpen(true)}
                            >
                                Request
                            </Button>
                            <Button
                                color='red'
                                className='rounded-none bg-red-800 hover:bg-red-600 text-[10px] shrink-0 !py-1.5 !px-3'
                                onClick={() => setIsDonationModalOpen(true)}
                            >
                                🤍 Donate
                            </Button>
                            <Button
                                className='rounded-none text-[10px] shrink-0 !py-1.5 !px-3'
                                onClick={() => {
                                    refreshMovies();
                                    showInfoToast('Refreshing library...');
                                }}
                            >
                                {movieCount.toLocaleString()} Movies
                            </Button>
                            <div className="shrink-0">
                                <ThemeToggleButton />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 sm:gap-10">
                    <aside className="hidden lg:flex w-48 flex-col gap-8 sticky top-32 h-fit border-r dark:border-gray-800 h-screen">
                        <div className="p-4">
                            <AdsLeft />
                        </div>
                    </aside>

                    {/* Main Content: Stay in the middle */}
                    <main className="flex-1 min-w-0">
                        {!selectedMovie ? (
                            <>
                                <div className="flex items-center justify-between pl-0 p-6 text-left">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-400">
                                            {isSearchMode ? 'Search Results' : 'Latest Movies'}
                                        </h2>
                                        {isSearchMode && !isSearching && (
                                            <span className="text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-sm">
                                                {filteredMovies.length} found across {movieCount.toLocaleString()} movies
                                            </span>
                                        )}
                                        {isSearching && (
                                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                <Loader2 size={12} className="animate-spin" />
                                                Searching all {movieCount.toLocaleString()} movies...
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                                    {isLoading && movies.length === 0 ? (
                                        [...Array(14)].map((_, i) => <MovieSkeleton key={i} />)
                                    ) : (
                                        <>
                                            {filteredMovies.map((movie) => (
                                                <div
                                                    key={movie.id}
                                                    className="group flex flex-col gap-2 cursor-pointer"
                                                    onClick={() => handleMovieClick(movie)}
                                                >
                                                    {/* Image Container - Poster Focus */}
                                                    <div className="relative aspect-[10/14] rounded-none overflow-hidden bg-gray-900 ">
                                                        <img
                                                            src={movie.poster_url}
                                                            alt={movie.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />

                                                        {/* Simple Overlay on Hover */}
                                                        <div className="absolute inset-0  bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                                            <div className="rounded-full backdrop-blur-[1px] p-4 border border-brand-500 flex items-center justify-center  transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                                <Play size={25} fill="currentColor" className="ml-1" />
                                                            </div>
                                                        </div>
                                                        {/* Reference-style badges (Minimal Green) */}
                                                        <div className="absolute top-2 right-2">
                                                            <div className="px-1.5 py-0.5 bg-lime-500 text-black text-[8px] font-black uppercase rounded-[2px] flex items-center gap-0.5">
                                                                {movie.genre.split(',')[0].trim().toLowerCase()}
                                                            </div>
                                                        </div>
                                                        {movie.stars >= 8.5 && (
                                                            <div className="absolute top-2 left-2">
                                                                <div className="px-1.5 py-0.5 bg-brand-500/50 text-white text-[8px] font-bold uppercase rounded-none">
                                                                    HD
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {!isLoading && !isSearching && filteredMovies.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-gray-800 rounded">
                                            <Search size={32} className="text-gray-700 mb-4" />
                                            <h3 className="text-sm font-bold text-gray-400">
                                                {isSearchMode ? `No results for "${searchTerm}"` : 'No results found'}
                                            </h3>
                                            {isSearchMode && (
                                                <p className="text-xs text-gray-600 mt-2">Try a different search term or check your spelling</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Infinite Scroll Target — only show when NOT in search mode */}
                                {!isSearchMode && (
                                    <div ref={observerTarget} className="w-full mt-8">
                                        {isFetchingNextPage && (
                                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                                                {[...Array(7)].map((_, i) => (
                                                    <MovieSkeleton key={i} />
                                                ))}
                                            </div>
                                        )}
                                        {error && (
                                            <div className="flex flex-col items-center justify-center p-8 bg-red-500/5 border border-red-500/20">
                                                <p className="text-sm text-red-500 mb-4 font-medium">Failed to load more movies</p>
                                                <Button
                                                    className="bg-red-500 hover:bg-red-600 !rounded-none"
                                                    onClick={() => refreshMovies()}
                                                >
                                                    Retry Loading
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* Wizard Path */}
                                <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 tracking-widest">
                                    <div className='flex items-center p-4'>
                                        <button onClick={handleBack} className="flex items-center gap-1 hover:text-white transition-colors">
                                            <Home size={12} />
                                            <span>{selectedMovie.genre.split(',')[0].trim()}</span>
                                        </button>
                                        <ChevronRight size={20} fill='currentColor' className="text-gray-700" />
                                        <span className="text-brand-500">{selectedMovie.name}</span>
                                    </div>
                                </div>

                                {/* Wizard Content */}
                                <div className="flex flex-col gap-4">
                                    <ArtPlayerComponent
                                        url={selectedMovie.video_url || ""}
                                        poster={selectedMovie.poster_url}
                                    />

                                    <div className="p-3 sm:p-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex flex-col gap-2">

                                                <div className="flex items-center gap-4 text-sm text-gray-500 tracking-widest">
                                                    <span className="text-brand-500">★ {selectedMovie.stars}</span>
                                                    <span>{getYear(selectedMovie.release_date)}</span>
                                                    <span>{selectedMovie.duration || 'N/A'}</span>

                                                </div>
                                            </div>
                                            <Button
                                                variant="primary"
                                                className="!rounded-none !py-3 !px-8 !text-[10px] font-black uppercase tracking-widest"
                                                startIcon={<Download size={16} />}
                                                onClick={handleDownload}
                                            >
                                                DOWNLOAD 4K
                                            </Button>
                                        </div>

                                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                            {selectedMovie.description}
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-all tracking-wider mt-4 px-3 sm:px-0"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Return to Movies</span>
                                    </button>

                                    {/* Play Next Section */}
                                    <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
                                        <div className="flex items-center gap-2 mb-4 px-3 sm:px-0">
                                            {/* <SkipForward size={16} className="text-brand-500" /> */}
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest">Play Next</h3>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-2 sm:gap-x-3 gap-y-4">
                                            {getNextMovies().map((movie) => (
                                                <div
                                                    key={movie.id}
                                                    className="group flex flex-col gap-1.5 cursor-pointer"
                                                    onClick={() => handleMovieClick(movie)}
                                                >
                                                    <div className="relative aspect-[10/14] rounded-none overflow-hidden bg-gray-900">
                                                        <img
                                                            src={movie.poster_url}
                                                            alt={movie.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="rounded-full backdrop-blur-[1px] p-3 border border-brand-500 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                                <Play size={18} fill="currentColor" className="ml-0.5" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-1.5 right-1.5">
                                                            <div className="px-1 py-0.5 bg-lime-500 text-black text-[7px] font-black uppercase rounded-[2px]">
                                                                {movie.genre?.split(',')[0]?.trim().toLowerCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Compact Right Sidebar */}
                    <aside className="hidden xl:flex w-72 flex-col gap-6 sticky top-32 h-[calc(100vh-140px)] border-l dark:border-gray-800 pr-4 pl-6 overflow-y-auto no-scrollbar">
                        <div className="flex items-center gap-2 mb-2 pt-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-400">Request Feed</h3>
                        </div>

                        <div className="flex flex-col gap-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-200 dark:before:bg-gray-800">
                            {isLoadingRequests ? (
                                [...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-4 animate-pulse">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0 z-10" />
                                        <div className="flex flex-col gap-2 flex-1">
                                            <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                requestedMovies.map((request, idx) => (
                                    <div key={request.id || idx} className="flex gap-4 group relative">
                                        {/* Timeline Node */}
                                        <div className="w-[23px] h-[23px] rounded-full bg-gray-50 dark:bg-gray-900 border-2 border-brand-500 flex items-center justify-center shrink-0 z-10 group-hover:scale-110 transition-transform shadow-sm">
                                            <User size={10} className="text-brand-500" />
                                        </div>

                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-[11px] font-bold text-gray-900 dark:text-white truncate uppercase tracking-wider">
                                                    {request.name}
                                                </h4>
                                                <span className="text-[9px] font-medium text-gray-400 shrink-0">
                                                    {formatRequestDate(request.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-500 italic leading-snug line-clamp-2">
                                                "{request.reason || 'No reason provided'}"
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {!isLoadingRequests && requestedMovies.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-[10px] text-gray-500 font-medium">No requests yet.</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Request a Movie"
            >
                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Movie Name</label>
                        <Input
                            placeholder="Enter movie name..."
                            value={requestData.name}
                            onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-none focus:ring-brand-500"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason / Details</label>
                        <textarea
                            placeholder="Why do you want this movie? (e.g. Fun one, HD requested, etc.)"
                            value={requestData.reason}
                            onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all min-h-[100px] text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            // variant="secondary"
                            type="button"
                            onClick={() => setIsRequestModalOpen(false)}
                            className="rounded-none px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmittingRequest}
                            className="rounded-none px-8 bg-brand-500 hover:bg-brand-600"
                        >
                            {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Download Confirmation Modal */}
            <Modal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                title="Confirm Download"
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMovie?.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You are about to download this movie. This will start a direct download to your device. Please ensure you have enough data and storage space.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-none border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between text-xs font-bold tracking-wider text-gray-500">
                            <span>Quality</span>
                            <span className="text-brand-500">Full HD / 4K</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold tracking-wider text-gray-500">
                            <span>Format</span>
                            <span className="text-brand-500">MP4 Video</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={confirmDownload}
                            disabled={isDownloading}
                            className="w-full !py-4 !rounded-none bg-brand-500 hover:bg-brand-600 font-bold tracking-widest"
                        >
                            {isDownloading ? 'Starting...' : 'Start Download Now'}
                        </Button>
                        <button
                            onClick={() => setIsDownloadModalOpen(false)}
                            className="w-full py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Donation Dialog */}
            <DonationDialog
                isOpen={isDonationModalOpen}
                onClose={() => setIsDonationModalOpen(false)}
            />
        </div>
    );
};

export default Movies;
