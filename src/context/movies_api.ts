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

const API_BASE_URL = 'https://mintos-vd.vercel.app';

export const moviesApi = {
  getMovies: async (): Promise<MovieResponse[]> => {
    const response = await fetch(`${API_BASE_URL}/movies/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movies: ${response.statusText}`);
    }

    return response.json();
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
};
