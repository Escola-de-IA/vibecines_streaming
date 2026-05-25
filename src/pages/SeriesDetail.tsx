import { useParams, useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { useProfile } from '@/contexts/ProfileContext';
import { ArrowLeft, CheckCircle2, Heart, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resolveEpisodeDisplayTitle } from '@/utils/episode-title';
import { isTmdbEnhancementEnabled } from '@/lib/runtime-config';
import { fetchTmdbPoster, fetchTmdbSeasonEpisodeNames } from '@/utils/tmdb';

const SeriesDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getSeriesById,
    toggleFavorite,
    isFavorite,
    isBootstrapping,
    isLoading,
    catalog,
    ensureSeriesLoaded,
  } = useContent();
  const { userData } = useProfile();

  const series = id ? getSeriesById(id) : undefined;
  const seasons = series ? Object.keys(series.seasons).map(Number).sort((a, b) => a - b) : [];
  const firstSeason = seasons[0] || 1;
  const seriesTitle = series?.title;
  const [activeSeason, setActiveSeason] = useState(firstSeason);
  const [tmdbPoster, setTmdbPoster] = useState<string | null>(null);
  const [tmdbEpisodeNames, setTmdbEpisodeNames] = useState<Record<number, string>>({});
  const [isLoadingSeriesDetail, setIsLoadingSeriesDetail] = useState(false);

  useEffect(() => {
    setActiveSeason(firstSeason);
  }, [firstSeason, series?.id]);

  useEffect(() => {
    let active = true;

    const loadSeriesDetail = async () => {
      if (!id || !series?.detailPath || series.isDetailLoaded) {
        if (active) setIsLoadingSeriesDetail(false);
        return;
      }

      setIsLoadingSeriesDetail(true);
      await ensureSeriesLoaded(id);

      if (active) setIsLoadingSeriesDetail(false);
    };

    void loadSeriesDetail();

    return () => {
      active = false;
    };
  }, [ensureSeriesLoaded, id, series?.detailPath, series?.isDetailLoaded]);

  useEffect(() => {
    if (!seriesTitle || !isTmdbEnhancementEnabled) return;

    const controller = new AbortController();

    const loadPoster = async () => {
      try {
        const poster = await fetchTmdbPoster(seriesTitle, 'tv', controller.signal);
        if (!controller.signal.aborted && poster) {
          setTmdbPoster(poster);
        }
      } catch {
        // Poster enrichment is optional; the IPTV list remains the source of truth.
      }
    };

    void loadPoster();
    return () => controller.abort();
  }, [series?.id, seriesTitle]);

  useEffect(() => {
    if (!seriesTitle || !isTmdbEnhancementEnabled) {
      setTmdbEpisodeNames({});
      return undefined;
    }

    const controller = new AbortController();

    const loadEpisodeNames = async () => {
      try {
        const episodeNames = await fetchTmdbSeasonEpisodeNames(seriesTitle, activeSeason, controller.signal);
        if (!controller.signal.aborted) {
          setTmdbEpisodeNames(episodeNames);
        }
      } catch {
        if (!controller.signal.aborted) {
          setTmdbEpisodeNames({});
        }
      }
    };

    setTmdbEpisodeNames({});
    void loadEpisodeNames();
    return () => controller.abort();
  }, [activeSeason, series?.id, seriesTitle]);

  if (isBootstrapping || (isLoading && !catalog.isLoaded) || isLoadingSeriesDetail) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Serie nao encontrada</p>
          <button onClick={() => navigate('/')} className="text-primary hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const episodes = series.seasons[activeSeason] || [];
  const fav = isFavorite(series.id);
  const watchedCount = Object.values(series.seasons)
    .flat()
    .filter((ep) => userData?.watched?.includes(ep.id)).length;

  const resolvedSeriesPoster = tmdbPoster || series.logo;

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-24 md:pb-12">
      <div className="container mx-auto px-4">
        <button onClick={() => navigate(-1)} className="text-foreground/70 hover:text-foreground mb-4 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="w-full md:w-56 aspect-[2/3] rounded-xl overflow-hidden bg-secondary flex-shrink-0">
              {resolvedSeriesPoster ? (
                <img src={resolvedSeriesPoster} alt={series.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary to-muted" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {series.title}
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {series.group} | {seasons.length} temporada{seasons.length > 1 ? 's' : ''} | {watchedCount} ep. assistidos
              </p>

              <button
                onClick={() => toggleFavorite(series.id)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary transition-colors"
              >
                <Heart className={`w-4 h-4 ${fav ? 'fill-primary text-primary' : ''}`} />
                {fav ? 'Nos Favoritos' : 'Favoritar'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {seasons.map((season) => (
            <button
              key={season}
              onClick={() => setActiveSeason(season)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSeason === season ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/70 hover:text-foreground'
              }`}
            >
              Temporada {season}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {episodes.map((episode, index) => {
            const watched = userData?.watched?.includes(episode.id);
            const episodeNumber = episode.episodeNumber || index + 1;
            const displayEpisodeName = resolveEpisodeDisplayTitle(series.title, episode, {
              tmdbName: tmdbEpisodeNames[episodeNumber],
              index,
            });

            return (
              <button
                key={episode.id}
                onClick={() => navigate(`/watch/${episode.id}`)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-colors text-left group focus:outline-none ${watched ? 'bg-card/60 border border-primary/20' : 'bg-card hover:bg-secondary focus:bg-secondary border border-border/60'}`}
              >
                <div className="w-20 sm:w-24 aspect-video rounded-md overflow-hidden bg-secondary flex-shrink-0">
                  {resolvedSeriesPoster || episode.logo ? (
                    <img src={resolvedSeriesPoster || episode.logo} alt={episode.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground">EP</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    T{activeSeason} | E{episodeNumber}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {displayEpisodeName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{series.title}</p>
                </div>
                {watched ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <Play className="w-5 h-5 text-muted-foreground group-hover:text-primary group-focus:text-primary transition-colors flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailPage;
