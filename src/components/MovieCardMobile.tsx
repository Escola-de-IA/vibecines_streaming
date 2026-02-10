import { motion } from "framer-motion";
import { Play, Plus, ThumbsUp } from "lucide-react";
import { useState, useEffect } from "react";

interface MovieCardProps {
  title: string;
  image: string;
  year?: string;
  duration?: string;
  rating?: string;
  delay?: number;
  onPlay?: () => void;
}

const MovieCard = ({
  title,
  image,
  year,
  duration,
  rating,
  delay = 0,
  onPlay,
}: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 📱 MOBILE: Click direto reproduz
  const handleClick = () => {
    if (isMobile && onPlay) {
      onPlay();
    }
  };

  // 🖥️ DESKTOP: Hover mostra botões
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="relative group cursor-pointer"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* 📱 MOBILE: Indicador visual de que é clicável */}
        {isMobile && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground fill-current ml-1" />
            </div>
          </div>
        )}

        {/* 🖥️ DESKTOP: Overlay com botões ao passar mouse */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent flex flex-col justify-end p-4"
          >
            <h3 className="font-bold text-foreground text-sm mb-1 line-clamp-2">
              {title}
            </h3>

            {(rating || year || duration) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                {rating && (
                  <span className="text-green-500 font-semibold">
                    {rating}% Match
                  </span>
                )}
                {year && <span>{year}</span>}
                {duration && <span>{duration}</span>}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayClick}
                className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/80 transition-colors"
              >
                <Play className="w-4 h-4 text-background fill-current" />
              </button>

              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </button>

              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors"
              >
                <ThumbsUp className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Título visível no mobile (abaixo do card) */}
        {isMobile && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <h3 className="font-bold text-white text-xs line-clamp-1">
              {title}
            </h3>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MovieCard;