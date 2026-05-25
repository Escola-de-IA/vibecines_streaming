import type { CatalogState, ContentItem, Series } from '@/types/content';
import { getAppAssetPath } from '@/lib/app-path';

interface WebOsSeriesSummary {
  id: string;
  title: string;
  logo?: string;
  group: string;
  type: 'series';
  seasonCount: number;
  episodeCount: number;
  detailPath: string;
}

interface WebOsCatalogIndexPayload {
  version: number;
  generatedAt: number;
  movies: ContentItem[];
  series: WebOsSeriesSummary[];
  groups: string[];
  episodeSeriesMap: Record<string, string>;
}

interface WebOsSeriesDetailPayload {
  series: Series[];
}

const seriesChunkCache = new Map<string, Promise<Map<string, Series>>>();

async function fetchJson<T>(assetPath: string): Promise<T> {
  const response = await fetch(getAppAssetPath(assetPath), { cache: 'force-cache' });

  if (!response.ok) {
    throw new Error(`Failed to load webOS asset: ${assetPath}`);
  }

  return response.json() as Promise<T>;
}

export async function loadBundledWebOsCatalog(): Promise<{
  catalog: CatalogState;
  episodeSeriesMap: Record<string, string>;
}> {
  const payload = await fetchJson<WebOsCatalogIndexPayload>('webos-catalog/index.json');

  const series: Series[] = payload.series.map((item) => ({
    id: item.id,
    title: item.title,
    logo: item.logo,
    group: item.group,
    type: 'series',
    seasons: {},
    seasonCount: item.seasonCount,
    episodeCount: item.episodeCount,
    detailPath: item.detailPath,
    isDetailLoaded: false,
  }));

  return {
    catalog: {
      movies: payload.movies,
      series,
      allItems: payload.movies,
      groups: payload.groups,
      isLoaded: payload.movies.length > 0 || series.length > 0,
    },
    episodeSeriesMap: payload.episodeSeriesMap || {},
  };
}

export async function loadBundledWebOsSeriesDetail(detailPath: string, seriesId: string): Promise<Series> {
  if (!seriesChunkCache.has(detailPath)) {
    seriesChunkCache.set(detailPath, (async () => {
      const payload = await fetchJson<WebOsSeriesDetailPayload>(detailPath);
      return new Map(
        payload.series.map((series) => [
          series.id,
          {
            ...series,
            isDetailLoaded: true,
          },
        ]),
      );
    })());
  }

  const chunk = await seriesChunkCache.get(detailPath)!;
  const series = chunk.get(seriesId);

  if (!series) {
    throw new Error(`Series ${seriesId} not found in chunk ${detailPath}`);
  }

  return series;
}
