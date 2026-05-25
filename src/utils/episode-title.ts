import type { ContentItem } from '@/types/content';

export function buildEpisodeFallbackTitle(seriesTitle: string, episode: ContentItem, index = 0): string {
  const episodeNumber = episode.episodeNumber || index + 1;
  return `${seriesTitle} - Episódio ${episodeNumber}`;
}

export function resolveEpisodeDisplayTitle(
  seriesTitle: string,
  episode: ContentItem,
  options?: { tmdbName?: string | null; index?: number },
): string {
  const tmdbName = options?.tmdbName?.trim();
  if (tmdbName) return tmdbName;

  const cleanedEpisodeTitle = episode.episodeTitle?.trim();
  if (cleanedEpisodeTitle) return cleanedEpisodeTitle;

  return buildEpisodeFallbackTitle(seriesTitle, episode, options?.index || 0);
}