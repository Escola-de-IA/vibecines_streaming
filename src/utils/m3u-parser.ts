import { CatalogState, ContentItem, ContentType, Series } from '@/types/content';
import { isNativeWebViewTarget } from '@/lib/runtime-config';
import { getPlayableUrl } from '@/utils/playback-source';
import JSZip from 'jszip';

function generateId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(title: string): string {
  return normalizeSearchText(title)
    .replace(/\[(?:[^\]]*)\]/g, ' ')
    .replace(/\b(4k|uhd|fhd|hd|dublado|dual\s*audio|legendado)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function qualityScore(title: string): number {
  const t = normalizeSearchText(title);
  if (t.includes('[l]')) return 3;
  if (t.includes('4k') || t.includes('uhd')) return 2;
  if (t.includes('fhd') || t.includes('1080')) return 1.5;
  return 1;
}

function dedupeItems(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();

  for (const item of items) {
    const key = item.type === 'series'
      ? `${item.seriesId || normalizeTitle(item.title)}|${item.seasonNumber || 1}|${item.episodeNumber || 0}`
      : `${normalizeTitle(item.title)}|${normalizeSearchText(item.group)}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    if (qualityScore(item.title) > qualityScore(existing.title)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function splitExtInfLine(line: string): { metadata: string; displayTitle: string } {
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      return {
        metadata: line.slice(0, i),
        displayTitle: line.slice(i + 1),
      };
    }
  }

  const fallbackComma = line.lastIndexOf(',');
  if (fallbackComma !== -1) {
    return {
      metadata: line.slice(0, fallbackComma),
      displayTitle: line.slice(fallbackComma + 1),
    };
  }

  return {
    metadata: line,
    displayTitle: '',
  };
}

function parseExtInfAttributes(metadata: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(metadata)) !== null) {
    attrs[match[1].toLowerCase()] = match[2].trim();
  }

  return attrs;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAttribute(metadata: string, attrs: Record<string, string>, key: string): string {
  const direct = attrs[key];
  if (direct) return direct;

  const looseRegex = new RegExp(`${escapeRegex(key)}="([^,]*)`, 'i');
  const looseMatch = metadata.match(looseRegex);
  return looseMatch?.[1]?.trim() || '';
}

function sanitizeExtInfText(value: string): string {
  return value
    .replace(/(?:\s|")*(?:tvg-[\w-]+|group-title)\s*=\s*"[^"]*"?.*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s"']+|[\s"']+$/g, '')
    .trim();
}

function isPollutedWithAttributes(value: string): boolean {
  return /\b(?:tvg-name|tvg-logo|group-title)\s*=/i.test(value);
}

function resolvePreferredTitle(rawDisplayTitle: string, parsedDisplayTitle: string, tvgName: string): string {
  if (!parsedDisplayTitle) return tvgName;
  if (isPollutedWithAttributes(rawDisplayTitle) && tvgName) return tvgName;
  return parsedDisplayTitle;
}

const seriesPatterns = [
  /S(\d{1,2})\s*E(\d{1,3})/i,
  /T(\d{1,2})\s*E(\d{1,3})/i,
  /(\d{1,2})x(\d{1,3})/i,
  /temporada\s*(\d{1,2}).*epis[o\u00f3]dio\s*(\d{1,3})/i,
];

function cleanSeriesTitlePart(value: string): string {
  return value.replace(/[-\u2013\u2014\s]+$/, '').trim();
}

function cleanEpisodeTitlePart(value: string): string {
  return value.replace(/^[-\u2013\u2014\s]+/, '').trim();
}

function stripEpisodeMarker(title: string): string {
  return seriesPatterns.reduce((nextTitle, pattern) => nextTitle.replace(pattern, ''), title);
}

function extractSeriesTitleFromEpisode(title: string): string {
  for (const pattern of seriesPatterns) {
    const markerIndex = title.search(pattern);
    if (markerIndex === -1) continue;
    return cleanSeriesTitlePart(title.substring(0, markerIndex));
  }

  return cleanSeriesTitlePart(stripEpisodeMarker(title));
}

function hasAnyKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function hasSeriesSignal(title: string, group: string, url: string): boolean {
  const normalizedGroup = normalizeSearchText(group);
  const normalizedUrl = normalizeSearchText(url);

  return (
    /\/series\//i.test(url)
    || hasAnyKeyword(normalizedGroup, ['series', 'serie', 'seriado', 'seriados', 'temporada', 'temporadas'])
    || hasAnyKeyword(normalizedUrl, ['/series/', 'type=series'])
    || seriesPatterns.some((pattern) => pattern.test(title))
  );
}

function hasMovieSignal(group: string, url: string): boolean {
  const normalizedGroup = normalizeSearchText(group);
  const normalizedUrl = normalizeSearchText(url);

  return (
    /\/movie\//i.test(url)
    || hasAnyKeyword(normalizedGroup, ['filme', 'filmes', 'movie', 'movies', 'vod', 'cinema'])
    || hasAnyKeyword(normalizedUrl, ['/movie/', '/vod/', 'type=movie', 'type=vod'])
  );
}

function isLiveContent(title: string, group: string, url: string): boolean {
  if (hasSeriesSignal(title, group, url) || hasMovieSignal(group, url)) return false;

  const combined = normalizeSearchText(`${group} ${title} ${url}`);
  return hasAnyKeyword(combined, [
    'ao vivo',
    '24h',
    '24 horas',
    'canais',
    'tv ao vivo',
    'aberto',
    'aberta',
    'canal',
    'open tv',
    'ppv',
    'pay per view',
    'linear',
    '/live/',
  ]);
}

function isAdultContent(title: string, group: string): boolean {
  const combined = normalizeSearchText(`${group} ${title}`);
  return hasAnyKeyword(combined, [
    'adult',
    'adulto',
    'xxx',
    'porn',
    'erotic',
    'erotico',
    'sexy',
    'sex ',
    '+18',
    '18+',
    'hentai',
    'playboy',
    'hustler',
    'brazzers',
    'bangbros',
    'naughty',
    'milf',
    'lesbian',
    'gay ',
    'strip',
    'onlyfans',
    'cam girl',
    'nude',
    'naked',
    'fetish',
    'bdsm',
    'hardcore',
    'softcore',
    'xvideos',
    'xhamster',
    'redtube',
    'youporn',
    'penthouse',
    'vivid',
    'hot girls',
    'after dark',
    'midnight',
    'meia-noite',
    'proibido',
  ]);
}

function detectType(title: string, group: string, url: string): {
  type: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  seriesTitle?: string;
} {
  for (const pattern of seriesPatterns) {
    const match = title.match(pattern);
    if (!match) continue;

    const seasonNumber = parseInt(match[1], 10);
    const episodeNumber = parseInt(match[2], 10);
    const markerIndex = title.search(pattern);
    const seriesTitle = cleanSeriesTitlePart(title.substring(0, markerIndex));
    const episodeTitle = cleanEpisodeTitlePart(title.substring(markerIndex + match[0].length));

    return {
      type: 'series',
      seasonNumber,
      episodeNumber,
      episodeTitle,
      seriesTitle: seriesTitle || title,
    };
  }

  if (hasSeriesSignal(title, group, url)) {
    return { type: 'series', seasonNumber: 1, episodeNumber: 1, seriesTitle: title };
  }

  return { type: 'movie' };
}

export function parseM3U(content: string): CatalogState {
  const lines = content.split('\n');
  const items: ContentItem[] = [];

  let currentTitle = '';
  let currentLogo = '';
  let currentGroup = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const { metadata, displayTitle } = splitExtInfLine(line);
      const attrs = parseExtInfAttributes(metadata);

      const rawDisplayTitle = displayTitle.trim();
      const parsedDisplayTitle = sanitizeExtInfText(rawDisplayTitle);
      const parsedTvgName = sanitizeExtInfText(extractAttribute(metadata, attrs, 'tvg-name'));

      currentTitle = resolvePreferredTitle(rawDisplayTitle, parsedDisplayTitle, parsedTvgName) || 'Sem Titulo';
      currentLogo = sanitizeExtInfText(extractAttribute(metadata, attrs, 'tvg-logo'));
      currentGroup = sanitizeExtInfText(extractAttribute(metadata, attrs, 'group-title')) || 'Sem Categoria';
      continue;
    }

    if (!line || line.startsWith('#') || (!/^https?:\/\//i.test(line) && !/^rtmp:\/\//i.test(line))) {
      continue;
    }

    if (isLiveContent(currentTitle, currentGroup, line) || isAdultContent(currentTitle, currentGroup)) {
      currentTitle = '';
      currentLogo = '';
      currentGroup = '';
      continue;
    }

    const detected = detectType(currentTitle, currentGroup, line);

    const item: ContentItem = {
      id: generateId(currentTitle + line),
      title: currentTitle,
      url: line,
      logo: currentLogo || undefined,
      group: currentGroup,
      type: detected.type,
      seasonNumber: detected.seasonNumber,
      episodeNumber: detected.episodeNumber,
      episodeTitle: detected.episodeTitle,
      seriesId: detected.seriesTitle ? generateId(detected.seriesTitle) : undefined,
    };

    if (detected.seriesTitle) {
      item.seriesId = generateId(detected.seriesTitle);
    }

    items.push(item);

    currentTitle = '';
    currentLogo = '';
    currentGroup = '';
  }

  const uniqueItems = dedupeItems(items);
  const movies = uniqueItems.filter((item) => item.type === 'movie');

  const seriesMap = new Map<string, Series>();
  uniqueItems.filter((item) => item.type === 'series').forEach((item) => {
    const sid = item.seriesId || item.id;
    if (!seriesMap.has(sid)) {
      const seriesTitle = extractSeriesTitleFromEpisode(item.title) || item.title;

      seriesMap.set(sid, {
        id: sid,
        title: seriesTitle,
        logo: item.logo,
        group: item.group,
        type: 'series',
        seasons: {},
      });
    }

    const series = seriesMap.get(sid)!;
    if (!series.logo && item.logo) series.logo = item.logo;

    const season = item.seasonNumber || 1;
    if (!series.seasons[season]) series.seasons[season] = [];
    series.seasons[season].push(item);
  });

  const seriesEpisodeById = new Map<string, ContentItem>();
  seriesMap.forEach((series) => {
    Object.keys(series.seasons).forEach((season) => {
      series.seasons[Number(season)] = series.seasons[Number(season)]
        .map((episode) => ({
          ...episode,
          logo: episode.logo || series.logo,
        }))
        .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));

      series.seasons[Number(season)].forEach((episode) => {
        seriesEpisodeById.set(episode.id, episode);
      });
    });
  });

  const groups = [...new Set(uniqueItems.map((item) => item.group))];

  return {
    movies,
    series: Array.from(seriesMap.values()),
    allItems: uniqueItems.map((item) => seriesEpisodeById.get(item.id) ?? item),
    groups,
    isLoaded: uniqueItems.length > 0,
  };
}

export function validateM3UText(
  text: string,
  message = 'Conte\u00fado inv\u00e1lido: n\u00e3o parece uma lista M3U',
): void {
  if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
    throw new Error(message);
  }
}

export function parseM3UText(text: string): CatalogState {
  validateM3UText(text);
  return parseM3U(text);
}

function buildFetchUrl(url: string, bypassCache: boolean): string {
  const sourceUrl = bypassCache ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url;
  return getPlayableUrl(sourceUrl, { allowDirectHttp: isNativeWebViewTarget });
}

export async function fetchAndParseM3U(url: string, bypassCache = false): Promise<CatalogState> {
  const fetchUrl = buildFetchUrl(url, bypassCache);
  const response = await fetch(fetchUrl, bypassCache ? { cache: 'no-store' } : undefined);
  if (!response.ok) {
    throw new Error(`Falha ao baixar lista M3U: ${response.status}`);
  }

  const text = await response.text();
  return parseM3UText(text);
}

export async function extractM3UTextFromZipBuffer(zipData: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(zipData);
  const entry = Object.values(zip.files).find((file) => !file.dir && /\.m3u8?$/i.test(file.name));

  if (!entry) {
    throw new Error('ZIP invalido: nenhum arquivo .m3u/.m3u8 encontrado');
  }

  const text = await entry.async('string');
  validateM3UText(text, 'Conte\u00fado M3U inv\u00e1lido dentro do ZIP');
  return text;
}

export async function parseM3UFromZipBuffer(zipData: ArrayBuffer): Promise<CatalogState> {
  const text = await extractM3UTextFromZipBuffer(zipData);
  return parseM3UText(text);
}

export async function fetchAndParseM3UZip(url: string, bypassCache = false): Promise<CatalogState> {
  const fetchUrl = buildFetchUrl(url, bypassCache);
  const response = await fetch(fetchUrl, bypassCache ? { cache: 'no-store' } : undefined);
  if (!response.ok) {
    throw new Error(`Falha ao baixar ZIP M3U: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return parseM3UFromZipBuffer(buffer);
}
