export type PlaybackKind = 'hls' | 'video' | 'unknown';

export interface PlaybackSource {
  originalUrl: string;
  playbackUrl: string;
  protocol: string;
  kind: PlaybackKind;
  extension?: string;
  isHttpStream: boolean;
}

interface ResolvePlaybackSourceOptions {
  baseUrl?: string;
  allowDirectHttp?: boolean;
}

interface GetPlayableUrlOptions {
  allowDirectHttp?: boolean;
}

function parseUrl(rawUrl: string, baseUrl?: string): URL | null {
  try {
    return new URL(rawUrl, baseUrl || (typeof window !== 'undefined' ? window.location.href : undefined));
  } catch {
    return null;
  }
}

function getExtension(parsedUrl: URL | null, rawUrl: string): string | undefined {
  const sourcePath = parsedUrl?.pathname || rawUrl.split('?')[0].split('#')[0];
  const match = sourcePath.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase();
}

function getPlaybackKind(extension?: string): PlaybackKind {
  if (extension === 'm3u8') return 'hls';
  if (extension && ['mp4', 'mkv', 'avi', 'mov', 'webm', 'ts'].includes(extension)) return 'video';
  return 'unknown';
}

export function getPlayableUrl(
  url: string,
  options: GetPlayableUrlOptions = {},
): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  if (!/^http:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (options.allowDirectHttp) {
    return trimmedUrl;
  }

  return `/api/hls-proxy?url=${encodeURIComponent(trimmedUrl)}`;
}

export function resolvePlaybackSource(
  originalUrl: string,
  options: ResolvePlaybackSourceOptions = {},
): PlaybackSource {
  const trimmedUrl = originalUrl.trim();
  const parsedUrl = parseUrl(trimmedUrl, options.baseUrl);
  const protocol = parsedUrl?.protocol || '';
  const extension = getExtension(parsedUrl, trimmedUrl);
  const kind = getPlaybackKind(extension);

  return {
    originalUrl,
    playbackUrl: getPlayableUrl(trimmedUrl, { allowDirectHttp: options.allowDirectHttp }),
    protocol,
    kind,
    extension,
    isHttpStream: protocol === 'http:',
  };
}
