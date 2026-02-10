import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import MovieCard from "@/components/MovieCard";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import AdminPanel from "@/components/AdminPanel";

const MoviesPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { publishedMovies } = useContent();

  const [playerMovie, setPlayerMovie] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const [showAdmin, setShowAdmin] = useState(false);

  console.log("🎬 MoviesPage - Total de filmes:", publishedMovies.length);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 px-4 pb-12">
        <div className="container mx-auto">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:underline mb-4 flex items-center gap-2"
          >
            ← Voltar
          </button>

          <h1 className="text-3xl font-bold mb-6">Filmes</h1>

          {publishedMovies.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">
                Nenhum filme publicado ainda.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="text-primary hover:underline"
                >
                  Fazer upload de filmes
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {publishedMovies.map((movie, index) => (
                <MovieCard
                  key={movie.id}
                  title={movie.title}
                  image={movie.image || "https://via.placeholder.com/300x450?text=Sem+Imagem"}
                  year=""
                  duration=""
                  rating=""
                  delay={index * 0.03}
                  onPlay={() => {
                    console.log("▶️ Reproduzindo filme:", movie.title);
                    setPlayerMovie({ url: movie.url, title: movie.title });
                  }}
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
    </div>
  );
};

export default MoviesPage;