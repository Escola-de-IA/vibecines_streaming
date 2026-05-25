import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type SyntheticEvent,
  type TouchEvent,
} from 'react';
import heroBg from '@/assets/herobg.jpg';
import { Play, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { ContentItem } from '@/types/content';
import { cn } from '@/lib/utils';
import { getAppAssetPath } from '@/lib/app-path';
import { isTmdbEnhancementEnabled } from '@/lib/runtime-config';
import { fetchTmdbPoster } from '@/utils/tmdb';

const BRAND_LOGO_PATH = getAppAssetPath('logo.png');
const MAX_FEATURED_ITEMS = 5;
const SWIPE_THRESHOLD = 48;
const MAX_DRAG_OFFSET = 72;

interface SpotlightMetadata {
  poster?: string;
}

interface SwipeState {
  startX: number;
  startY: number;
  deltaX: number;
  isTracking: boolean;
}

function getFallbackMetadata(group?: string): string[] {
  if (!group) return [];

  return group
    .split(/[|,/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function pickFeaturedMovies(movies: ContentItem[], limit = MAX_FEATURED_ITEMS): ContentItem[] {
  const moviesWithPosters = movies.filter((movie) => typeof movie.logo === 'string' && movie.logo.trim().length > 0);
  if (moviesWithPosters.length <= limit) return shuffleArray(moviesWithPosters);

  const shuffledMovies = shuffleArray(moviesWithPosters);
  const moviesByGroup = new Map<string, ContentItem[]>();

  shuffledMovies.forEach((movie) => {
    const key = movie.group?.trim().toLowerCase() || 'sem-categoria';
    if (!moviesByGroup.has(key)) {
      moviesByGroup.set(key, []);
    }
    moviesByGroup.get(key)!.push(movie);
  });

  const featured: ContentItem[] = [];
  const usedIds = new Set<string>();

  shuffleArray([...moviesByGroup.values()]).forEach((groupMovies) => {
    const candidate = groupMovies[0];
    if (!candidate || usedIds.has(candidate.id) || featured.length >= limit) return;
    usedIds.add(candidate.id);
    featured.push(candidate);
  });

  shuffledMovies.forEach((movie) => {
    if (usedIds.has(movie.id) || featured.length >= limit) return;
    usedIds.add(movie.id);
    featured.push(movie);
  });

  return featured.slice(0, limit);
}

export function DashboardHero() {
  const { catalog, toggleFavorite, isFavorite } = useContent();
  const navigate = useNavigate();
  const [spotlightMetadata, setSpotlightMetadata] = useState<Record<string, SpotlightMetadata>>({});
  const [dragOffset, setDragOffset] = useState(0);
  const swipeStateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    deltaX: 0,
    isTracking: false,
  });
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

  const featured = useMemo(() => pickFeaturedMovies(catalog.movies), [catalog.movies]);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    setCurrentIdx((prev) => {
      if (featured.length === 0) return 0;
      return prev % featured.length;
    });
  }, [featured.length]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % featured.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  useEffect(() => {
    if (!isTmdbEnhancementEnabled || featured.length === 0) return;

    const controller = new AbortController();

    const loadPosters = async () => {
      const targets = featured.filter((item) => !spotlightMetadata[item.id]);
      if (targets.length === 0) return;

      const fetchedPosters = await Promise.all(
        targets.map(async (item) => {
          try {
            const poster = await fetchTmdbPoster(item.title, 'movie', controller.signal);
            return [item.id, poster ? { poster } : null] as const;
          } catch {
            return [item.id, null] as const;
          }
        }),
      );

      if (controller.signal.aborted) return;

      setSpotlightMetadata((prev) => {
        const next = { ...prev };
        let updated = false;

        fetchedPosters.forEach(([id, metadata]) => {
          if (!metadata) return;
          next[id] = metadata;
          updated = true;
        });

        return updated ? next : prev;
      });
    };

    void loadPosters();

    return () => controller.abort();
  }, [featured, spotlightMetadata]);

  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  const current = featured[currentIdx];

  if (!current) {
    const fallback = catalog.movies.find((movie) => typeof movie.logo === 'string' && movie.logo.trim().length > 0);
    if (!fallback) return null;
    return <FallbackHero item={fallback} />;
  }

  const goToPreviousSlide = () => {
    if (featured.length <= 1) return;
    setCurrentIdx((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const goToNextSlide = () => {
    if (featured.length <= 1) return;
    setCurrentIdx((prev) => (prev + 1) % featured.length);
  };

  const handlePlayCurrent = () => {
    navigate(`/watch/${current.id}`);
  };

  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const armClickSuppression = () => {
    suppressClickRef.current = true;

    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 250);
  };

  const handleCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    handlePlayCurrent();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      isTracking: true,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!swipeStateRef.current.isTracking) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStateRef.current.startX;
    const deltaY = touch.clientY - swipeStateRef.current.startY;

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      swipeStateRef.current.deltaX = 0;
      setDragOffset(0);
      return;
    }

    event.preventDefault();
    swipeStateRef.current.deltaX = deltaX;
    setDragOffset(Math.max(-MAX_DRAG_OFFSET, Math.min(MAX_DRAG_OFFSET, deltaX)));
  };

  const resetSwipeState = () => {
    swipeStateRef.current = {
      startX: 0,
      startY: 0,
      deltaX: 0,
      isTracking: false,
    };
    setDragOffset(0);
  };

  const handleTouchEnd = () => {
    if (!swipeStateRef.current.isTracking) return;

    const { deltaX } = swipeStateRef.current;

    if (deltaX <= -SWIPE_THRESHOLD) {
      armClickSuppression();
      goToNextSlide();
    } else if (deltaX >= SWIPE_THRESHOLD) {
      armClickSuppression();
      goToPreviousSlide();
    }

    resetSwipeState();
  };

  const fav = isFavorite(current.id);
  const currentMetadata = spotlightMetadata[current.id];
  const metadataItems = getFallbackMetadata(current.group).slice(0, 4);

  return (
    <section className="relative">
      <div className="relative mx-auto w-full max-w-[640px] md:px-14">
        {featured.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPreviousSlide}
              className="absolute left-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 shadow-[0_12px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-black/65 md:flex"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNextSlide}
              className="absolute right-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 shadow-[0_12px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:bg-black/65 md:flex"
              aria-label="Proximo slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div
          className="relative aspect-[2/3] cursor-pointer select-none overflow-hidden rounded-[32px] border border-white/15 bg-[#102416] shadow-[0_24px_70px_rgba(0,0,0,0.45)] touch-pan-y"
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handlePlayCurrent();
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
          aria-label={`Assistir ${current.title}`}
        >
          {featured.map((item, idx) => {
            const poster = spotlightMetadata[item.id]?.poster || item.logo || heroBg;

            return (
              <div
                key={item.id}
                className="absolute inset-0 transition-[opacity,transform] duration-300 md:duration-500"
                style={{
                  opacity: idx === currentIdx ? 1 : 0,
                  transform: idx === currentIdx ? `translateX(${dragOffset}px)` : 'translateX(0px)',
                }}
              >
                <img
                  src={poster}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-xl"
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-[#0d2014]/70" />
                <img
                  src={poster}
                  alt={item.title}
                  className="relative z-10 h-full w-full object-contain object-center"
                />
              </div>
            );
          })}

          <div className="absolute inset-0 bg-gradient-to-t from-[#07130c] via-[#07130c]/12 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 h-[40%] bg-gradient-to-t from-[#07130c]/96 via-[#07130c]/72 to-transparent" />

          <div className="absolute left-4 top-4 z-30 md:left-6 md:top-6" onClick={stopPropagation}>
            <div className="flex h-16 w-16 items-center justify-center md:h-20 md:w-20">
              <img
                src={BRAND_LOGO_PATH}
                alt="Logo do site"
                className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-30 p-5 md:p-7">
            <div className="mx-auto max-w-[92%] text-center">
              <h1
                className="text-4xl font-bold uppercase leading-[0.95] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:text-5xl md:text-[3.4rem]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}
              >
                {current.title}
              </h1>

              {metadataItems.length > 0 && (
                <p className="mt-3 text-sm font-medium text-white/82 sm:text-base md:text-lg">
                  {metadataItems.join(' | ')}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    stopPropagation(event);
                    handlePlayCurrent();
                  }}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-base font-semibold text-black transition-transform hover:scale-[1.01] md:min-h-16 md:text-lg"
                >
                  <Play className="h-5 w-5 fill-current md:h-6 md:w-6" />
                  Assistir
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    stopPropagation(event);
                    toggleFavorite(current.id);
                  }}
                  className={cn(
                    'inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-base font-semibold text-white backdrop-blur-md transition-colors md:min-h-16 md:text-lg',
                    fav
                      ? 'border-white/30 bg-white/24'
                      : 'border-white/15 bg-white/12 hover:bg-white/20',
                  )}
                >
                  <Heart className={cn('h-5 w-5 md:h-6 md:w-6', fav && 'fill-white')} />
                  Meus favoritos
                </button>
              </div>

              {featured.length > 1 && (
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  {featured.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(event) => {
                        stopPropagation(event);
                        setCurrentIdx(idx);
                      }}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-500',
                        idx === currentIdx ? 'w-12 bg-white' : 'w-4 bg-white/35',
                      )}
                      aria-label={`Ir para o slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FallbackHero({ item }: { item: ContentItem }) {
  const navigate = useNavigate();

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[500px]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[32px] border border-white/15 bg-[#102416] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <img
            src={item.logo || heroBg}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-35 blur-xl"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[#0d2014]/70" />
          <img
            src={item.logo || heroBg}
            alt={item.title}
            className="relative z-10 h-full w-full object-contain object-center"
          />

          <div className="absolute inset-x-0 bottom-0 z-20 h-[40%] bg-gradient-to-t from-[#07130c]/96 via-[#07130c]/72 to-transparent" />

          <div className="absolute left-4 top-4 z-30 md:left-6 md:top-6">
            <div className="flex h-16 w-16 items-center justify-center md:h-20 md:w-20">
              <img
                src={BRAND_LOGO_PATH}
                alt="Logo do site"
                className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-30 p-5 md:p-7">
            <div className="mx-auto max-w-[92%] text-center">
              <h1
                className="text-4xl font-bold uppercase text-white sm:text-5xl md:text-6xl"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}
              >
                {item.title}
              </h1>

              <button
                type="button"
                onClick={() => navigate(`/watch/${item.id}`)}
                className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black transition-transform hover:scale-[1.01]"
              >
                <Play className="h-5 w-5 fill-current" />
                Assistir
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
