// 🎯 CONTENT CONTEXT - Gerenciamento de Estado com Carregamento Progressivo
// Mantém compatibilidade com sistema antigo (publishedMovies, publishedSeries)

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { playlistLoader, M3UItem } from '@/services/PlaylistPayloader';

interface Grupo {
  id: string;
  titulo: string;
  totalPartes: number;
}

interface ContentContextType {
  // Estado do índice
  indexLoaded: boolean;
  indexVersion: number;
  grupos: Grupo[];
  
  // Estado do grupo atual
  currentGrupo: string | null;
  currentParte: number;
  items: M3UItem[];
  
  // ✅ Compatibilidade com sistema antigo
  publishedMovies: M3UItem[];
  publishedSeries: M3UItem[];
  publishedContent: M3UItem[];
  
  // Controles de carregamento
  loadingIndex: boolean;
  loadingParte: boolean;
  hasMorePartes: boolean;
  
  // Ações
  selectGrupo: (grupoId: string) => Promise<void>;
  loadNextParte: () => Promise<void>;
  reloadIndex: () => Promise<void>;
  
  // Estatísticas
  stats: {
    partesCarregadas: number;
    totalItens: number;
    memoriaEmCache: string;
  };

  // Métodos extras para compatibilidade
  metadata: {
    totalMovies: number;
    totalSeries: number;
    totalEpisodes: number;
    lastUpdated: string;
  };
}

const ContentContext = createContext<ContentContextType | null>(null);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  // Estado do índice
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [indexVersion, setIndexVersion] = useState(0);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(false);

  // Estado do grupo atual
  const [currentGrupo, setCurrentGrupo] = useState<string | null>(null);
  const [currentParte, setCurrentParte] = useState(0);
  const [items, setItems] = useState<M3UItem[]>([]);
  const [loadingParte, setLoadingParte] = useState(false);
  const [totalPartes, setTotalPartes] = useState(0);

  /**
   * ✅ Computed properties para compatibilidade
   */
  const publishedMovies = useMemo(() => 
    items.filter(item => item.source === 'movie'),
    [items]
  );

  const publishedSeries = useMemo(() => 
    items.filter(item => item.source === 'series'),
    [items]
  );

  const publishedContent = useMemo(() => items, [items]);

  const metadata = useMemo(() => ({
    totalMovies: publishedMovies.length,
    totalSeries: publishedSeries.length,
    totalEpisodes: publishedSeries.length,
    lastUpdated: new Date().toISOString()
  }), [publishedMovies, publishedSeries]);

  /**
   * 📥 Carregar índice no mount
   */
  useEffect(() => {
    loadIndex();
  }, []);

  /**
   * 📥 Auto-carregar grupo 'filmes' após índice estar pronto
   */
  useEffect(() => {
    if (indexLoaded && !currentGrupo) {
      // Carregar automaticamente o grupo 'filmes'
      selectGrupo('filmes');
    }
  }, [indexLoaded, currentGrupo]);

  /**
   * 📥 Função para carregar índice
   */
  const loadIndex = async () => {
    setLoadingIndex(true);
    try {
      console.log('📥 [CONTEXT] Carregando índice...');
      const index = await playlistLoader.loadIndex();
      
      setGrupos(index.grupos.map(g => ({
        id: g.id,
        titulo: g.titulo,
        totalPartes: g.partes.length
      })));
      
      setIndexVersion(index.version);
      setIndexLoaded(true);
      
      console.log('✅ [CONTEXT] Índice carregado com sucesso');
    } catch (error: any) {
      console.error('❌ [CONTEXT] Erro ao carregar índice:', error);
    } finally {
      setLoadingIndex(false);
    }
  };

  /**
   * 🎯 Selecionar grupo
   */
  const selectGrupo = useCallback(async (grupoId: string) => {
    if (currentGrupo === grupoId) return;

    console.log(`🎯 [CONTEXT] Selecionando grupo: ${grupoId}`);
    
    // Limpar estado anterior
    setItems([]);
    setCurrentParte(0);
    setCurrentGrupo(grupoId);
    
    // Descobrir total de partes
    const grupo = grupos.find(g => g.id === grupoId);
    setTotalPartes(grupo?.totalPartes || 0);

    // Carregar primeira parte
    setLoadingParte(true);
    try {
      const parteItems = await playlistLoader.loadParte(grupoId, 0);
      setItems(parteItems);
      console.log(`✅ [CONTEXT] Primeira parte carregada: ${parteItems.length} itens`);
    } catch (error: any) {
      console.error('❌ [CONTEXT] Erro ao carregar primeira parte:', error);
    } finally {
      setLoadingParte(false);
    }
  }, [currentGrupo, grupos]);

  /**
   * ➕ Carregar próxima parte
   */
  const loadNextParte = useCallback(async () => {
    if (!currentGrupo || loadingParte) return;
    
    const nextParte = currentParte + 1;
    
    if (nextParte >= totalPartes) {
      console.log('ℹ️ [CONTEXT] Não há mais partes para carregar');
      return;
    }

    console.log(`➕ [CONTEXT] Carregando parte ${nextParte + 1}/${totalPartes}...`);
    
    setLoadingParte(true);
    try {
      const parteItems = await playlistLoader.loadParte(currentGrupo, nextParte);
      
      setItems(prev => [...prev, ...parteItems]);
      setCurrentParte(nextParte);
      
      console.log(`✅ [CONTEXT] Parte ${nextParte + 1} carregada: ${parteItems.length} itens`);
    } catch (error: any) {
      console.error('❌ [CONTEXT] Erro ao carregar próxima parte:', error);
    } finally {
      setLoadingParte(false);
    }
  }, [currentGrupo, currentParte, totalPartes, loadingParte]);

  /**
   * 🔄 Recarregar índice
   */
  const reloadIndex = useCallback(async () => {
    playlistLoader.clearAllCache();
    await loadIndex();
  }, []);

  /**
   * 📊 Estatísticas
   */
  const stats = {
    partesCarregadas: currentParte + 1,
    totalItens: items.length,
    memoriaEmCache: playlistLoader.getCacheStats().memoriaEstimada
  };

  const hasMorePartes = currentGrupo !== null && currentParte < totalPartes - 1;

  return (
    <ContentContext.Provider value={{
      indexLoaded,
      indexVersion,
      grupos,
      currentGrupo,
      currentParte,
      items,
      publishedMovies,
      publishedSeries,
      publishedContent,
      loadingIndex,
      loadingParte,
      hasMorePartes,
      selectGrupo,
      loadNextParte,
      reloadIndex,
      stats,
      metadata
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within ContentProvider');
  }
  return context;
};