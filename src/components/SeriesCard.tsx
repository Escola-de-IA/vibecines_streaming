import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EnrichedSeries } from "@/contexts/ContentContext";

interface SeriesCardProps {
  series: EnrichedSeries;
  delay?: number;
}

const SeriesCard = ({ series, delay = 0 }: SeriesCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/series/${encodeURIComponent(series.normalizedName)}`);
  };

  // Usar poster do TMDb se disponÃ­vel, senÃ£o usar primeira imagem dos episÃ³dios
  const posterUrl = series.poster || series.episodes[0]?.image || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group relative cursor-pointer"
      onClick={handleClick}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-secondary">
        <img
          src={posterUrl}
          alt={series.seriesName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="mb-2 line-clamp-2 text-sm font-bold text-white">
              {series.seriesName}
            </h3>

            <div className="mb-2 flex items-center gap-2 text-xs text-gray-300">
              <span>{series.totalSeasons} temporada{series.totalSeasons > 1 ? "s" : ""}</span>
              <span>â€¢</span>
              <span>{series.totalEpisodes} episÃ³dios</span>
            </div>

            {series.rating && (
              <div className="mb-3 flex items-center gap-1 text-xs">
                <span className="text-green-400">â˜…</span>
                <span className="text-white">{series.rating.toFixed(1)}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-white text-xs font-semibold text-black transition-colors hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Play className="h-3 w-3 fill-current" />
                Assistir
              </button>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/40 transition-colors hover:border-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Badge com nÃºmero de temporadas */}
        <div className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          {series.totalSeasons} Temp.
        </div>
      </div>

      {/* Title below (visible always) */}
      <div className="mt-2 px-1">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">
          {series.seriesName}
        </h3>
        <p className="text-xs text-muted-foreground">
          {series.totalEpisodes} episÃ³dios
        </p>
      </div>
    </motion.div>
  );
};

export default SeriesCard;