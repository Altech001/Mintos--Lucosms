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

export const moviesApi = {
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
};
