// Series Parser - Extrai informações de temporada e episódio dos títulos

export interface ParsedEpisode {
  seriesName: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  originalTitle: string;
}

/**
 * Padrões comuns de nomenclatura de episódios
 */
const PATTERNS = [
  // S01E01 ou s01e01
  /^(.+?)\s+[Ss](\d{1,2})[Ee](\d{1,2})(?:\s*-?\s*(.+))?$/,
  
  // 1x01 ou 1X01
  /^(.+?)\s*(\d{1,2})[xX](\d{1,2})(?:\s*-?\s*(.+))?$/,
  
  // Temporada 1 Episódio 01
  /^(.+?)\s*(?:temporada|temp\.?|season)\s*(\d{1,2})\s*(?:episódio|episodio|ep\.?|episode)\s*(\d{1,2})(?:\s*-?\s*(.+))?$/i,
  
  // [S01E01]
  /^(.+?)\s*\[?[Ss](\d{1,2})[Ee](\d{1,2})\]?(?:\s*-?\s*(.+))?$/,
];

export function parseEpisodeTitle(title: string): ParsedEpisode | null {
  const cleaned = title.trim();

  for (const pattern of PATTERNS) {
    const match = cleaned.match(pattern);
    
    if (match) {
      const [, seriesName, seasonStr, episodeStr, episodeTitle] = match;
      
      return {
        seriesName: seriesName.trim(),
        season: parseInt(seasonStr, 10),
        episode: parseInt(episodeStr, 10),
        episodeTitle: episodeTitle?.trim(),
        originalTitle: title,
      };
    }
  }

  return null;
}

/**
 * Normaliza o nome da série
 */
export function normalizeSeriesName(name: string): string {
  return name
    .replace(/\s*\(?\d{4}\)?/g, "")
    .replace(/\s*\[?(?:4k|hd|fhd|uhd|1080p|720p)\]?/gi, "")
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se um título é de série
 */
export function isSeries(title: string): boolean {
  return parseEpisodeTitle(title) !== null;
}

/**
 * Interface para série agrupada
 */
export interface GroupedSeries {
  seriesName: string;
  normalizedName: string;
  episodes: Array<ParsedEpisode & { url: string; image?: string; id: string }>;
  totalSeasons: number;
  totalEpisodes: number;
}

/**
 * Agrupa episódios por série
 */
export function groupEpisodesBySeries(
  items: Array<{ id: string; title: string; url: string; image?: string }>
): GroupedSeries[] {
  const seriesMap = new Map<string, GroupedSeries>();

  for (const item of items) {
    const parsed = parseEpisodeTitle(item.title);
    
    if (!parsed) continue;

    const normalizedName = normalizeSeriesName(parsed.seriesName);
    
    if (!seriesMap.has(normalizedName)) {
      seriesMap.set(normalizedName, {
        seriesName: parsed.seriesName,
        normalizedName,
        episodes: [],
        totalSeasons: 0,
        totalEpisodes: 0,
      });
    }

    const series = seriesMap.get(normalizedName)!;
    
    series.episodes.push({
      ...parsed,
      url: item.url,
      image: item.image,
      id: item.id,
    });
    
    series.totalSeasons = Math.max(series.totalSeasons, parsed.season);
    series.totalEpisodes = series.episodes.length;
  }

  // Ordenar episódios
  seriesMap.forEach((series) => {
    series.episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    });
  });

  return Array.from(seriesMap.values());
}

/**
 * Interface para temporada agrupada
 */
export interface SeasonGroup {
  season: number;
  episodes: Array<ParsedEpisode & { url: string; image?: string; id: string }>;
}

/**
 * Agrupa episódios por temporada
 */
export function groupEpisodesByseason(
  episodes: Array<ParsedEpisode & { url: string; image?: string; id: string }>
): SeasonGroup[] {
  const seasonMap = new Map<number, SeasonGroup>();

  for (const episode of episodes) {
    if (!seasonMap.has(episode.season)) {
      seasonMap.set(episode.season, {
        season: episode.season,
        episodes: [],
      });
    }
    
    seasonMap.get(episode.season)!.episodes.push(episode);
  }

  return Array.from(seasonMap.values()).sort((a, b) => a.season - b.season);
}