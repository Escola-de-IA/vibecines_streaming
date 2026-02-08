import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import SeriesCard from "./SeriesCard";
import { EnrichedSeries } from "@/contexts/ContentContext";

interface SeriesRowProps {
  title: string;
  series: EnrichedSeries[];
}

const SeriesRow = ({ title, series }: SeriesRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (series.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center justify-between px-4 md:px-0">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      <div className="group relative">
        <button
          onClick={() => scroll("left")}
          className="absolute bottom-0 left-0 top-0 z-10 w-10 bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 scrollbar-hide md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {series.map((item, i) => (
            <div key={item.normalizedName} className="w-[160px] flex-shrink-0">
              <SeriesCard series={item} delay={i * 0.03} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Rolar para direita"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default SeriesRow;