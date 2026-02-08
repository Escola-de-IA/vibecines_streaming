import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Plus, ThumbsUp, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import { groupEpisodesByseason } from "@/utils/seriesParser";
import { tmdb } from "@/services/tmdb";
import VideoPlayer from "@/components/VideoPlayer";
import DashboardHeader from "@/components/DashboardHeader";
import AdminPanel from "@/components/AdminPanel";
import Footer from "@/components/Footer";

const SeriesDetails = () => {
  const { seriesName } = useParams<{ seriesName: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { publishedSeries, enrichSeries } = useContent();

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [playerMovie, setPlayerMovie] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [isLoadingTMDb, setIsLoadingTMDb] = useState(false);

  // Encontrar a série
  const series = publishedSeries.find(
    (s) => s.normalizedName === decodeURIComponent(seriesName || "")
  );

  // Buscar dados do TMDb se ainda não tiver
  useEffect(() => {
    if (!series || series.tmdbId || isLoadingTMDb) return;

    const fetchTMDbData = async () => {
      setIsLoadingTMDb(true);
      try {
        const results = await tmdb.searchSeriesWithCache(series.seriesName);
        if (results.length > 0) {
          const seriesData = results[0];
          enrichSeries(series, {
            tmdbId: seriesData.id,
            poster: tmdb.getImageUrl(seriesData.poster_path),
            backdrop: tmdb.getBackdropUrl(seriesData.backdrop_path),
            overview: seriesData.overview,
            firstAirDate: seriesData.first_air_date,
            rating: seriesData.vote_average,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do TMDb:", error);
      } finally {
        setIsLoadingTMDb(false);
      }
    };

    fetchTMDbData();
  }, [series, enrichSeries, isLoadingTMDb]);

  if (!series) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader onOpenAdmin={() => setShowAdmin(true)} />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold">Série não encontrada</h2>
            <Button onClick={() => navigate("/")}>Voltar para o início</Button>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar episódios por temporada
  const seasonGroups = groupEpisodesByseason(series.episodes);
  const currentSeasonEpisodes =
    seasonGroups.find((s) => s.season === selectedSeason)?.episodes || [];

  const backdropUrl = series.backdrop || series.episodes[0]?.image || "";

  const handlePlayEpisode = (episode: any) => {
    setPlayerMovie({
      url: episode.url,
      title: `${series.seriesName} - S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")}${episode.episodeTitle ? ` - ${episode.episodeTitle}` : ""}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onOpenAdmin={() => setShowAdmin(true)} />

      {/* Hero Section */}
      <div className="relative h-[80vh] w-full overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full items-end pb-20">
          <div className="container mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <Button
                variant="ghost"
                onClick={() => navigate("/series")}
                className="mb-4 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>

              <h1 className="mb-4 text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
                {series.seriesName}
              </h1>

              <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                {series.rating && (
                  <span className="flex items-center gap-1 text-green-500 font-semibold">
                    ★ {series.rating.toFixed(1)}
                  </span>
                )}
                {series.firstAirDate && (
                  <span>{new Date(series.firstAirDate).getFullYear()}</span>
                )}
                <span>{series.totalSeasons} temporada{series.totalSeasons > 1 ? "s" : ""}</span>
                <span className="border border-muted-foreground px-1 text-xs">HD</span>
              </div>

              {series.overview && (
                <p className="mb-6 line-clamp-3 text-base text-muted-foreground md:text-lg">
                  {series.overview}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handlePlayEpisode(series.episodes[0])}
                  className="btn-primary-gradient h-12 gap-2 px-8 text-base font-semibold text-primary-foreground"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Assistir S01E01
                </Button>

                <Button
                  variant="secondary"
                  className="h-12 w-12 bg-secondary/80 hover:bg-secondary"
                >
                  <Plus className="h-5 w-5" />
                </Button>

                <Button
                  variant="secondary"
                  className="h-12 w-12 bg-secondary/80 hover:bg-secondary"
                >
                  <ThumbsUp className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-32 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-muted-foreground transition-colors hover:border-foreground md:right-8"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-foreground" />
            ) : (
              <Volume2 className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="relative z-10 -mt-20 pb-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Episódios</h2>

            {/* Season Selector */}
            <Select
              value={String(selectedSeason)}
              onValueChange={(value) => setSelectedSeason(Number(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a temporada" />
              </SelectTrigger>
              <SelectContent>
                {seasonGroups.map((season) => (
                  <SelectItem key={season.season} value={String(season.season)}>
                    Temporada {season.season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Episodes Grid */}
          <div className="space-y-3">
            {currentSeasonEpisodes.map((episode) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex cursor-pointer gap-4 rounded-lg bg-secondary/30 p-3 transition-all hover:bg-secondary/50"
                onClick={() => handlePlayEpisode(episode)}
              >
                {/* Episode Thumbnail */}
                <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                  <img
                    src={episode.image || backdropUrl}
                    alt={`Episódio ${episode.episode}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-8 w-8 fill-white text-white" />
                  </div>
                  <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold text-white">
                    {episode.episode}
                  </div>
                </div>

                {/* Episode Info */}
                <div className="flex flex-1 flex-col justify-center">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold">
                      {episode.episode}. {episode.episodeTitle || `Episódio ${episode.episode}`}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Temporada {episode.season} • Episódio {episode.episode}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Video Player */}
      {playerMovie && (
        <VideoPlayer
          url={playerMovie.url}
          title={playerMovie.title}
          onClose={() => setPlayerMovie(null)}
        />
      )}

      {/* Admin Panel */}
      {showAdmin && isAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

export default SeriesDetails;