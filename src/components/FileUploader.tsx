import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone"; // Instale: npm install react-dropzone
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileArchive, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // Supondo que você usa o utilitário do shadcn ou similar

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  acceptedFileTypes?: Record<string, string[]>;
}

const FileUploader = ({ onFileSelect, isProcessing, acceptedFileTypes }: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes || {
      'application/x-mpegurl': ['.m3u', '.m3u8'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out bg-black/40 backdrop-blur-sm",
          isDragActive ? "border-[#E50914] bg-[#E50914]/10" : "border-gray-700 hover:border-gray-500",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-[#E50914]/20' : 'bg-gray-800'}`}>
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-[#E50914]' : 'text-gray-400'}`} />
              </div>
              <p className="text-lg font-medium text-gray-200">
                {isDragActive ? "Solte o arquivo aqui..." : "Arraste e solte seu arquivo"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Suporta .M3U, .M3U8 ou .ZIP
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4 p-4 bg-gray-900/80 rounded-lg border border-gray-700 w-3/4 shadow-2xl"
            >
              <div className="p-3 bg-blue-500/10 rounded-lg">
                {file.name.endsWith('.zip') ? (
                  <FileArchive className="w-8 h-8 text-blue-400" />
                ) : (
                  <FileText className="w-8 h-8 text-green-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              {isProcessing ? (
                <div className="flex items-center gap-2 text-[#E50914]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <button
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Barra de Progresso "Netflix Red" */}
      {isProcessing && (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
        >
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Processando catálogo...</span>
            <span className="animate-pulse">Aguarde</span>
          </div>
          <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#E50914]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FileUploader;