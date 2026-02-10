// 🔍 DEBUG PANEL - Verificar status do sistema
// Cole este componente no Dashboard para ver o que está acontecendo

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";
import { RefreshCw, Database, AlertCircle, CheckCircle2, X } from "lucide-react";

export const FirebaseDebugPanel = () => {
  // ✅ USANDO AS PROPRIEDADES CORRETAS DO ContentContext
  const {
    publishedContent,
    previewContent,
    publishedMovies,
    publishedSeries,
    metadata,
    isLoading,
    isAutoSaving,
    lastSaved,
  } = useContent();

  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Estatísticas calculadas
  const totalPublished = publishedContent.length;
  const totalPreview = previewContent.length;
  const moviesCount = publishedMovies.length;
  const seriesCount = publishedSeries.length;
  const episodesCount = publishedContent.filter(i => i.source === 'series').length;

  const checkStatus = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log('🔍 [DEBUG] Status atual:', {
        publishedContent: totalPublished,
        previewContent: totalPreview,
        movies: moviesCount,
        series: seriesCount,
        episodes: episodesCount,
        metadata,
        isLoading,
        isAutoSaving,
        lastSaved,
      });
    }, 500);
  };

  const forceReload = () => {
    window.location.reload();
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border-2 border-primary rounded-lg p-4 shadow-2xl max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Database className="w-5 h-5" />
          Debug Panel
        </h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {/* CONTEÚDO PUBLICADO */}
        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            📊 Publicado:
          </div>
          <div className="pl-3 space-y-1 text-xs">
            <div>Total: <strong>{totalPublished}</strong> itens</div>
            <div>🎬 Filmes: <strong>{moviesCount}</strong></div>
            <div>📺 Séries: <strong>{seriesCount}</strong></div>
            <div>📺 Episódios: <strong>{episodesCount}</strong></div>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1">📋 Preview:</div>
          <div className="pl-3 space-y-1 text-xs">
            <div>Total: <strong>{totalPreview}</strong> itens</div>
            <div className="text-muted-foreground">
              {totalPreview === 0 ? "Nenhum item em preview" : "Pronto para publicar"}
            </div>
          </div>
        </div>

        {/* METADATA */}
        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1">📈 Estatísticas:</div>
          <div className="pl-3 space-y-1 text-xs">
            <div>Filmes: <strong>{metadata.totalMovies}</strong></div>
            <div>Séries: <strong>{metadata.totalSeries}</strong></div>
            <div>Episódios: <strong>{metadata.totalEpisodes}</strong></div>
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1">⚙️ Status:</div>
          <div className="pl-3 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-yellow-500" />
                  <span className="text-yellow-500">Carregando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Pronto</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isAutoSaving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                  <span className="text-blue-500">Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Salvo</span>
                </>
              )}
            </div>
            
            {lastSaved && (
              <div className="text-muted-foreground">
                Último save: {lastSaved}
              </div>
            )}
          </div>
        </div>

        {/* AVISOS */}
        {totalPublished === 0 && (
          <div className="bg-yellow-500/20 text-yellow-500 p-2 rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-semibold">Nenhum conteúdo publicado!</div>
              <div>Faça upload e publique conteúdo para começar</div>
            </div>
          </div>
        )}

        {totalPreview > 0 && (
          <div className="bg-blue-500/20 text-blue-500 p-2 rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-semibold">Conteúdo em preview!</div>
              <div>Você tem {totalPreview} itens prontos para publicar</div>
            </div>
          </div>
        )}
      </div>

      {/* AÇÕES */}
      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          variant="secondary"
          onClick={checkStatus}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Recheck
        </Button>
        
        <Button 
          size="sm"
          variant="outline"
          onClick={forceReload}
          className="flex-1"
        >
          Reload
        </Button>
      </div>

      {/* INFO */}
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div>🔍 Para logs detalhados, abra o Console (F12)</div>
      </div>
    </div>
  );
};

export default FirebaseDebugPanel;