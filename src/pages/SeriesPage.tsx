import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Play, Info } from "lucide-react";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import SeriesCard from "@/components/SeriesCard";
import Footer from "@/components/Footer";
import AdminPanel from "@/components/AdminPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SeriesPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { publishedSeries, isLoading } = useContent();

  const [showAdmin, setShowAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterSeasons, setFilterSeasons] = useState("all");

  console.log("📺 SeriesPage - Total de séries:", publishedSeries.length);

  // Filtrar e ordenar séries
  const filteredSeries = useMemo(() => {
    let result = [...publishedSeries];

    // Busca
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((series) =>
        series.seriesName.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por temporadas
    if (filterSeasons !== "all") {
      const seasonsCount = parseInt(filterSeasons);
      result = result.filter((series) => {
        if (filterSeasons === "5+") return series.totalSeasons >= 5;
        return series.totalSeasons === seasonsCount;
      });
    }

    // Ordenação
    switch (sortBy) {
      case "title":
        result.sort((a, b) => a.seriesName.localeCompare(b.seriesName));
        break;
      case "episodes":
        result.sort((a, b) => b.totalEpisodes - a.totalEpisodes);
        break;
      case "recent":
      default:
        result.reverse(); // Mais recentes primeiro
        break;
    }

    return result;
  }, [publishedSeries, search, sortBy, filterSeasons]);

  // Hero series (primeira da lista)
  const heroSeries = filteredSeries[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Carregando séries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 📺 HERO SECTION */}
      {heroSeries && (
        <div className="relative h-[70vh] w-full">
          {/* Background */}
          <div className="absolute inset-0">
            <img
              src={
                heroSeries.backdrop ||
                heroSeries.poster ||
                heroSeries.episodes[0]?.image ||
                "https://via.placeholder.com/1920x1080"
              }
              alt={heroSeries.seriesName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full flex items-end pb-16">
            <div className="container mx-auto px-4 md:px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl"
              >
                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl">
                  {heroSeries.seriesName}
                </h1>

                {/* Info */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-white font-semibold">
                    {heroSeries.totalSeasons} Temporada
                    {heroSeries.totalSeasons > 1 ? "s" : ""}
                  </span>
                  <span className="text-gray-400">
                    {heroSeries.totalEpisodes} Episódios
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() =>
                      navigate(`/series/${encodeURIComponent(heroSeries.seriesName)}`)
                    }
                    size="lg"
                    className="bg-white text-black hover:bg-white/90 font-bold gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Assistir
                  </Button>

                  <Button
                    onClick={() =>
                      navigate(`/series/${encodeURIComponent(heroSeries.seriesName)}`)
                    }
                    size="lg"
                    variant="secondary"
                    className="bg-gray-500/70 text-white hover:bg-gray-500/50 font-bold gap-2"
                  >
                    <Info className="w-5 h-5" />
                    Mais Informações
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 SEARCH & FILTERS */}
      <div className="relative z-10 -mt-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar séries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>

              {/* Filter Seasons */}
              <Select value={filterSeasons} onValueChange={setFilterSeasons}>
                <SelectTrigger className="w-full md:w-48 bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Temporadas</SelectItem>
                  <SelectItem value="1">1 Temporada</SelectItem>
                  <SelectItem value="2">2 Temporadas</SelectItem>
                  <SelectItem value="3">3 Temporadas</SelectItem>
                  <SelectItem value="4">4 Temporadas</SelectItem>
                  <SelectItem value="5+">5+ Temporadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48 bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                  <SelectItem value="title">Ordem Alfabética</SelectItem>
                  <SelectItem value="rating">Melhor Avaliadas</SelectItem>
                  <SelectItem value="episodes">Mais Episódios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            {(search || filterSeasons !== "all") && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {filteredSeries.length} série{filteredSeries.length !== 1 ? "s" : ""} encontrada
                  {filteredSeries.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterSeasons("all");
                  }}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📚 SERIES GRID */}
      <div className="container mx-auto px-4 md:px-8 py-12">
        {filteredSeries.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white mb-4">
              {search || filterSeasons !== "all"
                ? "Nenhuma série encontrada"
                : "Nenhuma série disponível"}
            </h2>
            <p className="text-gray-400 mb-6">
              {search || filterSeasons !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Adicione séries pelo painel admin"}
            </p>
            {!search && filterSeasons === "all" && isAdmin && (
              <Button onClick={() => setShowAdmin(true)} size="lg">
                Abrir Painel Admin
              </Button>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">
              {search || filterSeasons !== "all" ? "Resultados da Busca" : "Todas as Séries"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredSeries.map((series, index) => (
                <motion.div
                  key={series.normalizedName}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                >
                  <SeriesCard series={series} delay={0} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SeriesPage;