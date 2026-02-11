import { createContext, ReactNode, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MovieResponse, moviesApi } from './movies_api';

interface MovieContextType {
    movies: MovieResponse[];
    movieCount: number;
    isLoading: boolean;
    error: string | null;
    refreshMovies: () => void;
    fetchNextPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    requestedMovies: any[];
    isLoadingRequests: boolean;
    isSubmittingRequest: boolean;
    requestMovie: (name: string, reason: string) => Promise<any>;
    // Search
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchResults: MovieResponse[];
    isSearching: boolean;
    isSearchMode: boolean;
}

const MovieContext = createContext<MovieContextType | undefined>(undefined);

const LIMIT = 42;

export function MovieProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search term — only trigger API search after 400ms of idle typing
    const handleSetSearchTerm = useCallback((term: string) => {
        setSearchTerm(term);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedSearch(term.trim());
        }, 400);
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const isSearchMode = debouncedSearch.length >= 2;

    const {
        data,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['movies'],
        queryFn: ({ pageParam = 0 }) => moviesApi.getMovies(LIMIT, pageParam),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
        },
        initialPageParam: 0,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1, // Only retry once to avoid server spam on 500s
    });

    // Server-wide search query — searches across ALL movies in the database
    const { data: searchResults = [], isLoading: isSearching } = useQuery({
        queryKey: ['movieSearch', debouncedSearch],
        queryFn: () => moviesApi.searchMovies(debouncedSearch),
        enabled: isSearchMode, // Only fetch when there's a meaningful search term
        staleTime: 1000 * 60 * 2, // Cache search results for 2 minutes
    });

    const { data: movieCount = 0 } = useQuery({
        queryKey: ['moviesCount'],
        queryFn: moviesApi.getMoviesCount,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    const { data: rawRequestedMovies = [], isLoading: isLoadingRequests } = useQuery({
        queryKey: ['requestedMovies'],
        queryFn: () => moviesApi.getRequestMovies(50, 0),
        staleTime: 1000 * 10, // 10 seconds
        refetchInterval: 1000 * 30, // Poll every 30 seconds for real-time feel
    });

    // Sort requested movies: latest on top
    const requestedMovies = [...rawRequestedMovies].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const requestMutation = useMutation({
        mutationFn: ({ name, reason }: { name: string, reason: string }) =>
            moviesApi.requestMovie(name, reason),
        onSuccess: () => {
            // Automatically refresh the feed when this user makes a request
            queryClient.invalidateQueries({ queryKey: ['requestedMovies'] });
        },
    });

    const movies = data?.pages.flat() || [];

    return (
        <MovieContext.Provider value={{
            movies,
            movieCount,
            isLoading,
            error: error ? error.message : null,
            refreshMovies: () => refetch(),
            fetchNextPage,
            hasNextPage: !!hasNextPage,
            isFetchingNextPage,
            requestedMovies,
            isLoadingRequests,
            isSubmittingRequest: requestMutation.isPending,
            requestMovie: (name: string, reason: string) =>
                requestMutation.mutateAsync({ name, reason }),
            // Search
            searchTerm,
            setSearchTerm: handleSetSearchTerm,
            searchResults,
            isSearching,
            isSearchMode,
        }}>
            {children}
        </MovieContext.Provider>
    );
}

export function useMovies() {
    const context = useContext(MovieContext);
    if (context === undefined) {
        throw new Error('useMovies must be used within a MovieProvider');
    }
    return context;
}
