import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Input from '@/components/form/input/InputField';
import Button from '@/components/ui/button/Button';
import Modal from '@/components/ui/modal/Modal';
import { useMovies } from '@/context/MovieContext';
import { useSeries } from '@/context/SeriesContext';
import { useToast } from '@/context/ToastContext';
import { Episode, SeriesResponse } from '@/context/movies_api';
import Artplayer from 'artplayer';
import {
    ArrowLeft,
    ChevronRight,
    Film,
    Home,
    MonitorPlay,
    Play,
    PlusCircle,
    Search,
    TvMinimalPlay,
    User,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import AdsLeft from './AdsLeft';
import DonationDialog from './DonationDialog';

const ArtPlayerComponent: React.FC<{
    url: string;
    poster: string;
    onEnded?: () => void
}> = ({ url, poster, onEnded }) => {
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
            autoplay: true,
            pip: true,
            autoSize: true,
            autoMini: true,
            screenshot: true,
            setting: true,
            loop: false,
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

        art.on('video:ended', () => {
            if (onEnded) onEnded();
        });

        return () => {
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, [url, poster, onEnded]);

    return <div ref={artRef} className="w-full aspect-video rounded-none overflow-hidden bg-black shadow-none" />;
};

const SeriesSkeleton = () => (
    <div className="flex flex-col gap-2">
        <div className="relative aspect-[10/14] rounded-none overflow-hidden bg-gray-800 animate-pulse">
            <div className="absolute top-2 right-2 w-12 h-3 bg-gray-700 rounded-none" />
            <div className="absolute top-2 left-2 w-6 h-3 bg-gray-700 rounded-none" />
        </div>
        <div className="h-2 w-2/3 bg-gray-800 rounded-none animate-pulse" />
    </div>
);

const Series: React.FC = () => {
    const {
        series,
        seriesCount,
        isLoading,
        searchTerm,
        setSearchTerm,
        searchResults,
        isSearchMode,
        refreshSeries,
    } = useSeries();

    const {
        requestedMovies,
        isLoadingRequests,
        isSubmittingRequest,
        requestMovie,
    } = useMovies();

    const { showInfoToast, showSuccessToast, showErrorToast } = useToast();
    const [selectedSeries, setSelectedSeries] = useState<SeriesResponse | null>(null);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);

    const scrollPositionRef = useRef<number>(0);
    const navigate = useNavigate();

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestData, setRequestData] = useState({ name: '', reason: '' });
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

    const displaySeries = isSearchMode ? searchResults : series;

    const handleSeriesClick = (serie: SeriesResponse) => {
        scrollPositionRef.current = window.scrollY;
        setSelectedSeries(serie);
        // Automatically select first episode if available
        if (serie.episodes && serie.episodes.length > 0) {
            setCurrentEpisode(serie.episodes[0]);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setSelectedSeries(null);
        setCurrentEpisode(null);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
            });
        });
    };

    const handleEpisodeEnd = () => {
        if (!selectedSeries || !currentEpisode) return;

        const currentIndex = selectedSeries.episodes.findIndex(ep => ep.id === currentEpisode.id);
        if (currentIndex !== -1 && currentIndex < selectedSeries.episodes.length - 1) {
            const nextEpisode = selectedSeries.episodes[currentIndex + 1];
            setCurrentEpisode(nextEpisode);
            showInfoToast(`Now playing: ${nextEpisode.name}`);
        } else {
            showInfoToast('You have reached the end of the series.');
        }
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
                        <div className="flex items-center gap-3 pt-3 pb-2">
                            <div className="relative group flex-1 sm:flex-initial">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-500 transition-colors" size={16} />
                                <Input
                                    type="text"
                                    placeholder="Search series..."
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
                            <div className="hidden sm:flex items-center gap-2 ml-auto">
                                <Button
                                    className='rounded-none bg-brand-500 hover:bg-brand-600 text-xs'
                                    startIcon={<Film size={14} />}
                                    onClick={() => navigate('/movies')}
                                >
                                    Movies
                                </Button>
                                <Button
                                    className='rounded-none bg-brand-500 hover:bg-brand-600 text-xs'
                                    startIcon={<PlusCircle size={14} />}
                                    onClick={() => setIsRequestModalOpen(true)}
                                >
                                    Request Movie
                                </Button>
                                <Button color='red' className='rounded-none bg-red-800 hover:bg-red-600 text-xs' onClick={() => setIsDonationModalOpen(true)}>
                                    🤍 Donate
                                </Button>
                                <Button
                                    className='rounded-none text-xs hover:bg-gray-800 transition-colors'
                                    onClick={() => {
                                        refreshSeries();
                                        showInfoToast('Refreshing series library...');
                                    }}
                                >
                                    {seriesCount.toLocaleString()} Series
                                </Button>
                                <ThemeToggleButton />
                            </div>
                        </div>

                        {/* Mobile action bar */}
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
                                    refreshSeries();
                                    showInfoToast('Refreshing library...');
                                }}
                            >
                                {seriesCount.toLocaleString()} Series
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

                    <main className="flex-1 min-w-0">
                        {!selectedSeries ? (
                            <>
                                <div className="flex items-center justify-between pl-0 p-6 text-left">
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-400">
                                        {isSearchMode ? 'Search Results' : 'Latest Series'}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                                    {isLoading && series.length === 0 ? (
                                        [...Array(14)].map((_, i) => <SeriesSkeleton key={i} />)
                                    ) : (
                                        displaySeries.map((serie) => (
                                            <div
                                                key={serie.id}
                                                className="group flex flex-col gap-2 cursor-pointer"
                                                onClick={() => handleSeriesClick(serie)}
                                            >
                                                <div className="relative aspect-[10/14] rounded-none overflow-hidden bg-gray-900 ">
                                                    <img
                                                        src={serie.poster_url}
                                                        alt={serie.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                                        <div className="rounded-full backdrop-blur-[1px] p-4 border border-brand-500 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                            <Play size={25} fill="currentColor" className="ml-1" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2">
                                                        <div className="px-1.5 py-0.5 bg-lime-500 text-black text-[8px] font-black uppercase rounded-[2px]">
                                                            {serie.episodes?.length || 0} EPS
                                                        </div>
                                                    </div>
                                                </div>
                                                <h3 className="text-[10px] font-bold text-gray-900 dark:text-gray-400 truncate uppercase mt-1">
                                                    {serie.name}
                                                </h3>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 tracking-widest">
                                    <div className='flex items-center p-4'>
                                        <button onClick={handleBack} className="flex items-center gap-1 hover:text-white transition-colors">
                                            <Home size={12} />
                                            <span>SERIES</span>
                                        </button>
                                        <ChevronRight size={20} fill='currentColor' className="text-gray-700" />
                                        <span className="text-brand-500">{selectedSeries.name}</span>
                                        {currentEpisode && (
                                            <>
                                                <ChevronRight size={20} fill='currentColor' className="text-gray-700" />
                                                <span className="text-white">{currentEpisode.name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {currentEpisode && (
                                        <ArtPlayerComponent
                                            url={currentEpisode.video_url}
                                            poster={currentEpisode.poster_url || selectedSeries.poster_url}
                                            onEnded={handleEpisodeEnd}
                                        />
                                    )}

                                    <div className="p-3 sm:p-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex flex-col gap-2">
                                                <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                                    {selectedSeries.name}
                                                </h1>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 tracking-widest">
                                                    <span className="text-brand-500">★ {selectedSeries.stars}</span>
                                                    <span>{selectedSeries.genre}</span>
                                                    <span>{selectedSeries.duration}</span>
                                                    <span className="bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">VJ {selectedSeries.vj_name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-400 leading-relaxed font-medium mt-4">
                                            {selectedSeries.description}
                                        </p>
                                    </div>

                                    {/* Episodes List */}
                                    <div className="mt-8 px-3 sm:px-6">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <MonitorPlay size={14} className="text-brand-500" />
                                            <span>Episodes List</span>
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {selectedSeries.episodes.map((ep, idx) => (
                                                <button
                                                    key={ep.id || idx}
                                                    onClick={() => setCurrentEpisode(ep)}
                                                    className={`group relative flex items-center rounded gap-4 p-2 transition-all duration-300 border ${currentEpisode?.id === ep.id
                                                        ? 'bg-brand-500/10 border-brand-500/50 '
                                                        : 'bg-gray-50/20 dark:bg-gray-900/20 border-gray-800/50 hover:bg-gray-800/60 hover:border-gray-700'
                                                        }`}
                                                >
                                                    {/* Episode Thumbnail */}
                                                    <div className="relative w-24 aspect-video shrink-0 bg-gray-800 overflow-hidden">
                                                        <img
                                                            src={ep.poster_url}
                                                            alt={ep.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${currentEpisode?.id === ep.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                            <Play size={12} fill="currentColor" className="text-white" />
                                                        </div>
                                                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-sm text-[8px] font-bold text-white uppercase">
                                                            EP {idx + 1}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <h4 className={`text-[11px] font-bold truncate transition-colors ${currentEpisode?.id === ep.id ? 'text-brand-500' : 'text-gray-800 group-hover:text-white dark:text-gray-50'
                                                            }`}>
                                                            {ep.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">VJ {ep.vj_name}</span>
                                                            <span className="text-[9px] text-gray-600 shrink-0">•</span>
                                                            <span className="text-[9px] text-gray-500 tracking-wider whitespace-nowrap">★ {ep.stars}</span>
                                                        </div>
                                                    </div>

                                                    {currentEpisode?.id === ep.id && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <TvMinimalPlay size={12} fill="currentColor" className="text-brand-500" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-all tracking-wider mt-8 px-3 sm:px-6"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Return to Series List</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>

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
                                        </div>
                                    </div>
                                ))
                            ) : (
                                requestedMovies.map((request, idx) => (
                                    <div key={request.id || idx} className="flex gap-4 group relative">
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
                                            <p className="text-[10px] text-gray-500 italic leading-snug line-clamp-2">
                                                "{request.reason || 'No reason provided'}"
                                            </p>
                                        </div>
                                    </div>
                                ))
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
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <Input
                            placeholder="Enter movie/serie name..."
                            value={requestData.name}
                            onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-none transform-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
                        <textarea
                            placeholder="Why do you want this?"
                            value={requestData.reason}
                            onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm min-h-[100px] text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" onClick={() => setIsRequestModalOpen(false)} className="rounded-none px-6">Cancel</Button>
                        <Button type="submit" disabled={isSubmittingRequest} className="rounded-none px-8 bg-brand-500 hover:bg-brand-600">
                            {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <DonationDialog
                isOpen={isDonationModalOpen}
                onClose={() => setIsDonationModalOpen(false)}
            />
        </div>
    );
};

export default Series;
