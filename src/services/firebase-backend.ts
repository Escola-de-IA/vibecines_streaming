// 🔥 Firebase Backend - Sistema COMPLETO de Persistência
// Este arquivo garante que TODO o conteúdo (filmes e séries) seja salvo e carregado corretamente

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  writeBatch,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { app } from "@/firebase.config";

const db = getFirestore(app);

// 📁 Coleções do Firestore
const COLLECTIONS = {
  PUBLISHED_CONTENT: "published_content",      // Conteúdo principal (filmes + séries)
  ENRICHED_SERIES: "enriched_series_data",     // Dados extras do TMDb
  METADATA: "app_metadata",                    // Estatísticas
  SYNC_STATUS: "sync_status"                   // Status de sincronização
};

interface SyncStatus {
  lastSync: Timestamp | Date;
  itemCount: number;
  syncVersion: number;
  status: 'synced' | 'pending' | 'error';
}

export class FirebaseBackend {
  private static syncInProgress = false;
  private static retryAttempts = 3;
  private static retryDelay = 1000;

  /**
   * 💾 SALVAR TODO O CONTEÚDO PUBLICADO
   * Este método salva TODOS os filmes e séries para TODOS os usuários
   */
  static async savePublishedContent(content: any[]): Promise<boolean> {
    // Evitar salvamentos simultâneos
    if (this.syncInProgress) {
      console.warn("⏸️ Sincronização já em andamento");
      return false;
    }

    this.syncInProgress = true;

    try {
      console.log("💾 [FIREBASE] Salvando", content.length, "itens...");
      console.log("📊 [FIREBASE] Preview dos dados:", {
        totalItems: content.length,
        firstItem: content[0],
        types: {
          movies: content.filter(i => i.source === 'movie').length,
          series: content.filter(i => i.source === 'series').length
        }
      });

      // ✅ Salvar usando setDoc para garantir que os dados sejam salvos
      const docRef = doc(db, COLLECTIONS.PUBLISHED_CONTENT, "main");
      
      await setDoc(docRef, {
        content: content,  // ⚠️ IMPORTANTE: Salvar o array completo
        updatedAt: serverTimestamp(),
        itemCount: content.length,
        version: Date.now(),
        savedBy: "admin",
        dataStructure: {
          movies: content.filter(i => i.source === 'movie').length,
          series: content.filter(i => i.source === 'series').length,
          total: content.length
        }
      }, { merge: false }); // merge: false garante substituição completa

      console.log("✅ [FIREBASE] Conteúdo salvo com sucesso!");
      console.log("✅ [FIREBASE] Total de itens salvos:", content.length);

      // Salvar status de sincronização
      const syncRef = doc(db, COLLECTIONS.SYNC_STATUS, "main");
      await setDoc(syncRef, {
        lastSync: serverTimestamp(),
        itemCount: content.length,
        syncVersion: Date.now(),
        status: 'synced'
      } as any);

      this.syncInProgress = false;
      return true;

    } catch (error: any) {
      console.error("❌ [FIREBASE] Erro ao salvar:", error);
      console.error("❌ [FIREBASE] Detalhes:", error.message, error.code);
      
      // Sistema de retry
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        console.log(`🔄 [FIREBASE] Tentativa ${attempt}/${this.retryAttempts}...`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        
        try {
          const docRef = doc(db, COLLECTIONS.PUBLISHED_CONTENT, "main");
          await setDoc(docRef, {
            content: content,
            updatedAt: serverTimestamp(),
            itemCount: content.length,
            version: Date.now()
          });
          
          console.log("✅ [FIREBASE] Salvo após retry!");
          this.syncInProgress = false;
          return true;
        } catch (retryError: any) {
          console.error(`❌ [FIREBASE] Retry ${attempt} falhou:`, retryError.message);
        }
      }

      this.syncInProgress = false;
      return false;
    }
  }

