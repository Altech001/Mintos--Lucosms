import { createContext, ReactNode, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MovieResponse, moviesApi } from './movies_api';

interface MovieContextType {
    movies: MovieResponse[];
    isLoading: boolean;
    error: string | null;
    refreshMovies: () => void;
}

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: ReactNode }) {
    const {
        data: movies = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['movies'],
        queryFn: moviesApi.getMovies,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return (
        <MovieContext.Provider value={{
            movies,
            isLoading,
            error: error ? error.message : null,
            refreshMovies: () => refetch()
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
