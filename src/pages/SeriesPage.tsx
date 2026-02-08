import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import SeriesCard from "@/components/SeriesCard";
import Footer from "@/components/Footer";
import AdminPanel from "@/components/AdminPanel";
import { groupEpisodesBySeries } from "@/utils/seriesParser";

const SeriesPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { items, currentGrupo, selectGrupo } = useContent();
  
  const [showAdmin, setShowAdmin] = useState(false);

  // Filtrar apenas séries e agrupar
  const seriesItems = items.filter(item => item.source === 'series');
  const groupedSeries = groupEpisodesBySeries(seriesItems);

  // Garantir que o grupo de séries está carregado
  useEffect(() => {
    if (!currentGrupo || currentGrupo !== 'series') {
      selectGrupo('series');
    }
  }, [currentGrupo, selectGrupo]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onOpenAdmin={() => setShowAdmin(true)} />
      
      <div className="pt-20 px-4 pb-12">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-primary hover:underline mb-4"
            >
              ← Voltar
            </button>
            <h1 className="text-3xl font-bold mb-2">Séries</h1>
            <p className="text-muted-foreground">
              {groupedSeries.length} {groupedSeries.length === 1 ? 'série disponível' : 'séries disponíveis'}
            </p>
          </div>

          {/* Grid de séries */}
          {groupedSeries.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground text-lg">
                Carregando séries...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {groupedSeries.map((series, index) => (
                <SeriesCard
                  key={series.normalizedName}
                  series={{
                    ...series,
                    poster: series.episodes[0]?.image || '',
                    backdrop: series.episodes[0]?.image || '',
                    overview: '',
                    firstAirDate: '',
                    rating: 0,
                    tmdbId: null
                  }}
                  delay={index * 0.03}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Admin Panel */}
      {showAdmin && isAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

export default SeriesPage;