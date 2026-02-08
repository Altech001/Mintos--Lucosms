import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Input from '@/components/form/input/InputField';
import {
    Play,
    Search,
    ChevronRight,
    Home,
    Download,
    ArrowLeft
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Button from '@/components/ui/button/Button';
import { useMovies } from '@/context/MovieContext';
import { MovieResponse } from '@/context/movies_api';
import { useToast } from '@/context/ToastContext';

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
    const { movies, isLoading } = useMovies();
    const { showInfoToast, showSuccessToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre] = useState('All');
    const [selectedMovie, setSelectedMovie] = useState<MovieResponse | null>(null);

    const filteredMovies = movies.filter(movie => {
        const matchesSearch = movie.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = selectedGenre === 'All' || movie.genre.includes(selectedGenre);
        return matchesSearch && matchesGenre;
    });

    const handleMovieClick = (movie: MovieResponse) => {
        setSelectedMovie(movie);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setSelectedMovie(null);
    };

    const handleDownload = () => {
        if (!selectedMovie || !selectedMovie.video_url) return;

        showInfoToast(`Preparing download for: ${selectedMovie.name.toUpperCase()}`);

        const link = document.createElement('a');
        link.href = selectedMovie.video_url;
        link.download = `${selectedMovie.name}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            showSuccessToast('Download link opened successfully!');
        }, 1500);
    };

    const getYear = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.split('-')[0];
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 text-white">
            <div className="sm:p-8 lg:px-20 xl:px-32 2xl:px-48 max-w-[1800px] mx-auto ">
                <div className="flex items-center justify-between gap-6 border-b border-gray-200 dark:border-gray-800">

                    <div className="flex items-center pb-2" >
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-500 transition-colors" size={16} />
                            <Input
                                type="text"
                                placeholder="Search movies..."
                                className="pl-10 pr-4 py-2 bg-gray-900/50 rounded-none focus:outline-none focus:ring-1 shadow-none focus:ring-brand-500 text-sm transition-all w-84 focus:w-96"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                        <Button color='red' className='rounded-none bg-red-800 hover:bg-red-600'> 🤍 Donate / Support</Button>
                        <Button className='rounded-none'>{movies.length} Movies</Button>
                        <ThemeToggleButton />
                    </div>
                </div>

                <div className="flex gap-10">
                    <aside className="hidden lg:flex w-48 flex-col gap-8 sticky top-24 h-fit border-r dark:border-gray-800 h-screen">
                        <div>

                        </div>
                    </aside>

                    {/* Main Content: Stay in the middle */}
                    <main className="flex-1 min-w-0">
                        {!selectedMovie ? (
                            <>
                                <div className="flex items-center gap-3 pl-0  p-6 text-left">
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-400 ">Latest Movies</h2>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-7 gap-x-4 gap-y-6">
                                    {isLoading ? (
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
                                                    {/* <h3 className="text-[10px] font-bold text-gray-400 uppercase truncate">{movie.name}</h3> */}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {!isLoading && filteredMovies.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-gray-800 rounded">
                                            <Search size={32} className="text-gray-700 mb-4" />
                                            <h3 className="text-sm font-bold text-gray-400">No results found</h3>
                                        </div>
                                    )}
                                </div>
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

                                    <div className="p-6">
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
                                        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-all tracking-wider mt-4"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Return to Movies</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Compact Right Sidebar */}
                    <aside className="hidden xl:flex w-56 flex-col gap-8 sticky top-24 h-fit border-l dark:border-gray-800 h-screen">

                    </aside>
                </div>
            </div>
        </div>
    );
};

export default Movies;
