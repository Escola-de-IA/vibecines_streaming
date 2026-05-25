import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface CatalogLoadingProps {
  message?: string;
}

const LOADING_TEXTS = [
  'Lendo a lista salva...',
  'Montando o catálogo de filmes...',
  'Organizando as séries...',
  'Preparando as capas em segundo plano...',
] as const;

export function CatalogLoading({ message }: CatalogLoadingProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="px-4 md:px-6 py-8 md:py-12">
      <div className="rounded-2xl border border-border bg-card/70 p-8 md:p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <h2
          className="text-3xl md:text-4xl font-bold text-foreground"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
        >
          Aguarde
        </h2>
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          {message || 'Carregando o catálogo'}
        </p>
        <p
          key={textIndex}
          className="mt-1 text-xs md:text-sm text-muted-foreground/80 animate-in fade-in duration-500"
        >
          {LOADING_TEXTS[textIndex]}
        </p>
      </div>
    </div>
  );
}
