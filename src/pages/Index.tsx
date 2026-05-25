import { useMemo } from 'react';
import { DashboardHero } from '@/components/DashboardHero';
import { ContentRow } from '@/components/ContentRow';
import { StatsBar } from '@/components/StatsBar';
import { useContent } from '@/contexts/ContentContext';
import { useProfile } from '@/contexts/ProfileContext';
import { CatalogLoading } from '@/components/CatalogLoading';
import { isTvLiteMode, webOsHomeGroupLimit, webOsHomeSeriesLimit, webOsHomeTrendingLimit, webOsRowLimit } from '@/lib/runtime-config';
import { useTmdbPosters } from '@/hooks/useTmdbPosters';
import type { TMDBMediaType } from '@/utils/tmdb';

const SERIES_PRIORITY_TARGETS = [
  ['breaking bad'],
  ['la casa de papel', 'money heist'],
  ['reacher'],
  ['dark'],
  ['ozark'],
  ['stranger things'],
  ['narcos'],
  ['peaky blinders'],
  ['os originais', 'the originals'],
  ['mr robot', 'mr. robot'],
  ['arcanjo renegado'],
] as const;

function normalizeSeriesTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface HomeRowItem {
  id: string;
  title: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
}

interface ContinueWatchingTarget extends HomeRowItem {
  tmdbTitle: string;
  tmdbType: TMDBMediaType;
}

