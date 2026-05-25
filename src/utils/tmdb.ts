import {
  getTmdbPosterCache,
  getTmdbSeasonEpisodeCache,
  setTmdbPosterCache,
  setTmdbSeasonEpisodeCache,
  type TmdbPosterCacheEntry,
  type TmdbSeasonEpisodeCacheEntry,
} from '@/lib/storage';
import type { CatalogState, ContentItem, Series } from '@/types/content';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_POSTER_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const TMDB_POSTER_MISS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 2;
const TMDB_SEASON_EPISODE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const TMDB_SEASON_EPISODE_MISS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 2;

const apiKey = (import.meta.env.VITE_TMDB_API_KEY as string | undefined)?.trim();
const readAccessToken = (import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string | undefined)?.trim();
const posterMemoryCache = new Map<string, TmdbPosterCacheEntry>();
const seasonEpisodeMemoryCache = new Map<string, TmdbSeasonEpisodeCacheEntry>();

export type TMDBMediaType = 'movie' | 'tv';
export const hasTmdbCredentials = Boolean(apiKey || readAccessToken);

interface TMDBResult {
  id?: number;
  poster_path?: string | null;
  name?: string;
  original_name?: string;
  title?: string;
  original_title?: string;
}

interface TMDBSeasonDetails {
  episodes?: Array<{
    episode_number?: number;
    name?: string | null;
  }>;
}

interface EnrichCatalogOptions {
  onlyMissingLogos?: boolean;
  concurrency?: number;
}

