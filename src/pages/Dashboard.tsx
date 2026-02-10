// 📊 DASHBOARD COM DEBUG PANEL
// Exemplo de como usar o FirebaseDebugPanel

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "@/contexts/ContentContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import FirebaseDebugPanel from "@/components/FirebaseDebugPanel";
import AdminPanel from "@/components/AdminPanel";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { publishedMovies, publishedSeries, isLoading } = useContent();

  const [showAdmin, setShowAdmin] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Para desenvolvimento, mostrar debug automaticamente
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onOpenAdmin={() => setShowAdmin(true)} />

      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Carregando conteúdo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Filmes */}
            <div className="bg-secondary/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">🎬 Filmes</h2>
              <p className="text-4xl font-bold mb-4">{publishedMovies.length}</p>
              <Button onClick={() => navigate("/movies")}>
                Ver Filmes
              </Button>
            </div>

            {/* Card de Séries */}
            <div className="bg-secondary/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">📺 Séries</h2>
              <p className="text-4xl font-bold mb-4">{publishedSeries.length}</p>
              <Button onClick={() => navigate("/series")}>
                Ver Séries
              </Button>
            </div>
          </div>
        )}

        {/* Botão para mostrar Debug (apenas em dev) */}
        {isDevelopment && (
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? "Ocultar Debug" : "Mostrar Debug"}
            </Button>
          </div>
        )}
      </div>

      <Footer />

      {/* Admin Panel */}
      {showAdmin && isAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {/* Debug Panel - Só mostra se ativado OU se em desenvolvimento */}
      {(showDebug || isDevelopment) && <FirebaseDebugPanel />}
    </div>
  );
};

export default Dashboard;