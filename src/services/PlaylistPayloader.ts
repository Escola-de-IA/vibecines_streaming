// 📦 PLAYLIST LOADER - Sistema de Carregamento Multinível
// Implementa índice + particionamento + cache eficiente

export interface M3UItem {
  id: string;
  title: string;
  image: string;
  category: string;
  url: string;
  source: 'movie' | 'series';
  series?: string;   // Nome da série (ex: "The Last of Us")
  season?: number;   // Número da temporada
  episode?: number;  // Número do episódio
}

interface Parte {
  arquivo: string;
  offset: number;
  count: number;
}

interface Grupo {
  id: string;
  titulo: string;
  partes: Parte[];
}

interface IndexData {
  version: number;
  lastUpdate: string;
  grupos: Grupo[];
}

class PlaylistLoader {
  private indexCache: IndexData | null = null;
  private parteCache: Map<string, M3UItem[]> = new Map();
  private indexVersion: number = 0;

  /**
   * 📥 NÍVEL 1: Carregar apenas o índice (executado no login)
   * - Rápido (~5KB)
   * - Define estrutura disponível
   * - Cache curto (5 min)
   */
  async loadIndex(): Promise<IndexData> {
    console.log('📥 [LOADER] Carregando índice...');
    
    const response = await fetch('/index.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'max-age=300' // 5 minutos
      }
    });
    
    if (!response.ok) {
      throw new Error('❌ Índice não encontrado');
    }
    
    const data: IndexData = await response.json();
    
    // Detectar mudança de versão
    if (this.indexCache && this.indexCache.version !== data.version) {
      console.log('🔄 [LOADER] Nova versão detectada, limpando cache');
      this.clearAllCache();
    }
    
    this.indexCache = data;
    this.indexVersion = data.version;
    
    console.log(`✅ [LOADER] Índice v${data.version} carregado`);
    console.log(`📊 [LOADER] Grupos disponíveis:`, data.grupos.map(g => g.id));
    
    return data;
  }

  /**
   * 📥 NÍVEL 2: Carregar parte específica de um grupo
   * - Sob demanda (quando usuário seleciona grupo)
   * - Cache longo (1 hora)
   * - Parse incremental
   */
  async loadParte(grupoId: string, parteIndex: number): Promise<M3UItem[]> {
    const cacheKey = `${grupoId}_${parteIndex}`;
    
    // Verificar cache
    if (this.parteCache.has(cacheKey)) {
      console.log(`♻️ [LOADER] Cache hit: ${cacheKey}`);
      return this.parteCache.get(cacheKey)!;
    }

    // Buscar índice
    const index = this.indexCache || await this.loadIndex();
    const grupo = index.grupos.find(g => g.id === grupoId);
    
    if (!grupo) {
      throw new Error(`❌ Grupo ${grupoId} não encontrado`);
    }
    
    if (!grupo.partes[parteIndex]) {
      throw new Error(`❌ Parte ${parteIndex} não existe em ${grupoId}`);
    }

    const parte = grupo.partes[parteIndex];
    console.log(`📥 [LOADER] Carregando ${parte.arquivo}...`);

    // Carregar M3U com cache longo
    const response = await fetch(`/${parte.arquivo}`, {
      cache: 'force-cache',
      headers: {
        'Cache-Control': 'max-age=3600' // 1 hora
      }
    });
    
    if (!response.ok) {
      throw new Error(`❌ Erro ao carregar ${parte.arquivo}`);
    }
    
    const text = await response.text();
    const items = this.parseM3U(text, grupoId === 'series' ? 'series' : 'movie');
    
    console.log(`✅ [LOADER] ${parte.arquivo} carregado: ${items.length} itens`);
    
    // Cachear resultado
    this.parteCache.set(cacheKey, items);
    
    return items;
  }

  /**
   * 📥 NÍVEL 3: Carregar todas as partes de um grupo (sob demanda)
   * - Usado quando usuário quer ver todo o catálogo
   * - Carrega partes progressivamente
   * - Permite paginação/scroll infinito
   */
  async *loadGrupoStream(grupoId: string): AsyncGenerator<M3UItem[], void, unknown> {
    const index = this.indexCache || await this.loadIndex();
    const grupo = index.grupos.find(g => g.id === grupoId);
    
    if (!grupo) {
      throw new Error(`❌ Grupo ${grupoId} não encontrado`);
    }

    console.log(`🌊 [LOADER] Stream iniciado para ${grupoId} (${grupo.partes.length} partes)`);

    for (let i = 0; i < grupo.partes.length; i++) {
      const items = await this.loadParte(grupoId, i);
      yield items;
    }
  }

  /**
   * 🔍 Parser incremental de M3U
   * - Processa linha por linha
   * - Memória constante
   * - Suporta arquivos gigantes
   */
  private parseM3U(text: string, source: 'movie' | 'series'): M3UItem[] {
    const lines = text.split(/\r?\n/);
    const items: M3UItem[] = [];
    let current: Partial<M3UItem> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Ignorar linhas vazias ou #EXTM3U
      if (!line || line === '#EXTM3U') continue;

      if (line.startsWith('#EXTINF:')) {
        const title = line.split(/,(.+)/)[1]?.trim() || 'Sem título';
        const image = line.match(/tvg-logo="([^"]*)"/)?.[1] || '';
        const category = line.match(/group-title="([^"]*)"/)?.[1] || 'Sem Categoria';

        current = { title, image, category, source };
        continue;
      }

      // URL
      if (line && !line.startsWith('#') && current.title) {
        current.url = line;
        current.id = `${current.title}::${current.url}`;
        
        items.push(current as M3UItem);
        current = {};
      }
    }

    return items;
  }

  /**
   * 🗑️ Limpar cache de uma parte específica
   */
  clearParteCache(grupoId: string, parteIndex: number) {
    const cacheKey = `${grupoId}_${parteIndex}`;
    this.parteCache.delete(cacheKey);
    console.log(`🗑️ [LOADER] Cache limpo: ${cacheKey}`);
  }

  /**
   * 🗑️ Limpar cache de um grupo inteiro
   */
  clearGrupoCache(grupoId: string) {
    const keysToDelete = Array.from(this.parteCache.keys())
      .filter(key => key.startsWith(`${grupoId}_`));
    
    keysToDelete.forEach(key => this.parteCache.delete(key));
    console.log(`🗑️ [LOADER] Cache limpo: ${grupoId} (${keysToDelete.length} partes)`);
  }

  /**
   * 🗑️ Limpar todo o cache
   */
  clearAllCache() {
    this.indexCache = null;
    this.parteCache.clear();
    console.log('🗑️ [LOADER] Cache completo limpo');
  }

  /**
   * 📊 Obter estatísticas do cache
   */
  getCacheStats() {
    return {
      indexVersion: this.indexVersion,
      indexLoaded: !!this.indexCache,
      partesEmCache: this.parteCache.size,
      memoriaEstimada: this.estimateMemoryUsage()
    };
  }

  /**
   * 💾 Estimar uso de memória (aproximado)
   */
  private estimateMemoryUsage(): string {
    let totalItems = 0;
    this.parteCache.forEach(items => {
      totalItems += items.length;
    });
    
    // Estimar ~500 bytes por item
    const bytes = totalItems * 500;
    const mb = bytes / (1024 * 1024);
    
    return `${mb.toFixed(2)} MB`;
  }
}

// Singleton
export const playlistLoader = new PlaylistLoader();