const Index = () => {
  const { catalog, orderedFavorites, isBootstrapping, isLoading } = useContent();
  const { userData } = useProfile();

  const homeSeries = useMemo(() => {
    const usedIds = new Set<string>();

    const prioritized = SERIES_PRIORITY_TARGETS
      .map((aliases) => {
        const normalizedAliases = aliases.map(normalizeSeriesTitle);
        return catalog.series.find((series) => {
          if (usedIds.has(series.id)) return false;
          const normalizedTitle = normalizeSeriesTitle(series.title);
          return normalizedAliases.some((alias) => normalizedTitle.includes(alias));
        });
      })
      .filter((series): series is typeof catalog.series[number] => {
        if (!series) return false;
        if (usedIds.has(series.id)) return false;
        usedIds.add(series.id);
        return true;
      });

    const remaining = catalog.series.filter((series) => !usedIds.has(series.id));
    return [...prioritized, ...remaining].slice(0, 20);
  }, [catalog.series]);

  const visibleHomeSeries = useMemo(
    () => homeSeries.slice(0, isTvLiteMode ? webOsHomeSeriesLimit : 20),
    [homeSeries],
  );

  const favoriteSeries = useMemo(() => {
    const result: typeof catalog.series = [];

    for (const id of orderedFavorites) {
      const series = catalog.series.find((item) => item.id === id);
      if (series) result.push(series);
      if (result.length >= 20) break;
    }

    return result;
  }, [catalog.series, orderedFavorites]);

  const seriesPosterTargetsForTmdb = useMemo(
    () => [...new Map(
      [...visibleHomeSeries, ...favoriteSeries].map((series) => [series.id, series]),
    ).values()]
      .slice(0, 40)
      .map((series) => ({ id: series.id, title: series.title, type: 'tv' as const })),
    [favoriteSeries, visibleHomeSeries],
  );

  const tmdbSeriesPosters = useTmdbPosters(seriesPosterTargetsForTmdb, {
    batchSize: 20,
    delayMs: 200,
  });

  const { movies4K, randomMovieGroups } = useMemo(() => {
    const groupedMovies = new Map<string, typeof catalog.movies>();

    catalog.movies.forEach((movie) => {
      if (!groupedMovies.has(movie.group)) groupedMovies.set(movie.group, []);
      groupedMovies.get(movie.group)?.push(movie);
    });

    let extracted4K: typeof catalog.movies = [];
    const groupKeys = [...groupedMovies.keys()];
    const key4K = groupKeys.find((key) => key.trim().toUpperCase() === '4K');

    if (key4K) {
      extracted4K = [...(groupedMovies.get(key4K) || [])].sort(() => Math.random() - 0.5);
      groupedMovies.delete(key4K);
    }

    const randomizedMoviesInGroups = [...groupedMovies.entries()]
      .filter(([group]) => group.trim().toLowerCase() !== 'sem categoria')
      .sort((a, b) => b[1].length - a[1].length)
      .map(([group, movies]) => [group, [...movies].sort(() => Math.random() - 0.5)] as const);

    return { movies4K: extracted4K, randomMovieGroups: randomizedMoviesInGroups };
  }, [catalog.movies]);

  const trending = useMemo(
    () => [...catalog.movies].sort(() => Math.random() - 0.5).slice(0, 20),
    [catalog.movies],
  );

  const visibleTrending = useMemo(
    () => trending.slice(0, isTvLiteMode ? webOsHomeTrendingLimit : 20),
    [trending],
  );

  const visibleMovieGroups = useMemo(
    () => randomMovieGroups.slice(0, isTvLiteMode ? webOsHomeGroupLimit : 15),
    [randomMovieGroups],
  );

  const favoriteMoviesForPosters = useMemo(() => {
    const favoriteIds = new Set(orderedFavorites);
    return catalog.movies.filter((movie) => favoriteIds.has(movie.id)).slice(0, 20);
  }, [catalog.movies, orderedFavorites]);

  const homeMoviePosterTargetsForTmdb = useMemo(() => {
    const rowLimit = isTvLiteMode ? webOsRowLimit : 12;
    const rowMovies = [
      ...visibleTrending,
      ...movies4K.slice(0, rowLimit),
      ...visibleMovieGroups.flatMap(([, movies]) => movies.slice(0, rowLimit)),
      ...favoriteMoviesForPosters,
    ];
    return [...new Map(rowMovies.map((movie) => [movie.id, movie])).values()]
      .slice(0, 700)
      .map((movie) => ({ id: movie.id, title: movie.title, type: 'movie' as const }));
  }, [favoriteMoviesForPosters, movies4K, visibleMovieGroups, visibleTrending]);

  const tmdbMoviePosters = useTmdbPosters(homeMoviePosterTargetsForTmdb, {
    batchSize: 24,
    delayMs: 150,
  });

  const favItems = useMemo<HomeRowItem[]>(() => {
    const items: HomeRowItem[] = [];

    for (const id of orderedFavorites) {
      const movie = catalog.movies.find((item) => item.id === id);
      if (movie) {
        items.push({
          ...movie,
          logo: tmdbMoviePosters[movie.id] || movie.logo,
          type: 'movie',
        });
        continue;
      }

      const series = catalog.series.find((item) => item.id === id);
      if (series) {
        items.push({
          id: series.id,
          title: series.title,
          logo: tmdbSeriesPosters[series.id] || series.logo,
          group: series.group,
          type: 'series',
        });
      }

      if (items.length >= 20) break;
    }

    return items;
  }, [catalog.movies, catalog.series, orderedFavorites, tmdbMoviePosters, tmdbSeriesPosters]);

  const continueWatchingTargets = useMemo<ContinueWatchingTarget[]>(() => {
    if (!userData?.progress) return [];

    const items: ContinueWatchingTarget[] = [];
    const progressKeys = Object.keys(userData.progress).reverse();

    for (const id of progressKeys) {
      if (userData.watched?.includes(id)) continue;

      const progressSeconds = userData.progress[id];
      if (typeof progressSeconds !== 'number' || progressSeconds < 15) continue;

      const movie = catalog.movies.find((item) => item.id === id);
      if (movie) {
        items.push({
          id: movie.id,
          title: movie.title,
          logo: movie.logo,
          group: movie.group,
          type: 'movie',
          tmdbTitle: movie.title,
          tmdbType: 'movie',
        });
        if (items.length >= 10) break;
        continue;
      }

      let foundEpisode = false;

      for (const series of catalog.series) {
        for (const [seasonNumber, season] of Object.entries(series.seasons)) {
          const episode = season.find((item) => item.id === id);
          if (!episode) continue;

          items.push({
            id: episode.id,
            title: episode.title || `Episódio ${episode.episodeNumber || '?'}`,
            logo: tmdbSeriesPosters[series.id] || episode.logo || series.logo,
            group: `${series.title} · T${seasonNumber} E${episode.episodeNumber || '?'}`,
            type: 'movie', // Route episodes to the player instead of the series page.
            tmdbTitle: series.title,
            tmdbType: 'tv',
          });

          foundEpisode = true;
          break;
        }

        if (foundEpisode) break;
      }

      if (items.length >= 10) break;
    }

    return items;
  }, [userData?.progress, userData?.watched, catalog.movies, catalog.series, tmdbSeriesPosters]);

  const continueWatchingPosterTargetsForTmdb = useMemo(
    () => continueWatchingTargets.map((item) => ({
      id: item.id,
      title: item.tmdbTitle,
      type: item.tmdbType,
    })),
    [continueWatchingTargets],
  );

  const tmdbContinueWatchingPosters = useTmdbPosters(continueWatchingPosterTargetsForTmdb, {
    batchSize: 12,
    delayMs: 150,
  });

  const continueWatchingItems = useMemo<HomeRowItem[]>(
    () => continueWatchingTargets.map((item) => ({
      id: item.id,
      title: item.title,
      logo: tmdbContinueWatchingPosters[item.id] || item.logo,
      group: item.group,
      type: item.type,
    })),
    [continueWatchingTargets, tmdbContinueWatchingPosters],
  );

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
  }

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-b from-background via-background to-background/95">
      {catalog.isLoaded ? (
        <div className="px-4 md:px-6 pt-3">
          <DashboardHero />
        </div>
      ) : (
        <div className="px-4 md:px-6 pt-3">
          <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Faça a importação da sua lista M3U pelo menu para começar a preencher o catálogo.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 md:mt-6 space-y-5 md:space-y-6">
        {catalog.isLoaded && !isTvLiteMode && <StatsBar />}

        {continueWatchingItems.length > 0 && (
          <ContentRow
            title="continuar assistindo"
            items={continueWatchingItems}
            limit={isTvLiteMode ? webOsRowLimit : 10}
            isContinueWatching={true}
          />
        )}

        {favItems.length > 0 && (
          <ContentRow
            title="❤️ Meus Favoritos"
            items={favItems}
            limit={isTvLiteMode ? webOsRowLimit : 10}
            seeAllTo="/favorites"
            showEndCard
          />
        )}

        <ContentRow
          title="🔥 Em Alta"
          items={visibleTrending.map((movie) => ({
            ...movie,
            logo: tmdbMoviePosters[movie.id] || movie.logo,
            type: 'movie' as const,
          }))}
          limit={isTvLiteMode ? webOsRowLimit : 12}
        />

        {catalog.series.length > 0 && (
          <ContentRow
            title="📺 Séries"
            items={visibleHomeSeries.map((series) => ({
              id: series.id,
              title: series.title,
              logo: tmdbSeriesPosters[series.id] || series.logo,
              group: series.group,
              type: 'series' as const,
            }))}
            seeAllTo="/series"
            limit={isTvLiteMode ? webOsRowLimit : 11}
            showEndCard
          />
        )}

        {movies4K.length > 0 && (
          <ContentRow
            title="4K"
            items={movies4K.slice(0, 20).map((movie) => ({
              ...movie,
              logo: tmdbMoviePosters[movie.id] || movie.logo,
              type: 'movie' as const,
            }))}
            seeAllTo={`/movies?cat=${encodeURIComponent('4K')}`}
            limit={isTvLiteMode ? webOsRowLimit : 12}
            showEndCard
          />
        )}

        {visibleMovieGroups.map(([group, movies]) => (
          <ContentRow
            key={group}
            title={group}
            items={movies.slice(0, 20).map((movie) => ({
              ...movie,
              logo: tmdbMoviePosters[movie.id] || movie.logo,
              type: 'movie' as const,
            }))}
            seeAllTo={`/movies?cat=${encodeURIComponent(group)}`}
            limit={isTvLiteMode ? webOsRowLimit : 12}
            showEndCard
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
