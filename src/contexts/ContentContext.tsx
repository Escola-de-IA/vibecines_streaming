import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, startTransition } from 'react';
import { getAppAssetPath } from '@/lib/app-path';
import { imagePreloadLimit, isTmdbEnhancementEnabled, isTvLiteMode } from '@/lib/runtime-config';
import { getCatalogCache, setCatalogCache, type CatalogCacheEntry } from '@/lib/storage';
import { LEGACY_STORAGE_KEYS, readWithMigration, STORAGE_KEYS } from '@/lib/storage-keys';
import { type CatalogState, type ContentItem, type Series } from '@/types/content';
import { enrichCatalogLogosWithTMDB } from '@/utils/tmdb';
import { extractM3UTextFromZipBuffer, fetchAndParseM3U, fetchAndParseM3UZip, parseM3UText } from '@/utils/m3u-parser';
import { loadBundledWebOsCatalog, loadBundledWebOsSeriesDetail } from '@/utils/webos-catalog';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

interface ContentContextType {
  catalog: CatalogState;
  isLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;
  loadFromUrl: (url: string, persistShared?: boolean, updatedAt?: number) => Promise<boolean>;
  loadFromText: (text: string, persistShared?: boolean) => Promise<boolean>;
  loadFromZipBuffer: (zipBuffer: ArrayBuffer, persistShared?: boolean) => Promise<boolean>;
  favorites: Set<string>;
  orderedFavorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  searchContent: (query: string) => { movies: ContentItem[]; series: Series[] };
  getMovieById: (id: string) => ContentItem | undefined;
  getSeriesById: (id: string) => Series | undefined;
  ensureSeriesLoaded: (id: string) => Promise<Series | undefined>;
  resolveContentById: (id: string) => Promise<ContentItem | undefined>;
  m3uUrl: string | null;
  isTvLiteMode: boolean;
}

const ContentContext = createContext<ContentContextType | null>(null);
const LOCAL_PLAYLIST_PATHS = [
  getAppAssetPath('playlist.zip'),
  getAppAssetPath('assets/playlist.zip'),
  getAppAssetPath('playlist.m3u'),
  getAppAssetPath('assets/playlist.m3u'),
];

const EMPTY_CATALOG: CatalogState = {
  movies: [],
  series: [],
  allItems: [],
  groups: [],
  isLoaded: false,
};

