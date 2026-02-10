// 🎯 CONTENT CONTEXT - Gerenciamento Híbrido: Streaming + Admin

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { playlistLoader, M3UItem } from '@/services/PlaylistPayloader';
import { useToast } from '@/hooks/use-toast';

// --- Interfaces ---

export interface EnrichedSeries {
  seriesName: string;
  normalizedName: string;
  poster: string;
  backdrop: string;
  totalSeasons: number;
  totalEpisodes: number;
  episodes: M3UItem[];
  seasons: { [key: number]: M3UItem[] };
}

interface Grupo {
  id: string;
  titulo: string;
  totalPartes: number;
}

interface PreviewData {
  movies: M3UItem[];
  series: any[]; // Usando any temporariamente para flexibilidade no worker
}

interface ContentContextType {
  // 🔄 Estado de Leitura (Streaming)
  indexLoaded: boolean;
  indexVersion: number;
  grupos: Grupo[];
  
  currentGrupo: string | null;
  currentParte: number;
  items: M3UItem[]; // Itens brutos da paginação atual
  
  // 🔍 Getters Computados (Compatibilidade com Pages)
  publishedMovies: M3UItem[];
  publishedSeries: EnrichedSeries[];
  
  // ⚙️ Controles de Carregamento
  loadingIndex: boolean;
  loadingParte: boolean;
  isLoading: boolean; // Alias geral
  hasMorePartes: boolean;
  
  // 🎮 Ações de Streaming
  selectGrupo: (grupoId: string) => Promise<void>;
  loadNextParte: () => Promise<void>;
  reloadIndex: () => Promise<void>;
  enrichSeries: (seriesName: string) => EnrichedSeries | null;
  
  // 🛡️ Área Administrativa (Upload & Preview)
  previewContent: PreviewData | null;
  setPreviewContent: (data: PreviewData | null) => void;
  publishContent: () => Promise<void>;
  hasUnpublished: boolean;
  
  // 📊 Estatísticas
  stats: {
    partesCarregadas: number;
    totalItens: number;
    memoriaEmCache: string;
  };
}

