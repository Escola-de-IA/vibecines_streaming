// 🔍 DEBUG PANEL - Verificar status do sistema
// Cole este componente no Dashboard para ver o que está acontecendo

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/contexts/ContentContext";
import { RefreshCw, Database, AlertCircle, CheckCircle2 } from "lucide-react";

export const FirebaseDebugPanel = () => {
  const { items, currentGrupo, stats } = useContent();
  const [loading, setLoading] = useState(false);

  const movies = items.filter(item => item.source === 'movie');
  const series = items.filter(item => item.source === 'series');

  const checkStatus = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log('🔍 [DEBUG] Status atual:', {
        total: items.length,
        movies: movies.length,
        series: series.length,
        currentGrupo,
        stats
      });
    }, 500);
  };

  const forceReload = () => {
    window.location.reload();
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border-2 border-primary rounded-lg p-4 shadow-2xl max-w-md">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Debug Panel
      </h3>

      <div className="space-y-2 text-sm">
        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1">📊 Estado Atual:</div>
          <div className="pl-3 space-y-1">
            <div>Total: {items.length}</div>
            <div>🎬 Filmes: {movies.length}</div>
            <div>📺 Episódios: {series.length}</div>
            <div>📁 Grupo: {currentGrupo || 'Nenhum'}</div>
          </div>
        </div>

        <div className="bg-secondary p-2 rounded">
          <div className="font-semibold mb-1">💾 Cache:</div>
          <div className="pl-3 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Partes: {stats.partesCarregadas}</span>
            </div>
            <div>Memória: {stats.memoriaEmCache}</div>
          </div>
        </div>

        {items.length === 0 && (
          <div className="bg-yellow-500/20 text-yellow-500 p-2 rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold">Nenhum item carregado!</div>
              <div>Selecione um grupo para carregar conteúdo</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          variant="secondary"
          onClick={checkStatus}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Recheck
        </Button>
        
        <Button 
          size="sm"
          variant="outline"
          onClick={forceReload}
        >
          Reload Page
        </Button>
      </div>
    </div>
  );
};