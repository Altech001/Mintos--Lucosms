export interface MovieResponse {
  id: number;
  name: string;
  poster_url: string;
  stars: number;
  directors: string[];
  description: string;
  release_date: string;
  created_at: string;
  video_url: string;
  genre: string;
  vj_name: string | null;
  duration: string | null;
  category_name: string | null;
}

export interface Episode {
  id: number;
  name: string;
  video_url: string;
  poster_url: string;
  genre: string;
  stars: number;
  vj_name: string;
  created_at: string;
  serie_id: number;
}

export interface SeriesResponse {
  id: number;
  name: string;
  poster_url: string;
  genre: string;
  stars: number;
  vj_name: string;
  duration: string;
  description: string;
  category_name: string;
  release_date: string | null;
  created_at: string;
  episodes: Episode[];
}

const API_BASE_URL = 'https://mintos-vd.vercel.app';

export interface DonationData {
  phone_number: string;
  status: string;
  created_at: string;
  id: number;
  amount: number;
  name: string;
  transaction_uuid: string;
}

export interface DonationResponse {
  status: string;
  message: string;
  donation: DonationData;
}

export interface TransactionStatusResponse {
  phone_number: string;
  status: string;
  created_at: string;
  id: number;
  amount: number;
  name: string;
  transaction_uuid: string;
}

export interface UltimateSearchResult {
  type: 'movie' | 'serie';
  score: number;
  item: MovieResponse | SeriesResponse;
}

export interface SuggestionResult {
  name: string;
  score: number;
}

