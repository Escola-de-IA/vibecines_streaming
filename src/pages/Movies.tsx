import { Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ContentRow } from '@/components/ContentRow';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/contexts/ContentContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CatalogLoading } from '@/components/CatalogLoading';
import { useIncrementalCount } from '@/hooks/useIncrementalCount';
import { isTvLiteMode, webOsRowLimit } from '@/lib/runtime-config';
import { useTmdbPosters } from '@/hooks/useTmdbPosters';

const MoviesPage = () => {
  const { catalog, isBootstrapping, isLoading } = useContent();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedCategory = params.get('cat');
  const [movieSearch, setMovieSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const moviesByGroupMap = useMemo(() => {
    const map = new Map<string, typeof catalog.movies>();
    catalog.movies.forEach(movie => {
      if (!map.has(movie.group)) map.set(movie.group, []);
      map.get(movie.group)!.push(movie);
    });
    
    return map;
  }, [catalog.movies]);

  const moviesByGroup = useMemo(
    () => catalog.groups
      .map((group) => [group, moviesByGroupMap.get(group) || []] as const)
      .filter(([, movies]) => movies.length > 0),
    [catalog.groups, moviesByGroupMap]
  );

  const hasValidSelectedCategory = useMemo(
    () => !!selectedCategory && moviesByGroupMap.has(selectedCategory),
    [moviesByGroupMap, selectedCategory]
  );

  const activeCategory = hasValidSelectedCategory ? selectedCategory : null;

  const categoryMovies = useMemo(() => {
    const baseList = moviesByGroupMap.get(activeCategory || '') || [];
    const query = movieSearch.trim().toLowerCase();
    if (!query) return baseList;
    return baseList.filter(movie => movie.title.toLowerCase().includes(query));
  }, [activeCategory, movieSearch, moviesByGroupMap]);

  const categoryPosterBatchSize = isTvLiteMode ? webOsRowLimit : 24;
  const { count: visibleMoviePosterCount, sentinelRef: moviePosterSentinelRef } = useIncrementalCount(
    categoryMovies.length,
    {
      enabled: Boolean(activeCategory),
      initialCount: categoryPosterBatchSize,
      step: categoryPosterBatchSize,
    },
  );

  const moviePosterTargets = useMemo(
    () => (activeCategory ? categoryMovies.slice(0, visibleMoviePosterCount) : []),
    [activeCategory, categoryMovies, visibleMoviePosterCount],
  );
  const visibleCategoryMovies = useMemo(
    () => (activeCategory ? categoryMovies.slice(0, visibleMoviePosterCount) : []),
    [activeCategory, categoryMovies, visibleMoviePosterCount],
  );

  const filteredGroups = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return moviesByGroup;

    return moviesByGroup
      .map(([group, movies]) => [
        group,
        movies.filter(movie => movie.title.toLowerCase().includes(query) || group.toLowerCase().includes(query)),
      ] as const)
      .filter(([, movies]) => movies.length > 0);
  }, [moviesByGroup, categorySearch]);

  const overviewPosterTargets = useMemo(() => {
    if (activeCategory) return [];
    const rowLimit = isTvLiteMode ? webOsRowLimit : 12;
    const flattened = filteredGroups
      .flatMap(([, movies]) => movies.slice(0, rowLimit))
      .slice(0, 600);
    return [...new Map(flattened.map((movie) => [movie.id, movie])).values()];
  }, [activeCategory, filteredGroups]);

  const moviePosterTargetsForTmdb = useMemo(
    () => (activeCategory ? moviePosterTargets : overviewPosterTargets)
      .map((movie) => ({ id: movie.id, title: movie.title, type: 'movie' as const })),
    [activeCategory, moviePosterTargets, overviewPosterTargets],
  );

  const tmdbMoviePosters = useTmdbPosters(moviePosterTargetsForTmdb, {
    batchSize: 12,
    delayMs: 150,
  });

  useEffect(() => {
    if (!isTvLiteMode || !selectedCategory || hasValidSelectedCategory) return;
    navigate('/movies', { replace: true });
  }, [hasValidSelectedCategory, navigate, selectedCategory]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12">
      <div className="container mx-auto px-4 mb-6">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Filmes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeCategory ? `Categoria: ${activeCategory}` : `${catalog.movies.length} filmes disponíveis`}
        </p>
      </div>

      {activeCategory ? (
        <div className="container mx-auto px-4">
          <div className="mb-5 max-w-md">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar nesta categoria</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={movieSearch}
                onChange={e => setMovieSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Buscar filme..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {visibleCategoryMovies.map((movie, index) => (
              <Fragment key={movie.id}>
                <ContentCard
                  id={movie.id}
                  title={movie.title}
                  logo={tmdbMoviePosters[movie.id] || movie.logo}
                  group={movie.group}
                  type="movie"
                />
                {index === visibleCategoryMovies.length - 1 && visibleMoviePosterCount < categoryMovies.length && (
                  <div ref={moviePosterSentinelRef} className="col-span-full h-px" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="container mx-auto px-4 mb-2 max-w-xl">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar filmes ou categorias</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Ex: ação, amazon, vingadores..."
              />
            </div>
          </div>

          {filteredGroups.map(([group, movies]) => (
            <ContentRow
              key={group}
              title={group}
              items={movies.map(movie => ({
                ...movie,
                logo: tmdbMoviePosters[movie.id] || movie.logo,
                type: 'movie' as const,
              }))}
              limit={isTvLiteMode ? webOsRowLimit : 12}
              seeAllTo={`/movies?cat=${encodeURIComponent(group)}`}
              showEndCard
            />
          ))}
        </>
      )}
    </div>
  );
};

export default MoviesPage;
