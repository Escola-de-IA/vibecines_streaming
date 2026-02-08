// 🔄 AUTO PLAYLIST LOADER - Sistema de Carregamento Automático
// Este serviço carrega automaticamente um arquivo M3U fixo do servidor

export interface M3UItem {
  id: string;
  title: string;
  image: string;
  category: string;
  url: string;
  source: 'movie' | 'series';
}

export class AutoPlaylistLoader {
  // 📁 CONFIGURAÇÃO: Coloque aqui o caminho do seu arquivo fixo
  private static PLAYLIST_URLS = {
    publicFile: '/playlist',
    externalUrl: '',
  };

  /**
   * 🔍 Detectar qual formato de arquivo está disponível
   */
  private static async detectAvailableFile(): Promise<{ url: string; type: 'zip' | 'm3u' | 'txt' | null }> {
    const publicPath = '/playlist';
    
    // Tentar .m3u
    try {
      const m3uResponse = await fetch(publicPath + '.m3u', { method: 'HEAD' });
      if (m3uResponse.ok) {
        return { url: publicPath + '.m3u', type: 'm3u' };
      }
    } catch (e) {
      console.log('📁 [AUTO-LOADER] .m3u não encontrado');
    }

    // Tentar .m3u8
    try {
      const m3u8Response = await fetch(publicPath + '.m3u8', { method: 'HEAD' });
      if (m3u8Response.ok) {
        return { url: publicPath + '.m3u8', type: 'm3u' };
      }
    } catch (e) {
      console.log('📁 [AUTO-LOADER] .m3u8 não encontrado');
    }

    // Tentar .txt
    try {
      const txtResponse = await fetch(publicPath + '.txt', { method: 'HEAD' });
      if (txtResponse.ok) {
        return { url: publicPath + '.txt', type: 'txt' };
      }
    } catch (e) {
      console.log('📁 [AUTO-LOADER] .txt não encontrado');
    }

    // Tentar .zip
    try {
      const zipResponse = await fetch(publicPath + '.zip', { method: 'HEAD' });
      if (zipResponse.ok) {
        return { url: publicPath + '.zip', type: 'zip' };
      }
    } catch (e) {
      console.log('📁 [AUTO-LOADER] .zip não encontrado');
    }

    return { url: '', type: null };
  }

  /**
   * 📥 Carregar arquivo automaticamente
   */
  static async loadAutoPlaylist(): Promise<{ content: M3UItem[]; source: string } | null> {
    try {
      console.log('🔄 [AUTO-LOADER] Iniciando carregamento automático...');

      const detected = await this.detectAvailableFile();
      
      if (!detected.type) {
        console.log('ℹ️ [AUTO-LOADER] Nenhum arquivo fixo encontrado');
        return null;
      }

      console.log('✅ [AUTO-LOADER] Arquivo encontrado:', detected.url);

      const response = await fetch(detected.url);
      if (!response.ok) {
        throw new Error(`Erro ao baixar: ${response.statusText}`);
      }

      if (detected.type === 'zip') {
        const blob = await response.blob();
        return await this.processZipFile(blob, detected.url);
      } else {
        const text = await response.text();
        return await this.processTextFile(text, detected.url);
      }

    } catch (error: any) {
      console.error('❌ [AUTO-LOADER] Erro:', error.message);
      return null;
    }
  }

  /**
   * 📦 Processar arquivo ZIP
   */
  private static async processZipFile(blob: Blob, source: string): Promise<{ content: M3UItem[]; source: string }> {
    const JSZip = (await import('jszip')).default;
    
    const zip = await JSZip.loadAsync(blob);
    
    const m3uFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.match(/\.m3u8?$/i)
    );

    if (!m3uFile) {
      throw new Error('ZIP não contém arquivo M3U');
    }

    const text = await m3uFile.async('string');
    const content = this.parseM3U(text);

    console.log('✅ [AUTO-LOADER] Carregado do ZIP:', content.length, 'itens');
    return { content, source };
  }

  /**
   * 📄 Processar arquivo de texto
   */
  private static async processTextFile(text: string, source: string): Promise<{ content: M3UItem[]; source: string }> {
    const content = this.parseM3U(text);
    console.log('✅ [AUTO-LOADER] Carregado do arquivo:', content.length, 'itens');
    return { content, source };
  }

  /**
   * 📝 Parser M3U
   */
  private static parseM3U(text: string): M3UItem[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: M3UItem[] = [];
    
    let current: any = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF')) {
        const title = line.split(/,(.+)/)[1]?.trim() || 'Sem título';
        const image = line.match(/tvg-logo="([^"]*)"/)?.[1] || '';
        const category = line.match(/group-title="([^"]*)"/)?.[1] || 'Sem Categoria';
        
        const isSeries = this.detectSeries(title);
        
        current = {
          title,
          image,
          category,
          source: isSeries ? 'series' : 'movie'
        };
        continue;
      }
      
      if (!line.startsWith('#') && current.title) {
        current.url = line;
        current.id = `${current.title}::${current.url}`;
        
        if (!this.isAdultContent(current.title, current.category)) {
          items.push(current as M3UItem);
        }
        
        current = {};
      }
    }
    
    return items;
  }

  /**
   * 🔍 Detectar se é série
   */
  private static detectSeries(title: string): boolean {
    const patterns = [
      /\s+[Ss]\d{1,2}[Ee]\d{1,2}/,
      /\s+\d{1,2}[xX]\d{1,2}/,
      /temporada\s*\d+/i,
      /season\s*\d+/i,
    ];
    
    return patterns.some(p => p.test(title));
  }

  /**
   * 🔞 Filtrar conteúdo adulto
   */
  private static isAdultContent(title: string, category: string): boolean {
    const keywords = /(adult|porno|xxx|sex|18\+)/i;
    return keywords.test(title) || keywords.test(category);
  }

  /**
   * 💾 Baixar de URL externa
   */
  static async loadFromExternalUrl(url: string): Promise<{ content: M3UItem[]; source: string } | null> {
    try {
      console.log('🌐 [AUTO-LOADER] Carregando de URL externa:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao baixar: ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type');
      const isZip = url.endsWith('.zip') || contentType?.includes('zip');

      if (isZip) {
        const blob = await response.blob();
        return await this.processZipFile(blob, url);
      } else {
        const text = await response.text();
        return await this.processTextFile(text, url);
      }

    } catch (error: any) {
      console.error('❌ [AUTO-LOADER] Erro ao carregar URL externa:', error.message);
      return null;
    }
  }

  /**
   * 🔄 Verificar atualizações
   */
  static async checkForUpdates(lastModified?: string): Promise<boolean> {
    try {
      const detected = await this.detectAvailableFile();
      if (!detected.type) return false;

      const response = await fetch(detected.url, { method: 'HEAD' });
      const newModified = response.headers.get('Last-Modified');

      if (!lastModified || !newModified) return true;
      
      return new Date(newModified) > new Date(lastModified);
    } catch (error) {
      return false;
    }
  }
}