import { motion } from "framer-motion";
import { Play, Plus, ThumbsUp } from "lucide-react";
import { useState } from "react";

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

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
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/80 transition-colors"
            >
              <Play className="w-4 h-4 text-background fill-current" />
            </button>

            <button className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors">
              <Plus className="w-4 h-4 text-foreground" />
            </button>

            <button className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors">
              <ThumbsUp className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MovieCard;