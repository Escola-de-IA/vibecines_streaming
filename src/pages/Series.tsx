import { Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ContentCard } from '@/components/ContentCard';
import { ContentRow } from '@/components/ContentRow';
import { CatalogLoading } from '@/components/CatalogLoading';
import { useContent } from '@/contexts/ContentContext';
import { useIncrementalCount } from '@/hooks/useIncrementalCount';
import { isTvLiteMode, webOsRowLimit } from '@/lib/runtime-config';
import { useTmdbPosters } from '@/hooks/useTmdbPosters';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SeriesPage = () => {
  const { catalog, isBootstrapping, isLoading } = useContent();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedCategory = params.get('cat');
  const [seriesSearch, setSeriesSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const seriesByGroupMap = useMemo(() => {
    const map = new Map<string, typeof catalog.series>();

    catalog.series.forEach((series) => {
      if (!map.has(series.group)) map.set(series.group, []);
      map.get(series.group)?.push(series);
    });

    return map;
  }, [catalog.series]);

  const seriesByGroup = useMemo(
    () => catalog.groups
      .map((group) => [group, seriesByGroupMap.get(group) || []] as const)
      .filter(([, series]) => series.length > 0),
    [catalog.groups, seriesByGroupMap],
  );

  const hasValidSelectedCategory = useMemo(
    () => Boolean(selectedCategory) && seriesByGroupMap.has(selectedCategory),
    [selectedCategory, seriesByGroupMap],
  );

  const activeCategory = hasValidSelectedCategory ? selectedCategory : null;

  const categorySeries = useMemo(() => {
    const baseList = seriesByGroupMap.get(activeCategory || '') || [];
    const query = seriesSearch.trim().toLowerCase();

    if (!query) return baseList;
    return baseList.filter((series) => series.title.toLowerCase().includes(query));
  }, [activeCategory, seriesByGroupMap, seriesSearch]);

  const categoryPosterBatchSize = isTvLiteMode ? webOsRowLimit : 24;
  const { count: visibleCategorySeriesCount, sentinelRef: seriesPosterSentinelRef } = useIncrementalCount(
    categorySeries.length,
    {
      enabled: Boolean(activeCategory),
      initialCount: categoryPosterBatchSize,
      step: categoryPosterBatchSize,
    },
  );

  useEffect(() => {
    if (!isTvLiteMode || !selectedCategory || hasValidSelectedCategory) return;
    navigate('/series', { replace: true });
  }, [hasValidSelectedCategory, navigate, selectedCategory]);

  const filteredGroups = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return seriesByGroup;

    return seriesByGroup
      .map(([group, series]) => [
        group,
        series.filter((item) => item.title.toLowerCase().includes(query) || group.toLowerCase().includes(query)),
      ] as const)
      .filter(([, series]) => series.length > 0);
  }, [categorySearch, seriesByGroup]);

  const posterTargetSeries = useMemo(() => {
    if (activeCategory) return categorySeries.slice(0, visibleCategorySeriesCount);

    const rowLimit = isTvLiteMode ? webOsRowLimit : 12;
    const flattened = filteredGroups
      .flatMap(([, series]) => series.slice(0, rowLimit))
      .slice(0, 600);

    const unique = new Map(flattened.map((item) => [item.id, item]));
    return [...unique.values()];
  }, [activeCategory, categorySeries, filteredGroups, visibleCategorySeriesCount]);
  const visibleCategorySeries = useMemo(
    () => (activeCategory ? categorySeries.slice(0, visibleCategorySeriesCount) : []),
    [activeCategory, categorySeries, visibleCategorySeriesCount],
  );

  const seriesPosterTargetsForTmdb = useMemo(
    () => posterTargetSeries.map((series) => ({ id: series.id, title: series.title, type: 'tv' as const })),
    [posterTargetSeries],
  );

  const tmdbSeriesPosters = useTmdbPosters(
    seriesPosterTargetsForTmdb,
    { batchSize: 20, delayMs: 200 },
  );

  if (isBootstrapping || (isLoading && !catalog.isLoaded)) {
    return <CatalogLoading message="Atualizando catálogo" />;
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12">
      <div className="container mx-auto px-4 mb-6">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Séries
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeCategory ? `Categoria: ${activeCategory}` : `${catalog.series.length} séries disponíveis`}
        </p>
      </div>

      {activeCategory ? (
        <div className="container mx-auto px-4">
          <div className="mb-5 max-w-md">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Pesquisar nesta categoria</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={seriesSearch}
                onChange={(event) => setSeriesSearch(event.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Buscar série..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {visibleCategorySeries.map((series, index) => (
              <Fragment key={series.id}>
                <ContentCard
                  id={series.id}
                  title={series.title}
                  logo={tmdbSeriesPosters[series.id] || series.logo}
                  group={series.group}
                  type="series"
                />
                {index === visibleCategorySeries.length - 1 && visibleCategorySeriesCount < categorySeries.length && (
                  <div ref={seriesPosterSentinelRef} className="col-span-full h-px" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="container mx-auto px-4 mb-2 max-w-xl">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
              Pesquisar séries ou categorias
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Ex: drama, ação, netflix..."
              />
            </div>
          </div>

          {filteredGroups.map(([group, series]) => (
            <ContentRow
              key={group}
              title={group}
              items={series.map((item) => ({
                id: item.id,
                title: item.title,
                logo: tmdbSeriesPosters[item.id] || item.logo,
                group: item.group,
                type: 'series' as const,
              }))}
              limit={isTvLiteMode ? webOsRowLimit : 12}
              seeAllTo={`/series?cat=${encodeURIComponent(group)}`}
              showEndCard
            />
          ))}
        </>
      )}
    </div>
  );
};

export default SeriesPage;