  /**
   * 📥 CARREGAR TODO O CONTEÚDO PUBLICADO
   * Este método carrega TODOS os filmes e séries salvos
   */
  static async loadPublishedContent(): Promise<any[]> {
    try {
      console.log("📥 [FIREBASE] Carregando conteúdo publicado...");
      
      const docRef = doc(db, COLLECTIONS.PUBLISHED_CONTENT, "main");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const content = data.content || [];
        
        console.log("✅ [FIREBASE] Conteúdo carregado!");
        console.log("📊 [FIREBASE] Total de itens:", content.length);
        console.log("📊 [FIREBASE] Estrutura:", {
          movies: content.filter((i: any) => i.source === 'movie').length,
          series: content.filter((i: any) => i.source === 'series').length,
          total: content.length
        });
        console.log("📊 [FIREBASE] Primeiro item:", content[0]);
        
        // ✅ Validar que os dados estão corretos
        if (Array.isArray(content)) {
          return content;
        } else {
          console.error("❌ [FIREBASE] Dados não são um array!");
          return [];
        }
      } else {
        console.log("ℹ️ [FIREBASE] Nenhum conteúdo encontrado (primeira vez)");
        return [];
      }
      
    } catch (error: any) {
      console.error("❌ [FIREBASE] Erro ao carregar:", error);
      console.error("❌ [FIREBASE] Detalhes:", error.message, error.code);
      return [];
    }
  }

  /**
   * 💾 SALVAR DADOS ENRIQUECIDOS DE SÉRIES (TMDb)
   */
  static async saveEnrichedSeriesData(data: Record<string, any>): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.ENRICHED_SERIES, "main");
      await setDoc(docRef, {
        data,
        updatedAt: serverTimestamp()
      });
      
      console.log("✅ [FIREBASE] Dados de séries salvos");
      return true;
    } catch (error: any) {
      console.error("❌ [FIREBASE] Erro ao salvar dados de séries:", error.message);
      return false;
    }
  }

  /**
   * 📥 CARREGAR DADOS ENRIQUECIDOS DE SÉRIES
   */
  static async loadEnrichedSeriesData(): Promise<Record<string, any>> {
    try {
      const docRef = doc(db, COLLECTIONS.ENRICHED_SERIES, "main");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().data || {};
      }
      
      return {};
    } catch (error) {
      console.error("❌ [FIREBASE] Erro ao carregar dados de séries");
      return {};
    }
  }

  /**
   * 💾 SALVAR METADATA
   */
  static async saveMetadata(metadata: any): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.METADATA, "main");
      await setDoc(docRef, {
        ...metadata,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("❌ [FIREBASE] Erro ao salvar metadata");
      return false;
    }
  }

  /**
   * 📥 CARREGAR METADATA
   */
  static async loadMetadata(): Promise<any> {
    try {
      const docRef = doc(db, COLLECTIONS.METADATA, "main");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return {
        lastUpdated: new Date().toISOString(),
        totalMovies: 0,
        totalSeries: 0,
        totalEpisodes: 0
      };
    } catch (error) {
      return {
        lastUpdated: new Date().toISOString(),
        totalMovies: 0,
        totalSeries: 0,
        totalEpisodes: 0
      };
    }
  }

  /**
   * 🧹 LIMPAR TODOS OS DADOS (uso administrativo)
   */
  static async clearAllData(): Promise<boolean> {
    try {
      console.log("🗑️ [FIREBASE] Limpando todos os dados...");
      
      const batch = writeBatch(db);
      
      batch.delete(doc(db, COLLECTIONS.PUBLISHED_CONTENT, "main"));
      batch.delete(doc(db, COLLECTIONS.ENRICHED_SERIES, "main"));
      batch.delete(doc(db, COLLECTIONS.METADATA, "main"));
      batch.delete(doc(db, COLLECTIONS.SYNC_STATUS, "main"));
      
      await batch.commit();
      
      console.log("✅ [FIREBASE] Dados limpos com sucesso");
      return true;
    } catch (error) {
      console.error("❌ [FIREBASE] Erro ao limpar dados");
      return false;
    }
  }

  /**
   * 📊 VERIFICAR STATUS DE SINCRONIZAÇÃO
   */
  static async getSyncStatus(): Promise<SyncStatus | null> {
    try {
      const docRef = doc(db, COLLECTIONS.SYNC_STATUS, "main");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as SyncStatus;
      }
      
      return null;
    } catch (error) {
      console.error("❌ [FIREBASE] Erro ao verificar status");
      return null;
    }
  }
}