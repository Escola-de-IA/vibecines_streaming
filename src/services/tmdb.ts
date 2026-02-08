// TMDb API Service
// Documentação: https://developer.themoviedb.org/docs

const TMDB_API_KEY = "c896a7959ed6f26de5d0170fcb39fa06";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TMDbSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
}

export interface TMDbSeason {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
}

export interface TMDbEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  air_date: string;
  runtime: number;
  vote_average: number;
}

class TMDbService {
  private apiKey: string;

  constructor() {
    this.apiKey = TMDB_API_KEY;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append("api_key", this.apiKey);
    url.searchParams.append("language", "pt-BR");
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar série por nome
   */
  async searchSeries(query: string): Promise<TMDbSeries[]> {
    const data = await this.fetch<{ results: TMDbSeries[] }>("/search/tv", {
      query: query.trim(),
    });
    return data.results;
  }

  /**
   * Obter detalhes completos da série
   */
  async getSeriesDetails(seriesId: number): Promise<TMDbSeries> {
    return this.fetch<TMDbSeries>(`/tv/${seriesId}`);
  }

  /**
   * Obter detalhes de uma temporada específica
   */
  async getSeasonDetails(seriesId: number, seasonNumber: number): Promise<TMDbSeason & { episodes: TMDbEpisode[] }> {
    return this.fetch<TMDbSeason & { episodes: TMDbEpisode[] }>(
      `/tv/${seriesId}/season/${seasonNumber}`
    );
  }

  /**
   * Gerar URL de imagem
   */
  getImageUrl(path: string | null, size: "w300" | "w500" | "original" = "w500"): string {
    if (!path) return "https://via.placeholder.com/500x750?text=Sem+Imagem";
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  /**
   * Gerar URL de backdrop (imagem de fundo)
   */
  getBackdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280"): string {
    if (!path) return "https://via.placeholder.com/1280x720?text=Sem+Imagem";
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  /**
   * Cache simples em memória para evitar chamadas repetidas
   */
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 1000 * 60 * 60; // 1 hora

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async searchSeriesWithCache(query: string): Promise<TMDbSeries[]> {
    const cacheKey = `search:${query}`;
    const cached = this.getCached<TMDbSeries[]>(cacheKey);
    if (cached) return cached;

    const results = await this.searchSeries(query);
    this.setCache(cacheKey, results);
    return results;
  }
}

export const tmdb = new TMDbService();