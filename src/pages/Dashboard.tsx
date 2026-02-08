// 🎨 DASHBOARD - Interface com Scroll Infinito e Carregamento Progressivo

import { useEffect, useRef } from 'react';
import { useContent } from '@/contexts/ContentContext';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const {
    indexLoaded,
    indexVersion,
    grupos,
    currentGrupo,
    items,
    loadingIndex,
    loadingParte,
    hasMorePartes,
    selectGrupo,
    loadNextParte,
    stats
  } = useContent();

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /**
   * 🔍 Observer para scroll infinito
   */
  useEffect(() => {
    if (!sentinelRef.current || !hasMorePartes) return;

    // Criar observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loadingParte && hasMorePartes) {
          console.log('📜 [DASHBOARD] Sentinela visível, carregando próxima parte...');
          loadNextParte();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Trigger 200px antes do fim
        threshold: 0.1
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMorePartes, loadingParte, loadNextParte]);

  /**
   * 🔄 Loading states
   */
  if (loadingIndex) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando índice...</p>
        </div>
      </div>
    );
  }

  if (!indexLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar índice</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 📋 HEADER - Seleção de Grupos */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">StreamMax</h1>
              <p className="text-sm text-muted-foreground">
                Índice v{indexVersion}
              </p>
            </div>

            {/* 📊 Estatísticas */}
            {currentGrupo && (
              <div className="text-right text-sm text-muted-foreground">
                <p>Partes: {stats.partesCarregadas}</p>
                <p>Itens: {stats.totalItens.toLocaleString()}</p>
                <p>Cache: {stats.memoriaEmCache}</p>
              </div>
            )}
          </div>

          {/* 🎯 Seletor de Grupos */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {grupos.map(grupo => (
              <Button
                key={grupo.id}
                onClick={() => selectGrupo(grupo.id)}
                variant={currentGrupo === grupo.id ? 'default' : 'outline'}
                disabled={loadingParte}
                className="whitespace-nowrap"
              >
                {grupo.titulo}
                <span className="ml-2 text-xs opacity-70">
                  ({grupo.totalPartes} partes)
                </span>
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* 📦 CONTEÚDO PRINCIPAL */}
      <main ref={scrollRef} className="container mx-auto p-4">
        {/* Estado vazio - nenhum grupo selecionado */}
        {!currentGrupo && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Bem-vindo ao StreamMax</h2>
            <p className="text-muted-foreground mb-8">
              Selecione um grupo acima para começar
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {grupos.map(grupo => (
                <Button
                  key={grupo.id}
                  onClick={() => selectGrupo(grupo.id)}
                  variant="outline"
                  className="h-24 text-lg"
                >
                  {grupo.titulo}
                  <br />
                  <span className="text-sm opacity-70">
                    {grupo.totalPartes} partes disponíveis
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Grid de Conteúdo */}
        {currentGrupo && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item, index) => (
                <MovieCard
                  key={item.id}
                  title={item.title}
                  image={item.image}
                  year=""
                  duration=""
                  rating=""
                  delay={0}
                  onPlay={() => console.log('Play:', item.title)}
                />
              ))}
            </div>

            {/* 👁️ SENTINELA - Trigger para scroll infinito */}
            {hasMorePartes && (
              <div
                ref={sentinelRef}
                className="py-8 text-center"
              >
                {loadingParte ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      Carregando mais itens...
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Role para carregar mais
                  </p>
                )}
              </div>
            )}

            {/* ✅ Fim do conteúdo */}
            {!hasMorePartes && !loadingParte && (
              <div className="py-8 text-center text-muted-foreground">
                <p>✅ Todos os itens carregados</p>
                <p className="text-sm mt-2">
                  Total: {items.length.toLocaleString()} itens
                </p>
              </div>
            )}
          </>
        )}

        {/* Loading inicial de grupo */}
        {currentGrupo && items.length === 0 && loadingParte && (
          <div className="py-20 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando primeira parte...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;