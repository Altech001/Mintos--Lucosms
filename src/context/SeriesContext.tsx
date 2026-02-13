import { createContext, ReactNode, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SeriesResponse, moviesApi } from './movies_api';

interface SeriesContextType {
    series: SeriesResponse[];
    seriesCount: number;
    isLoading: boolean;
    error: string | null;
    refreshSeries: () => void;
    // Search
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchResults: SeriesResponse[];
    isSearching: boolean;
    isSearchMode: boolean;
    deleteSeries: (id: number) => Promise<any>;
}

const SeriesContext = createContext<SeriesContextType | undefined>(undefined);

export function SeriesProvider({ children }: { children: ReactNode }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search term
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

    const isSearchMode = debouncedSearch.length >= 1;

    const {
        data: series = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['series'],
        queryFn: moviesApi.getSeries,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
    });

    // Client-side search for series
    const searchResults = isSearchMode ? series.filter(s =>
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.genre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.vj_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) : [];

    return (
        <SeriesContext.Provider value={{
            series,
            seriesCount: series.length,
            isLoading,
            error: error ? error.message : null,
            refreshSeries: () => refetch(),
            searchTerm,
            setSearchTerm: handleSetSearchTerm,
            searchResults,
            isSearching: false,
            isSearchMode,
            deleteSeries: moviesApi.deleteSeries,
        }}>
            {children}
        </SeriesContext.Provider>
    );
}

export function useSeries() {
    const context = useContext(SeriesContext);
    if (context === undefined) {
        throw new Error('useSeries must be used within a SeriesProvider');
    }
    return context;
}
