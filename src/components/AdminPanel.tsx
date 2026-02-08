// 🛠️ ADMIN PANEL - Sistema de Atualização Parcial com Versionamento

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContent } from '@/contexts/ContentContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { playlistLoader } from '@/services/PlaylistPayloader';

interface AdminPanelProps {
  onClose: () => void;
}

interface UploadTarget {
  grupoId: string;
  parteIndex: number;
  arquivo: string;
}

const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { grupos, indexVersion, reloadIndex } = useContent();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<UploadTarget | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * 📤 Upload de arquivo específico
   */
  const handleUpload = async () => {
    if (!selectedFile || !selectedTarget) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo e destino',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      console.log('📤 [ADMIN] Iniciando upload:', selectedTarget.arquivo);
      
      // Simular upload (em produção, seria uma chamada real à API)
      await simulateUpload(selectedFile, selectedTarget);

      // Incrementar versão do índice
      await incrementIndexVersion();

      // Limpar cache da parte atualizada
      playlistLoader.clearParteCache(selectedTarget.grupoId, selectedTarget.parteIndex);

      // Recarregar índice
      await reloadIndex();

      toast({
        title: 'Upload concluído',
        description: `${selectedTarget.arquivo} atualizado com sucesso`
      });

      // Limpar seleção
      setSelectedFile(null);
      setSelectedTarget(null);

    } catch (error: any) {
      console.error('❌ [ADMIN] Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  /**
   * 🔄 Simulação de upload (substituir por API real)
   */
  const simulateUpload = async (file: File, target: UploadTarget): Promise<void> => {
    // Em produção, fazer POST para /api/admin/upload
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`✅ [ADMIN] ${file.name} → ${target.arquivo}`);
        resolve();
      }, 2000);
    });
  };

  /**
   * 📈 Incrementar versão do índice
   */
  const incrementIndexVersion = async (): Promise<void> => {
    // Em produção, fazer POST para /api/admin/increment-version
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📈 [ADMIN] Versão do índice incrementada');
        resolve();
      }, 500);
    });
  };

  /**
   * 🗑️ Limpar todo cache
   */
  const handleClearCache = () => {
    playlistLoader.clearAllCache();
    toast({
      title: 'Cache limpo',
      description: 'Todo o cache foi removido'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Painel Administrativo</h2>
            <p className="text-sm text-muted-foreground">
              Índice v{indexVersion} • Sistema de Atualização Parcial
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-6 space-y-6">
          {/* ℹ️ Instruções */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Regras de Atualização
            </h3>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>Cada arquivo M3U deve ser autocontido (#EXTM3U)</li>
              <li>Não concatene arquivos - substitua apenas o necessário</li>
              <li>Versão do índice incrementa automaticamente</li>
              <li>Cache da parte atualizada é limpo automaticamente</li>
            </ul>
          </div>

          {/* 📁 Seleção de Arquivo */}
          <div>
            <h3 className="font-semibold mb-3">1. Selecione o Arquivo M3U</h3>
            <Input
              type="file"
              accept=".m3u,.m3u8"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                ✓ {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* 🎯 Seleção de Destino */}
          <div>
            <h3 className="font-semibold mb-3">2. Selecione o Destino</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grupos.map(grupo => (
                <div key={grupo.id} className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{grupo.titulo}</h4>
                  <div className="space-y-2">
                    {Array.from({ length: grupo.totalPartes }, (_, i) => {
                      const arquivo = `${grupo.id}_part${i + 1}.m3u`;
                      const isSelected = selectedTarget?.arquivo === arquivo;
                      
                      return (
                        <Button
                          key={i}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setSelectedTarget({
                            grupoId: grupo.id,
                            parteIndex: i,
                            arquivo
                          })}
                          disabled={uploading}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Parte {i + 1} ({arquivo})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ Ação de Upload */}
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedTarget || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Atualizar {selectedTarget?.arquivo || 'Arquivo'}
                </>
              )}
            </Button>
          </div>

          {/* 🗑️ Limpeza de Cache */}
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-3">Manutenção</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearCache}
                disabled={uploading}
              >
                🗑️ Limpar Cache
              </Button>
              <Button
                variant="outline"
                onClick={reloadIndex}
                disabled={uploading}
              >
                🔄 Recarregar Índice
              </Button>
            </div>
          </div>

          {/* 📊 Estatísticas */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Estatísticas do Sistema</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Versão do Índice</p>
                <p className="font-bold">{indexVersion}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grupos</p>
                <p className="font-bold">{grupos.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de Partes</p>
                <p className="font-bold">
                  {grupos.reduce((sum, g) => sum + g.totalPartes, 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cache em Uso</p>
                <p className="font-bold">
                  {playlistLoader.getCacheStats().memoriaEstimada}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar Painel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;