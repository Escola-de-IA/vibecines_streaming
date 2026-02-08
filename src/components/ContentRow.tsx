import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard";

interface Movie {
  id: string;
  title: string;
  image: string;
  url?: string;
}

interface ContentRowProps {
  title: string;
  movies: Movie[];
  onPlay?: (movie: Movie) => void;
  seeAllHref?: string;
}

const ContentRow = ({ title, movies, onPlay, seeAllHref }: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  if (movies.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <h2 className="text-xl font-bold">{title}</h2>

        {seeAllHref && (
          <button
            onClick={() => navigate(seeAllHref)}
            className="text-sm text-primary hover:underline"
          >
            Ver tudo
          </button>
        )}
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background to-transparent opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-0"
        >
          {movies.map((movie, i) => (
            <div key={movie.id} className="w-[160px] flex-shrink-0">
              <MovieCard
                title={movie.title}
                image={movie.image}
                delay={i * 0.03}
                onPlay={() => onPlay?.(movie)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent opacity-0 group-hover:opacity-100"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default ContentRow;