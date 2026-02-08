// Hook de persistÃªncia inspirado no SharedPreferences do Flutter
import { useState, useEffect, useCallback } from 'react';

export interface StorageOptions {
  key: string;
  defaultValue?: any;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

/**
 * Hook similar ao SharedPreferences do Flutter
 * Persiste dados automaticamente no localStorage
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  
  // Inicializar estado com valor do localStorage ou padrÃ£o
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Erro ao carregar ${key} do localStorage:`, error);
    }
    return defaultValue;
  });

  // Salvar automaticamente quando o estado mudar
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Erro ao salvar ${key} no localStorage:`, error);
    }
  }, [key, state]);

  // FunÃ§Ã£o para limpar dados
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setState(defaultValue);
  }, [key, defaultValue]);

  return [state, setState, clear];
}

/**
 * Classe de gerenciamento de persistÃªncia
 * Similar ao SharedPreferences do Flutter
 */
class PersistenceManager {
  private static instance: PersistenceManager;
  private cache: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  /**
   * Salvar dados
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      this.cache.set(key, value);
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obter dados
   */
  async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      // Verificar cache primeiro
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        this.cache.set(key, parsed);
        return parsed;
      }

      return defaultValue ?? null;
    } catch (error) {
      console.error(`Erro ao obter ${key}:`, error);
      return defaultValue ?? null;
    }
  }

  /**
   * Remover item
   */
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
    this.cache.delete(key);
  }

  /**
   * Limpar tudo
   */
  async clear(): Promise<void> {
    localStorage.clear();
    this.cache.clear();
  }

  /**
   * Verificar se existe
   */
  async hasItem(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Obter todas as chaves
   */
  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  /**
   * Salvar mÃºltiplos itens
   */
  async setMultiple(items: Record<string, any>): Promise<void> {
    const promises = Object.entries(items).map(([key, value]) =>
      this.setItem(key, value)
    );
    await Promise.all(promises);
  }

  /**
   * Obter mÃºltiplos itens
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.getItem<T>(key);
    }
    return result;
  }
}

// Exportar instÃ¢ncia singleton
export const persistence = PersistenceManager.getInstance();

/**
 * Hook para usar o PersistenceManager
 */
export function usePersistence() {
  return persistence;
}

/**
 * UtilitÃ¡rios de data (similar ao intl do Flutter)
 */
export const dateUtils = {
  /**
   * Formatar data
   */
  format(date: Date, format: string = 'dd/MM/yyyy HH:mm'): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * Parse de string para Date
   */
  parse(dateString: string): Date {
    return new Date(dateString);
  },

  /**
   * Verificar se Ã© hoje
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  },

  /**
   * DiferenÃ§a em dias
   */
  daysBetween(date1: Date, date2: Date): number {
    const diff = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },
};

/**
 * Metadata de upload (similar ao que vocÃª faria no Flutter)
 */
export interface UploadMetadata {
  uploadedAt: string;
  totalItems: number;
  type: 'movie' | 'series';
  fileName: string;
  userId?: string;
}

/**
 * Gerenciador de histÃ³rico de uploads
 */
export class UploadHistoryManager {
  private static HISTORY_KEY = 'streammax_upload_history';
  private static MAX_HISTORY = 50;

  /**
   * Adicionar upload ao histÃ³rico
   */
  static async addUpload(metadata: UploadMetadata): Promise<void> {
    const history = await this.getHistory();
    history.unshift({
      ...metadata,
      uploadedAt: new Date().toISOString(),
    });

    // Manter apenas os Ãºltimos N uploads
    const trimmed = history.slice(0, this.MAX_HISTORY);
    await persistence.setItem(this.HISTORY_KEY, trimmed);
  }

  /**
   * Obter histÃ³rico
   */
  static async getHistory(): Promise<UploadMetadata[]> {
    return (await persistence.getItem<UploadMetadata[]>(this.HISTORY_KEY)) || [];
  }

  /**
   * Limpar histÃ³rico
   */
  static async clearHistory(): Promise<void> {
    await persistence.removeItem(this.HISTORY_KEY);
  }

  /**
   * Obter Ãºltimo upload
   */
  static async getLastUpload(): Promise<UploadMetadata | null> {
    const history = await this.getHistory();
    return history[0] || null;
  }
}