const createSourceHash = (value: string) => {
  const len = value.length;
  if (len < 10000) {
    let hash = 0;
    for (let i = 0; i < len; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  const sample = value.substring(0, 5000)
    + value.substring((len / 2) - 2500, (len / 2) + 2500)
    + value.substring(len - 5000);

  let hash = 0;
  for (let i = 0; i < sample.length; i += 1) {
    hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
  }

  return `${Math.abs(hash).toString(36)}-${len}`;
};

const buildUrlSourceKey = (url: string) => `url:${url.trim()}`;
const buildTextSourceKey = (text: string) => `text:${createSourceHash(text)}`;

function readSavedM3uUrl() {
  if (typeof localStorage === 'undefined') return null;
  return readWithMigration(STORAGE_KEYS.m3uUrl, LEGACY_STORAGE_KEYS.m3uUrl);
}

function saveM3uUrl(url: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.m3uUrl, url);
}

function findEpisodeInSeries(series: Series | undefined, id: string): ContentItem | undefined {
  if (!series) return undefined;

  for (const episodes of Object.values(series.seasons)) {
    const match = episodes.find((episode) => episode.id === id);
    if (match) return match;
  }

  return undefined;
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const { isPrimaryOwner } = useAuth();
  const { userData, updateUserData } = useProfile();

  const [catalog, setCatalog] = useState<CatalogState>(EMPTY_CATALOG);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [m3uUrl, setM3uUrl] = useState<string | null>(() => readSavedM3uUrl());
  const [catalogSourceKey, setCatalogSourceKey] = useState<string | null>(null);

  const catalogRef = React.useRef<CatalogState>(EMPTY_CATALOG);
  const catalogStateRef = React.useRef({
    isLoaded: false,
    sourceKey: null as string | null,
  });
  const episodeSeriesMapRef = React.useRef<Record<string, string>>({});
  const seriesLoadPromisesRef = React.useRef(new Map<string, Promise<Series | undefined>>());

  const orderedFavorites = useMemo(() => {
    const favs = userData?.favorites;
    if (!favs) return [];
    if (Array.isArray(favs)) return [...favs].reverse();

    return Object.entries(favs)
      .sort(([, aTime], [, bTime]) => bTime - aTime)
      .map(([id]) => id);
  }, [userData?.favorites]);

  const favorites = useMemo(() => new Set(orderedFavorites), [orderedFavorites]);

  useEffect(() => {
    catalogRef.current = catalog;
    catalogStateRef.current = {
      isLoaded: catalog.isLoaded,
      sourceKey: catalogSourceKey,
    };
  }, [catalog, catalogSourceKey]);

  const saveCatalogCache = useCallback(async (sourceKey: string, nextCatalog: CatalogState) => {
    if (isTvLiteMode) return;

    const payload: CatalogCacheEntry = {
      sourceKey,
      catalog: nextCatalog,
      cachedAt: Date.now(),
    };

    await setCatalogCache(payload);
  }, []);

  const preloadCatalogImages = useCallback((nextCatalog: CatalogState) => {
    if (imagePreloadLimit <= 0) return;

    const logos = [
      ...nextCatalog.movies.map((item) => item.logo).filter(Boolean),
      ...nextCatalog.series.map((item) => item.logo).filter(Boolean),
    ].slice(0, imagePreloadLimit) as string[];

    logos.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }, []);

  const applyCatalog = useCallback((
    nextCatalog: CatalogState,
    options?: { sourceKey?: string; persistCache?: boolean }
  ) => {
    catalogRef.current = nextCatalog;

    startTransition(() => {
      setCatalog(nextCatalog);
    });

    if (options?.sourceKey) {
      setCatalogSourceKey(options.sourceKey);
      catalogStateRef.current = {
        isLoaded: nextCatalog.isLoaded,
        sourceKey: options.sourceKey,
      };

      if (options.persistCache !== false) {
        void saveCatalogCache(options.sourceKey, nextCatalog);
      }
    }

    preloadCatalogImages(nextCatalog);
  }, [preloadCatalogImages, saveCatalogCache]);

  const mergeSeriesDetail = useCallback((seriesDetail: Series) => {
    startTransition(() => {
      setCatalog((currentCatalog) => {
        const nextSeries = currentCatalog.series.map((series) => (
          series.id === seriesDetail.id
            ? { ...seriesDetail, isDetailLoaded: true }
            : series
        ));

        const nextCatalog = {
          ...currentCatalog,
          series: nextSeries,
        };

        catalogRef.current = nextCatalog;
        return nextCatalog;
      });
    });
  }, []);

  const enrichCatalogInBackground = useCallback((baseCatalog: CatalogState, sourceKey: string) => {
    if (isTvLiteMode || !isTmdbEnhancementEnabled) return;

    void enrichCatalogLogosWithTMDB(baseCatalog, {
      onlyMissingLogos: true,
      concurrency: 6,
    }).then((enrichedCatalog) => {
      if (enrichedCatalog === baseCatalog) return;
      if (catalogStateRef.current.sourceKey !== sourceKey) return;

      applyCatalog(enrichedCatalog, { sourceKey });
    });
  }, [applyCatalog]);

  const hydrateCatalogFromCache = useCallback(async () => {
    if (isTvLiteMode) return false;

    const cached = await getCatalogCache();
    if (!cached?.catalog.isLoaded) return false;

    applyCatalog(cached.catalog, {
      sourceKey: cached.sourceKey,
      persistCache: false,
    });
    return true;
  }, [applyCatalog]);

  const loadBundledOptimizedCatalog = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { catalog: optimizedCatalog, episodeSeriesMap } = await loadBundledWebOsCatalog();
      episodeSeriesMapRef.current = episodeSeriesMap;
      applyCatalog(optimizedCatalog, {
        sourceKey: 'webos:index',
        persistCache: false,
      });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog]);

  const loadFromUrl = useCallback(async (url: string, persistShared = false, updatedAt?: number) => {
    if (persistShared && !isPrimaryOwner) {
      setError('Somente o dono principal pode atualizar a lista M3U.');
      return false;
    }

    setError(null);
    const sourceKey = buildUrlSourceKey(url + (updatedAt ? `?u=${updatedAt}` : ''));
    setIsLoading(true);

    try {
      const bypass = persistShared || !!updatedAt;
      const result = /\.zip(\?.*)?$/i.test(url)
        ? await fetchAndParseM3UZip(url, bypass)
        : await fetchAndParseM3U(url, bypass);

      if (!result.isLoaded) {
        setError('A lista M3U não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      applyCatalog(result, { sourceKey, persistCache: !isTvLiteMode });
      enrichCatalogInBackground(result, sourceKey);
      setM3uUrl(url);
      saveM3uUrl(url);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uUrl: url,
          m3uContent: null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar a lista M3U. Verifique a URL e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog, enrichCatalogInBackground, isPrimaryOwner]);

  const loadFromText = useCallback(async (text: string, persistShared = false) => {
    if (persistShared && !isPrimaryOwner) {
      setError('Somente o dono principal pode atualizar a lista M3U.');
      return false;
    }

    setError(null);
    const sourceKey = buildTextSourceKey(text);
    setIsLoading(true);

    try {
      const result = parseM3UText(text);
      if (!result.isLoaded) {
        setError('O arquivo M3U não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      applyCatalog(result, { sourceKey, persistCache: !isTvLiteMode });
      enrichCatalogInBackground(result, sourceKey);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uContent: text,
          m3uUrl: null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar o arquivo M3U. Verifique o conteúdo e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog, enrichCatalogInBackground, isPrimaryOwner]);

  const loadFromZipBuffer = useCallback(async (zipBuffer: ArrayBuffer, persistShared = false) => {
    if (persistShared && !isPrimaryOwner) {
      setError('Somente o dono principal pode atualizar a lista M3U.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await extractM3UTextFromZipBuffer(zipBuffer);
      const sourceKey = `zip:${createSourceHash(text)}`;

      const result = parseM3UText(text);
      if (!result.isLoaded) {
        setError('O arquivo ZIP não possui conteúdos compatíveis para o catálogo.');
        return false;
      }

      applyCatalog(result, { sourceKey, persistCache: !isTvLiteMode });
      enrichCatalogInBackground(result, sourceKey);

      if (persistShared) {
        await setDoc(doc(db, 'appConfig', 'catalog'), {
          m3uContent: text,
          m3uUrl: null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      return true;
    } catch {
      setError('Erro ao carregar o arquivo ZIP M3U. Verifique o conteúdo e tente novamente.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog, enrichCatalogInBackground, isPrimaryOwner]);

  const loadFromUrlRef = React.useRef(loadFromUrl);
  const loadFromTextRef = React.useRef(loadFromText);

  useEffect(() => {
    loadFromUrlRef.current = loadFromUrl;
  }, [loadFromUrl]);

  useEffect(() => {
    loadFromTextRef.current = loadFromText;
  }, [loadFromText]);

  const loadFromLocalPlaylist = useCallback(async () => {
    if (isTvLiteMode) {
      const optimizedOk = await loadBundledOptimizedCatalog();
      if (optimizedOk) return true;
    }

    for (const path of LOCAL_PLAYLIST_PATHS) {
      const ok = await loadFromUrl(path, false, Date.now());
      if (ok) return true;
    }

    return false;
  }, [loadBundledOptimizedCatalog, loadFromUrl]);

  // Ref atualizado em cada render para que o useEffect de visibilidade use sempre a versão mais recente.
  const loadFromLocalPlaylistRef = React.useRef(loadFromLocalPlaylist);
  useEffect(() => {
    loadFromLocalPlaylistRef.current = loadFromLocalPlaylist;
  }, [loadFromLocalPlaylist]);

  // Detecta atualização do playlist.zip local quando o usuário volta à aba.
  // Faz um HEAD request leve e compara o ETag — se mudou (novo deploy), recarrega o catálogo.
  useEffect(() => {
    if (isTvLiteMode) return undefined;

    const lastETagRef = { current: '' };
    const lastCheckRef = { current: 0 };
    const MIN_INTERVAL_MS = 10 * 60 * 1000; // no mínimo 10 min entre checagens

    const checkForUpdate = async () => {
      // Só verifica o zip local quando não há URL remota configurada pelo admin
      const savedUrl = readSavedM3uUrl();
      if (savedUrl) return;

      const now = Date.now();
      if (now - lastCheckRef.current < MIN_INTERVAL_MS) return;
      lastCheckRef.current = now;

      const zipPath = LOCAL_PLAYLIST_PATHS[0];
      try {
        const res = await fetch(zipPath, { method: 'HEAD', cache: 'no-store' });
        const etag = res.headers.get('ETag') ?? res.headers.get('Last-Modified') ?? '';
        if (!etag) return;

        if (lastETagRef.current && etag !== lastETagRef.current) {
          // ZIP foi atualizado no servidor — recarrega o catálogo em background
          void loadFromLocalPlaylistRef.current();
        }
        lastETagRef.current = etag;
      } catch {
        // Ignora falhas de rede silenciosamente
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isTvLiteMode]);

  useEffect(() => {
    if (isTvLiteMode) return undefined;

    const configRef = doc(db, 'appConfig', 'catalog');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      const data = snapshot.data();
      const sharedText = (data?.m3uContent as string | undefined)?.trim();
      const sharedUrl = (data?.m3uUrl as string | undefined)?.trim();
      const updatedAt = data?.updatedAt as number | undefined;

      if (sharedText) {
        const sourceKey = buildTextSourceKey(sharedText);
        if (catalogStateRef.current.sourceKey === sourceKey && catalogStateRef.current.isLoaded) return;
        void loadFromTextRef.current(sharedText, false);
        return;
      }

      if (!sharedUrl) return;
      const sourceKey = buildUrlSourceKey(sharedUrl + (updatedAt ? `?u=${updatedAt}` : ''));
      if (catalogStateRef.current.sourceKey === sourceKey && catalogStateRef.current.isLoaded) return;
      void loadFromUrlRef.current(sharedUrl, false, updatedAt);
    });

    return () => unsubscribe();
  }, []);

  const ensureSeriesLoaded = useCallback(async (id: string) => {
    const currentSeries = catalogRef.current.series.find((series) => series.id === id);
    if (!currentSeries) return undefined;

    if (!isTvLiteMode || currentSeries.isDetailLoaded || !currentSeries.detailPath) {
      return currentSeries;
    }

    const inFlight = seriesLoadPromisesRef.current.get(id);
    if (inFlight) return inFlight;

    const loadPromise = (async () => {
      try {
        const detailSeries = await loadBundledWebOsSeriesDetail(currentSeries.detailPath as string, id);
        mergeSeriesDetail(detailSeries);
        return detailSeries;
      } catch {
        return undefined;
      } finally {
        seriesLoadPromisesRef.current.delete(id);
      }
    })();

    seriesLoadPromisesRef.current.set(id, loadPromise);
    return loadPromise;
  }, [mergeSeriesDetail]);

  const getMovieById = useCallback((id: string) => (
    catalog.movies.find((movie) => movie.id === id)
  ), [catalog.movies]);

  const getSeriesById = useCallback((id: string) => (
    catalog.series.find((series) => series.id === id)
  ), [catalog.series]);

  const resolveContentById = useCallback(async (id: string) => {
    const movie = catalogRef.current.movies.find((item) => item.id === id);
    if (movie) return movie;

    const loadedEpisode = catalogRef.current.series
      .map((series) => findEpisodeInSeries(series, id))
      .find(Boolean);

    if (loadedEpisode) return loadedEpisode;

    const seriesId = episodeSeriesMapRef.current[id];
    if (!seriesId) return undefined;

    const loadedSeries = await ensureSeriesLoaded(seriesId);
    return findEpisodeInSeries(loadedSeries, id);
  }, [ensureSeriesLoaded]);

  useEffect(() => {
    let active = true;

    const bootstrapCatalog = async () => {
      if (catalog.isLoaded) {
        if (active) setIsBootstrapping(false);
        return;
      }

      if (isTvLiteMode) {
        await loadFromLocalPlaylist();
        if (active) setIsBootstrapping(false);
        return;
      }

      if (m3uUrl) {
        const loadedSavedUrl = await loadFromUrl(m3uUrl);
        if (loadedSavedUrl) {
          if (active) setIsBootstrapping(false);
          return;
        }
      }

      const loadedBundledPlaylist = await loadFromLocalPlaylist();
      if (!loadedBundledPlaylist) {
        await hydrateCatalogFromCache();
      }

      if (active) {
        setIsBootstrapping(false);
      }
    };

    void bootstrapCatalog();

    return () => {
      active = false;
    };
  }, [catalog.isLoaded, hydrateCatalogFromCache, loadFromLocalPlaylist, loadFromUrl, m3uUrl]);

  const toggleFavorite = useCallback((id: string) => {
    void updateUserData((prevUserData) => {
      const favs = prevUserData?.favorites || {};
      const nextFavorites: Record<string, number> = {};

      if (Array.isArray(favs)) {
        favs.forEach((favoriteId, index) => {
          nextFavorites[favoriteId] = Date.now() - (favs.length - index) * 1000;
        });
      } else {
        Object.assign(nextFavorites, favs);
      }

      if (nextFavorites[id]) {
        delete nextFavorites[id];
      } else {
        nextFavorites[id] = Date.now();
      }

      return { favorites: nextFavorites };
    });
  }, [updateUserData]);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const searchContent = useCallback((query: string) => {
    const normalizedQuery = query.toLowerCase();

    return {
      movies: catalog.movies.filter((movie) => (
        movie.title.toLowerCase().includes(normalizedQuery)
        || movie.group.toLowerCase().includes(normalizedQuery)
      )),
      series: catalog.series.filter((series) => (
        series.title.toLowerCase().includes(normalizedQuery)
        || series.group.toLowerCase().includes(normalizedQuery)
      )),
    };
  }, [catalog.movies, catalog.series]);

  return (
    <ContentContext.Provider
      value={{
        catalog,
        isLoading,
        isBootstrapping,
        error,
        loadFromUrl,
        loadFromText,
        loadFromZipBuffer,
        favorites,
        orderedFavorites,
        toggleFavorite,
        isFavorite,
        searchContent,
        getMovieById,
        getSeriesById,
        ensureSeriesLoaded,
        resolveContentById,
        m3uUrl,
        isTvLiteMode,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}