function sanitizeTitle(title: string): string {
  return title
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\bS\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\bT\d{1,2}\s*E\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
    .replace(/\b(temporada|season|epis[o\u00f3]dio|episode)\b/gi, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado)\b/gi, ' ')
    .replace(/\b(complete|completo|dublado|legendado|dual)\b/gi, ' ')
    .replace(/[-\u2013\u2014|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTmdbUrl(path: string, params: URLSearchParams): string {
  if (apiKey) {
    params.set('api_key', apiKey);
  }

  return `${TMDB_API_BASE}${path}?${params.toString()}`;
}

function getTmdbHeaders(): HeadersInit | undefined {
  return readAccessToken ? { Authorization: `Bearer ${readAccessToken}` } : undefined;
}

function getQueryCandidates(title: string): string[] {
  const base = sanitizeTitle(title);
  const withoutYear = base.replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
  const firstChunk = withoutYear.split(/[:\-|]/)[0]?.trim() || withoutYear;

  return [...new Set([title.trim(), base, withoutYear, firstChunk].filter(Boolean))];
}

function buildPosterCacheKey(title: string, type: TMDBMediaType): string {
  const normalizedTitle = sanitizeTitle(title) || title.trim();
  const normalizedKey = normalizeForCompare(normalizedTitle);
  return normalizedKey ? `${type}:${normalizedKey}` : '';
}

function isPosterCacheFresh(entry: TmdbPosterCacheEntry): boolean {
  const maxAge = entry.poster ? TMDB_POSTER_CACHE_TTL_MS : TMDB_POSTER_MISS_CACHE_TTL_MS;
  return Date.now() - entry.cachedAt < maxAge;
}

async function readCachedPoster(cacheKey: string): Promise<string | null | undefined> {
  if (!cacheKey) return undefined;

  const memoryEntry = posterMemoryCache.get(cacheKey);
  if (memoryEntry) {
    if (isPosterCacheFresh(memoryEntry)) {
      return memoryEntry.poster;
    }

    posterMemoryCache.delete(cacheKey);
  }

  const storedEntry = await getTmdbPosterCache(cacheKey);
  if (!storedEntry) return undefined;
  if (!isPosterCacheFresh(storedEntry)) return undefined;

  posterMemoryCache.set(cacheKey, storedEntry);
  return storedEntry.poster;
}

function persistPosterCache(cacheKey: string, poster: string | null): void {
  if (!cacheKey) return;

  const entry: TmdbPosterCacheEntry = {
    poster,
    cachedAt: Date.now(),
  };

  posterMemoryCache.set(cacheKey, entry);
  void setTmdbPosterCache(cacheKey, entry);
}

function buildSeasonEpisodeCacheKey(title: string, seasonNumber: number): string {
  const normalizedTitle = normalizeForCompare(sanitizeTitle(title) || title.trim());
  return normalizedTitle ? `tv-season:${normalizedTitle}:s${seasonNumber}` : '';
}

function isSeasonEpisodeCacheFresh(entry: TmdbSeasonEpisodeCacheEntry): boolean {
  const hasEpisodes = Object.keys(entry.episodes).length > 0;
  const maxAge = hasEpisodes ? TMDB_SEASON_EPISODE_CACHE_TTL_MS : TMDB_SEASON_EPISODE_MISS_CACHE_TTL_MS;
  return Date.now() - entry.cachedAt < maxAge;
}

async function readCachedSeasonEpisodes(cacheKey: string): Promise<Record<number, string> | undefined> {
  if (!cacheKey) return undefined;

  const memoryEntry = seasonEpisodeMemoryCache.get(cacheKey);
  if (memoryEntry) {
    if (isSeasonEpisodeCacheFresh(memoryEntry)) {
      return memoryEntry.episodes;
    }

    seasonEpisodeMemoryCache.delete(cacheKey);
  }

  const storedEntry = await getTmdbSeasonEpisodeCache(cacheKey);
  if (!storedEntry) return undefined;
  if (!isSeasonEpisodeCacheFresh(storedEntry)) return undefined;

  seasonEpisodeMemoryCache.set(cacheKey, storedEntry);
  return storedEntry.episodes;
}

function persistSeasonEpisodeCache(cacheKey: string, episodes: Record<number, string>): void {
  if (!cacheKey) return;

  const entry: TmdbSeasonEpisodeCacheEntry = {
    episodes,
    cachedAt: Date.now(),
  };

  seasonEpisodeMemoryCache.set(cacheKey, entry);
  void setTmdbSeasonEpisodeCache(cacheKey, entry);
}

function pickBestPoster(query: string, results: TMDBResult[]): string | null {
  if (results.length === 0) return null;

  const q = normalizeForCompare(query);

  const scored = results
    .map((result) => {
      const labels = [result.name, result.original_name, result.title, result.original_title]
        .filter(Boolean)
        .map((value) => normalizeForCompare(value as string));

      let score = 0;
      for (const label of labels) {
        if (!label) continue;
        if (label === q) score += 100;
        else if (label.startsWith(`${q} `) || label.endsWith(` ${q}`)) score += 60;
        else if (label.includes(q) || q.includes(label)) score += 30;
      }

      if (result.poster_path) score += 10;
      return { score, poster: result.poster_path };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored.find((item) => item.poster)?.poster;
  return best ? `${TMDB_IMAGE_BASE}${best}` : null;
}

function scoreTmdbResult(query: string, result: TMDBResult): number {
  const q = normalizeForCompare(query);
  const labels = [result.name, result.original_name, result.title, result.original_title]
    .filter(Boolean)
    .map((value) => normalizeForCompare(value as string));

  let score = 0;
  for (const label of labels) {
    if (!label) continue;
    if (label === q) score += 100;
    else if (label.startsWith(`${q} `) || label.endsWith(` ${q}`)) score += 60;
    else if (label.includes(q) || q.includes(label)) score += 30;
  }

  if (result.id) score += 5;
  return score;
}

function pickBestTvSearchResult(query: string, results: TMDBResult[]): TMDBResult | null {
  const best = results
    .filter((result) => result.id)
    .map((result) => ({ result, score: scoreTmdbResult(query, result) }))
    .sort((a, b) => b.score - a.score)[0];

  return best && best.score > 0 ? best.result : null;
}

async function fetchTvSearchResults(
  query: string,
  language: 'pt-BR' | 'en-US',
  signal?: AbortSignal,
): Promise<TMDBResult[]> {
  if (!hasTmdbCredentials || !query) return [];

  const params = new URLSearchParams({
    query,
    language,
    include_adult: 'false',
  });

  const response = await fetch(buildTmdbUrl('/search/tv', params), {
    headers: getTmdbHeaders(),
    signal,
  });
  if (!response.ok) return [];

  const data = await response.json() as { results?: TMDBResult[] };
  return data.results ?? [];
}

async function fetchSeasonEpisodeMapByTvId(
  tvId: number,
  seasonNumber: number,
  language: 'pt-BR' | 'en-US',
  signal?: AbortSignal,
): Promise<Record<number, string>> {
  if (!hasTmdbCredentials || !tvId || seasonNumber < 0) return {};

  const params = new URLSearchParams({ language });
  const response = await fetch(buildTmdbUrl(`/tv/${tvId}/season/${seasonNumber}`, params), {
    headers: getTmdbHeaders(),
    signal,
  });
  if (!response.ok) return {};

  const data = await response.json() as TMDBSeasonDetails;
  const episodes: Record<number, string> = {};

  data.episodes?.forEach((episode) => {
    const episodeNumber = episode.episode_number;
    const name = episode.name?.trim();
    if (episodeNumber && name) {
      episodes[episodeNumber] = name;
    }
  });

  return episodes;
}

async function fetchPosterByQuery(
  query: string,
  type: TMDBMediaType,
  language: 'pt-BR' | 'en-US',
  signal?: AbortSignal,
): Promise<string | null> {
  if (!hasTmdbCredentials || !query) return null;

  const params = new URLSearchParams({
    query,
    language,
    include_adult: 'false',
  });

  if (apiKey) {
    params.set('api_key', apiKey);
  }

  const headers: HeadersInit | undefined = readAccessToken
    ? { Authorization: `Bearer ${readAccessToken}` }
    : undefined;

  const response = await fetch(`${TMDB_API_BASE}/search/${type}?${params.toString()}`, {
    headers,
    signal,
  });
  if (!response.ok) return null;

  const data = await response.json() as { results?: TMDBResult[] };
  return pickBestPoster(query, data.results ?? []);
}

async function fetchPoster(title: string, type: TMDBMediaType, signal?: AbortSignal): Promise<string | null> {
  if (!hasTmdbCredentials) return null;

  const cacheKey = buildPosterCacheKey(title, type);
  const cachedPoster = await readCachedPoster(cacheKey);
  if (cachedPoster !== undefined) return cachedPoster;

  const queries = getQueryCandidates(title);
  let resolvedPoster: string | null = null;

  for (const query of queries) {
    const posterPt = await fetchPosterByQuery(query, type, 'pt-BR', signal);
    if (posterPt) {
      resolvedPoster = posterPt;
      break;
    }

    const posterEn = await fetchPosterByQuery(query, type, 'en-US', signal);
    if (posterEn) {
      resolvedPoster = posterEn;
      break;
    }
  }

  if (!signal?.aborted) {
    persistPosterCache(cacheKey, resolvedPoster);
  }

  return resolvedPoster;
}

export async function fetchTmdbPoster(
  title: string,
  type: TMDBMediaType,
  signal?: AbortSignal,
): Promise<string | null> {
  return fetchPoster(title, type, signal);
}

export async function fetchTmdbSeasonEpisodeNames(
  seriesTitle: string,
  seasonNumber: number,
  signal?: AbortSignal,
): Promise<Record<number, string>> {
  if (!hasTmdbCredentials || !seriesTitle.trim()) return {};

  const cacheKey = buildSeasonEpisodeCacheKey(seriesTitle, seasonNumber);
  const cachedEpisodes = await readCachedSeasonEpisodes(cacheKey);
  if (cachedEpisodes !== undefined) return cachedEpisodes;

  const queries = getQueryCandidates(seriesTitle);
  const languages: Array<'pt-BR' | 'en-US'> = ['pt-BR', 'en-US'];

  for (const query of queries) {
    for (const language of languages) {
      const results = await fetchTvSearchResults(query, language, signal);
      if (signal?.aborted) return {};

      const bestResult = pickBestTvSearchResult(query, results);
      if (!bestResult?.id) continue;

      for (const seasonLanguage of languages) {
        const episodes = await fetchSeasonEpisodeMapByTvId(bestResult.id, seasonNumber, seasonLanguage, signal);
        if (signal?.aborted) return {};

        if (Object.keys(episodes).length > 0) {
          persistSeasonEpisodeCache(cacheKey, episodes);
          return episodes;
        }
      }
    }
  }

  persistSeasonEpisodeCache(cacheKey, {});
  return {};
}

async function fetchPosterMap(
  titles: string[],
  type: TMDBMediaType,
  { concurrency = 6 }: EnrichCatalogOptions = {},
): Promise<Map<string, string>> {
  const uniqueTitles = [...new Set(titles.map(sanitizeTitle).filter(Boolean))];
  const posterMap = new Map<string, string>();
  const chunkSize = Math.max(1, concurrency);

  for (let index = 0; index < uniqueTitles.length; index += chunkSize) {
    const chunk = uniqueTitles.slice(index, index + chunkSize);
    const results = await Promise.all(
      chunk.map(async (title) => {
        try {
          return [title, await fetchPoster(title, type)] as const;
        } catch {
          return [title, null] as const;
        }
      }),
    );

    results.forEach(([title, poster]) => {
      if (poster) {
        posterMap.set(title, poster);
      }
    });
  }

  return posterMap;
}

export async function enrichCatalogLogosWithTMDB(
  catalog: CatalogState,
  options: EnrichCatalogOptions = {},
): Promise<CatalogState> {
  if (!hasTmdbCredentials) return catalog;

  try {
    const onlyMissingLogos = options.onlyMissingLogos ?? false;
    const movieTargets = onlyMissingLogos
      ? catalog.movies.filter((movie) => !movie.logo)
      : catalog.movies;
    const seriesTargets = onlyMissingLogos
      ? catalog.series.filter((serie) => !serie.logo)
      : catalog.series;

    if (movieTargets.length === 0 && seriesTargets.length === 0) {
      return catalog;
    }

    const moviePosterMap = await fetchPosterMap(
      movieTargets.map((movie) => movie.title),
      'movie',
      options,
    );
    const seriesPosterMap = await fetchPosterMap(
      seriesTargets.map((serie) => serie.title),
      'tv',
      options,
    );
    let changed = false;

    const movies: ContentItem[] = catalog.movies.map((movie) => {
      const poster = moviePosterMap.get(sanitizeTitle(movie.title));
      if (!poster || poster === movie.logo) return movie;
      changed = true;
      return { ...movie, logo: poster };
    });

    const series: Series[] = catalog.series.map((serie) => {
      const poster = seriesPosterMap.get(sanitizeTitle(serie.title));
      if (!poster) return serie;
      if (poster === serie.logo) return serie;

      changed = true;

      const seasons = Object.fromEntries(
        Object.entries(serie.seasons).map(([season, episodes]) => [
          Number(season),
          episodes.map((episode) => ({ ...episode, logo: poster })),
        ]),
      );

      return {
        ...serie,
        logo: poster,
        seasons,
      };
    });

    const movieById = new Map(movies.map((movie) => [movie.id, movie]));
    const seriesEpisodeById = new Map<string, ContentItem>();

    for (const serie of series) {
      Object.values(serie.seasons).forEach((episodes) => {
        episodes.forEach((episode) => {
          seriesEpisodeById.set(episode.id, episode);
        });
      });
    }

    if (!changed) {
      return catalog;
    }

    const allItems = catalog.allItems.map((item) => {
      if (item.type === 'movie') return movieById.get(item.id) ?? item;
      return seriesEpisodeById.get(item.id) ?? item;
    });

    return {
      ...catalog,
      movies,
      series,
      allItems,
    };
  } catch {
    return catalog;
  }
}
