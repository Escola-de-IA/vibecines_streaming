import { motion } from "framer-motion";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

interface FeaturedHeroProps {
  movie?: {
    title: string;
    image: string;
    url?: string;
    category?: string;
  } | null;
  onPlay?: () => void;
}

const FeaturedHero = ({ movie, onPlay }: FeaturedHeroProps) => {
  const [isMuted, setIsMuted] = useState(true);

  // 🎬 Usar dados do filme ou fallback para background genérico
  const backgroundImage = movie?.image || heroBg;
  const hasMovie = !!movie;

  return (
    <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            {/* 🎬 SÓ MOSTRA CONTEÚDO SE TIVER FILME */}
            {hasMovie ? (
              <>
                {/* Logo/Title */}
                <div className="mb-4">
                  <span className="text-primary font-bold text-sm tracking-wider uppercase">
                    {movie.category || "DESTAQUE"}
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight">
                  {movie.title}
                </h1>
                
                <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
                  <span className="text-green-500 font-semibold">Novo</span>
                  <span>2025</span>
                  <span className="border border-muted-foreground px-1 text-xs">HD</span>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={onPlay}
                    className="btn-primary-gradient text-primary-foreground h-12 px-8 font-semibold text-base gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Assistir
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="h-12 px-8 font-semibold text-base gap-2 bg-secondary/80 hover:bg-secondary"
                  >
                    <Info className="w-5 h-5" />
                    Mais Informações
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* 🎬 ESTADO VAZIO - Só mostra mensagem */}
                <div className="mb-4">
                  <span className="text-primary font-bold text-sm tracking-wider">
                    AGUARDANDO CONTEÚDO
                  </span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-extrabold text-foreground/60 mb-6 leading-tight">
                  Faça upload de uma playlist para começar
                </h1>

                <Button 
                  disabled
                  className="btn-primary-gradient text-primary-foreground h-12 px-8 font-semibold text-base gap-2 opacity-50 cursor-not-allowed"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Sem conteúdo disponível
                </Button>
              </>
            )}
          </motion.div>
        </div>

        {/* Mute Button - só mostra se tiver filme */}
        {hasMovie && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute right-4 md:right-8 bottom-32 w-10 h-10 rounded-full border border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-foreground" />
            )}
          </button>
        )}

        {/* Age Rating - só mostra se tiver filme */}
        {hasMovie && (
          <div className="absolute right-4 md:right-8 bottom-20 bg-secondary/80 px-4 py-1 border-l-2 border-foreground">
            <span className="text-foreground text-sm font-medium">HD</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedHero;