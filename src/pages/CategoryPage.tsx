import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import MovieCard from "@/components/MovieCard";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import AdminPanel from "@/components/AdminPanel";

const CategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { items, currentGrupo, selectGrupo } = useContent();

  const [playerMovie, setPlayerMovie] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const decodedCategory = decodeURIComponent(category || "");

  // Filtrar conteúdos da categoria
  const filtered = items.filter(
    (item) => item.category === decodedCategory
  );

  const handlePlay = (movie: { url: string; title: string }) => {
    setPlayerMovie(movie);
  };

  // Carregar grupo correto se ainda não estiver carregado
  useEffect(() => {
    if (!currentGrupo) {
      // Determinar grupo baseado na categoria (você pode ajustar essa lógica)
      selectGrupo('filmes');
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
            <h1 className="text-3xl font-bold mb-2">{decodedCategory}</h1>
            <p className="text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'item encontrado' : 'itens encontrados'}
            </p>
          </div>

          {/* Grid de conteúdo */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum conteúdo encontrado nesta categoria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((item, index) => (
                <MovieCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  year=""
                  duration=""
                  rating=""
                  delay={index * 0.03}
                  onPlay={() => handlePlay({ url: item.url, title: item.title })}
                />
              ))}
            </div>
          )}
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

export default CategoryPage;