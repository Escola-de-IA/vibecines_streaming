import { useMemo } from 'react';
import { Film, Tv, Heart, Layers } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';

function hasImage(logo?: string): boolean {
  return typeof logo === 'string' && logo.trim().length > 0;
}

export function StatsBar() {
  const { catalog, favorites } = useContent();

  const visibleMovies = useMemo(
    () => catalog.movies.filter((movie) => hasImage(movie.logo)),
    [catalog.movies],
  );

  const visibleSeries = useMemo(
    () => catalog.series.filter((series) => hasImage(series.logo)),
    [catalog.series],
  );

  const visibleIds = useMemo(
    () => new Set([...visibleMovies.map((movie) => movie.id), ...visibleSeries.map((series) => series.id)]),
    [visibleMovies, visibleSeries],
  );

  const visibleGroups = useMemo(
    () => new Set([...visibleMovies.map((movie) => movie.group), ...visibleSeries.map((series) => series.group)]),
    [visibleMovies, visibleSeries],
  );

  const stats = useMemo(() => [
    { label: 'Favoritos', value: [...favorites].filter((id) => visibleIds.has(id)).length, icon: Heart, color: 'text-pink-400' },
    { label: 'Filmes', value: visibleMovies.length, icon: Film, color: 'text-primary' },
    { label: 'Séries', value: visibleSeries.length, icon: Tv, color: 'text-blue-400' },
    { label: 'Categorias', value: visibleGroups.size, icon: Layers, color: 'text-emerald-400' },
  ], [favorites, visibleGroups.size, visibleIds, visibleMovies.length, visibleSeries.length]);

  return (
    <div className="px-4 md:px-6">
      <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 md:min-h-[96px] md:p-5">
            <div className={`rounded-lg bg-secondary p-2.5 ${stat.color}`}>
              <stat.icon className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-foreground md:text-xl">{stat.value.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground md:text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