export const moviesApi = {
  ultimateSearch: async (query: string, limit: number = 20): Promise<UltimateSearchResult[]> => {
    const response = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ultimate search failed: ${response.statusText}`);
    }

    return response.json();
  },

  suggestSearch: async (query: string): Promise<SuggestionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/search/suggest?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Suggest search failed: ${response.statusText}`);
    }

    return response.json();
  },
  getMovies: async (limit: number = 20, skip: number = 0): Promise<MovieResponse[]> => {
    const response = await fetch(`${API_BASE_URL}/movies/?limit=${limit}&skip=${skip}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} at ${response.url}`);
      throw new Error(`Failed to fetch movies: ${response.statusText}`);
    }

    return response.json();
  },

  searchMovies: async (query: string): Promise<MovieResponse[]> => {
    // Fetch all movies to enable full-catalog search
    // We fetch in chunks to avoid timeouts
    const countResponse = await fetch(`${API_BASE_URL}/movies/count`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const totalCount = await countResponse.json();

    const CHUNK_SIZE = 500;
    const chunks = Math.ceil(totalCount / CHUNK_SIZE);
    const promises: Promise<MovieResponse[]>[] = [];

    for (let i = 0; i < chunks; i++) {
      promises.push(
        fetch(`${API_BASE_URL}/movies/?limit=${CHUNK_SIZE}&skip=${i * CHUNK_SIZE}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch movies chunk: ${res.statusText}`);
          return res.json();
        })
      );
    }

    const results = await Promise.all(promises);
    const allMovies = results.flat();

    // Client-side fuzzy search across name, genre, description, directors, vj_name
    const lowerQuery = query.toLowerCase();
    return allMovies.filter(movie =>
      movie.name?.toLowerCase().includes(lowerQuery) ||
      movie.genre?.toLowerCase().includes(lowerQuery) ||
      movie.description?.toLowerCase().includes(lowerQuery) ||
      movie.directors?.some(d => d.toLowerCase().includes(lowerQuery)) ||
      movie.vj_name?.toLowerCase().includes(lowerQuery) ||
      movie.category_name?.toLowerCase().includes(lowerQuery)
    );
  },

  getMovieById: async (id: number): Promise<MovieResponse> => {
    const response = await fetch(`${API_BASE_URL}/movies/${id}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  getMoviesCount: async (): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/movies/count`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movies count: ${response.statusText}`);
    }

    return response.json();
  },

  requestMovie: async (name: string, reason: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/request_movie`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request movie: ${response.statusText}`);
    }

    return response.json();
  },

  getRequestMovies: async (limit: number = 10, skip: number = 0): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/request_movies?limit=${limit}&skip=${skip}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch requested movies: ${response.statusText}`);
    }

    return response.json();
  },

  donate: async (name: string, amount: number, phone_number: string): Promise<DonationResponse> => {
    const response = await fetch(`${API_BASE_URL}/donate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, amount, phone_number }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate donation: ${response.statusText}`);
    }

    return response.json();
  },

  checkTransactionStatus: async (transaction_uuid: string): Promise<TransactionStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/check_transaction_status?transaction_uuid=${transaction_uuid}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check transaction status: ${response.statusText}`);
    }

    return response.json();
  },

  createMovie: async (movie: any): Promise<MovieResponse> => {
    const response = await fetch(`${API_BASE_URL}/movies/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movie),
    });

    if (!response.ok) {
      throw new Error(`Failed to create movie: ${response.statusText}`);
    }

    return response.json();
  },

  getSeries: async (): Promise<SeriesResponse[]> => {
    const response = await fetch(`${API_BASE_URL}/series/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch series: ${response.statusText}`);
    }

    return response.json();
  },

  getSeriesById: async (id: number): Promise<SeriesResponse> => {
    const response = await fetch(`${API_BASE_URL}/series/${id}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch series ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  createSeries: async (series: any): Promise<SeriesResponse> => {
    const response = await fetch(`${API_BASE_URL}/series/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(series),
    });

    if (!response.ok) {
      throw new Error(`Failed to create series: ${response.statusText}`);
    }

    return response.json();
  },

  updateSeries: async (id: number, series: any): Promise<SeriesResponse> => {
    const response = await fetch(`${API_BASE_URL}/series/${id}/`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(series),
    });

    if (!response.ok) {
      throw new Error(`Failed to update series ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  deleteSeries: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/series/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete series ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  getEpisodes: async (seriesId: number): Promise<Episode[]> => {
    const response = await fetch(`${API_BASE_URL}/series/${seriesId}/episodes/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch episodes for series ${seriesId}: ${response.statusText}`);
    }

    return response.json();
  },

  createEpisode: async (seriesId: number, episode: any): Promise<Episode> => {
    const response = await fetch(`${API_BASE_URL}/series/${seriesId}/episodes/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(episode),
    });

    if (!response.ok) {
      throw new Error(`Failed to create episode: ${response.statusText}`);
    }

    return response.json();
  },

  updateEpisode: async (episodeId: number, episode: any): Promise<Episode> => {
    const response = await fetch(`${API_BASE_URL}/episodes/${episodeId}/`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(episode),
    });

    if (!response.ok) {
      throw new Error(`Failed to update episode ${episodeId}: ${response.statusText}`);
    }

    return response.json();
  },

  deleteEpisode: async (episodeId: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/episodes/${episodeId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete episode ${episodeId}: ${response.statusText}`);
    }

    return response.json();
  },

  updateMovie: async (id: number, movie: any): Promise<MovieResponse> => {
    const response = await fetch(`${API_BASE_URL}/movies/${id}/`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movie),
    });

    if (!response.ok) {
      throw new Error(`Failed to update movie ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  deleteMovie: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete movie ${id}: ${response.statusText}`);
    }

    return response.json();
  },

  // Series Fixer Endpoints
  getFixerMovies: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/fixer/movies`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fixer movies: ${response.statusText}`);
    }

    return response.json();
  },

  convertToSeries: async (payload: {
    serie_name: string;
    genre: string;
    vj_name: string;
    description: string;
    movie_ids: number[];
  }): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/fixer/convert`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert movies to series: ${response.statusText}`);
    }

    return response.json();
  },
};

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxODYzODYzZjg5MWNjY2I1ZDYzYzA0ODMwYmI2ODU3NiIsIm5iZiI6MTY5ODI4NDE5NS4yNzMsInN1YiI6IjY1MzljMmEzOTU1YzY1MDEzOGJjMjJmZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ADxEh9Z7nfa_WPklA8ASlN3qPO_hR0m4Ebz_0HoOwPI';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const tmdbApi = {
    searchMovies: async (query: string) => {
        const response = await fetch(`${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('TMDB Search failed');
        return response.json();
    },
    getMovieDetails: async (tmdbId: number) => {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?append_to_response=credits`, {
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('TMDB Details fetch failed');
        return response.json();
    }
};