const ContentContext = createContext<ContentContextType | null>(null);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();

  // --- Estados Principais ---
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [indexVersion, setIndexVersion] = useState(0);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(false);

  // --- Estado de Paginação (Infinito) ---
  const [currentGrupo, setCurrentGrupo] = useState<string | null>(null);
  const [currentParte, setCurrentParte] = useState(0);
  const [items, setItems] = useState<M3UItem[]>([]); // Lista "flat" atual
  const [loadingParte, setLoadingParte] = useState(false);
  const [totalPartes, setTotalPartes] = useState(0);

  // --- Estado do Admin (Preview) ---
  const [previewContent, setPreviewContent] = useState<PreviewData | null>(null);

  /**
   * 📥 Carregar índice no mount
   */
  useEffect(() => {
    loadIndex();
  }, []);

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
    } catch (error: any) {
      console.error('❌ [CONTEXT] Erro ao carregar índice:', error);
      toast({ title: "Erro de conexão", description: "Não foi possível carregar o catálogo.", variant: "destructive" });
    } finally {
      setLoadingIndex(false);
    }
  };

  /**
   * 🎯 Selecionar grupo (Filmes, Séries, Canais)
   */
  const selectGrupo = useCallback(async (grupoId: string) => {
    if (currentGrupo === grupoId) return;

    console.log(`🎯 [CONTEXT] Trocando para grupo: ${grupoId}`);
    
    // Resetar visualização
    setItems([]);
    setCurrentParte(0);
    setCurrentGrupo(grupoId);
    
    const grupo = grupos.find(g => g.id === grupoId);
    setTotalPartes(grupo?.totalPartes || 0);

    setLoadingParte(true);
    try {
      const parteItems = await playlistLoader.loadParte(grupoId, 0);
      setItems(parteItems);
    } catch (error) {
      console.error('❌ Erro ao carregar grupo:', error);
    } finally {
      setLoadingParte(false);
    }
  }, [currentGrupo, grupos]);

  /**
   * ➕ Carregar próxima parte (Scroll Infinito)
   */
  const loadNextParte = useCallback(async () => {
    if (!currentGrupo || loadingParte) return;
    
    const nextParte = currentParte + 1;
    if (nextParte >= totalPartes) return;

    console.log(`➕ [CONTEXT] Carregando parte ${nextParte + 1}/${totalPartes}...`);
    
    setLoadingParte(true);
    try {
      const parteItems = await playlistLoader.loadParte(currentGrupo, nextParte);
      setItems(prev => [...prev, ...parteItems]);
      setCurrentParte(nextParte);
    } catch (error) {
      console.error('❌ Erro ao carregar parte:', error);
    } finally {
      setLoadingParte(false);
    }
  }, [currentGrupo, currentParte, totalPartes, loadingParte]);

  /**
   * 🔄 Recarregar (usado após publicação)
   */
  const reloadIndex = useCallback(async () => {
    playlistLoader.clearAllCache();
    await loadIndex();
    // Se estiver em um grupo, recarregar ele também
    if (currentGrupo) {
      const gId = currentGrupo;
      setCurrentGrupo(null); // Forçar reset
      setTimeout(() => selectGrupo(gId), 100);
    }
  }, [currentGrupo, selectGrupo]);

  // --- Lógica de Derivação (Getters) ---

  // Filtra filmes da lista atual carregada
  const publishedMovies = useMemo(() => {
    // Se o grupo atual for de séries, retorna vazio, se for misto ou filmes, filtra.
    return items.filter(i => !i.series);
  }, [items]);

  // Agrupa séries da lista atual carregada (Transforma Flat em Enriched)
  const publishedSeries = useMemo(() => {
    const seriesMap = new Map<string, EnrichedSeries>();
    
    items.filter(i => i.series).forEach(item => {
        if (!item.series) return;
        const name = item.series;
        
        if (!seriesMap.has(name)) {
            seriesMap.set(name, {
                seriesName: name,
                normalizedName: encodeURIComponent(name),
                poster: item.image,
                backdrop: item.image, // Fallback
                totalSeasons: 0,
                totalEpisodes: 0,
                episodes: [],
                seasons: {}
            });
        }
        
        const entry = seriesMap.get(name)!;
        entry.episodes.push(item);
        entry.totalEpisodes++;
        
        // Extrair temporada (ex: S01E01 -> 1)
        // Isso depende de como o worker processou, vamos assumir que item.groupTitle tem a info ou parsear do titulo
        // Por simplificação, vamos assumir temporada 1 se não achar
        const seasonMatch = item.title.match(/S(\d+)E\d+/i);
        const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
        
        if (!entry.seasons[season]) entry.seasons[season] = [];
        entry.seasons[season].push(item);
        
        // Atualizar contagem de temporadas
        entry.totalSeasons = Object.keys(entry.seasons).length;
    });

    return Array.from(seriesMap.values());
  }, [items]);

  /**
   * 🎬 Helper para detalhes da série
   */
  const enrichSeries = useCallback((seriesName: string): EnrichedSeries | null => {
    // Tenta achar na lista já processada
    const found = publishedSeries.find(s => s.seriesName === seriesName || s.normalizedName === seriesName);
    if (found) return found;

    // Se não estiver na lista (ex: acessou link direto e a paginação ainda não carregou a série),
    // Idealmente aqui buscaríamos no servidor/cache específico.
    // Por enquanto, retorna null.
    return null;
  }, [publishedSeries]);

  // --- Lógica Administrativa (Firebase) ---

  const publishContent = async () => {
    if (!previewContent) return;

    // TODO: Aqui entra a chamada real para o Firebase Storage/Firestore
    // 1. Upload do JSON gerado para o Storage
    // 2. Atualização do índice no Firestore
    
    console.log("🔥 [FIREBASE] Publicando conteúdo...", previewContent);
    
    // Simulação de delay de rede
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Limpar preview
    setPreviewContent(null);
    
    // Recarregar app para mostrar novos dados
    await reloadIndex();
  };

  const hasUnpublished = !!previewContent;

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
      
      // Getters compatíveis
      publishedMovies,
      publishedSeries,
      
      loadingIndex,
      loadingParte,
      isLoading: loadingIndex || loadingParte,
      hasMorePartes,
      
      selectGrupo,
      loadNextParte,
      reloadIndex,
      enrichSeries,
      
      // Admin
      previewContent,
      setPreviewContent,
      publishContent,
      hasUnpublished,
      
      stats
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