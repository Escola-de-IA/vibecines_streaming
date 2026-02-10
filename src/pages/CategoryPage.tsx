import { Shield, Film, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export type DashboardTab = "movies" | "series";

interface DashboardHeaderProps {
  onOpenAdmin?: () => void;

  /** Usado apenas quando houver abas (mobile / páginas específicas) */
  activeTab?: DashboardTab;
  onChangeTab?: (tab: DashboardTab) => void;
}

const DashboardHeader = ({
  onOpenAdmin,
  activeTab,
  onChangeTab,
}: DashboardHeaderProps) => {
  const { isAdmin } = useAuth();

  const showTabs = activeTab && onChangeTab;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur border-b">
      <div className="container mx-auto h-16 flex items-center justify-between px-4">
        {/* LOGO */}
        <h1 className="text-lg font-bold">KTips</h1>

        {/* ABAS (somente quando necessário) */}
        {showTabs && (
          <div className="flex gap-2 md:hidden">
            <Button
              variant={activeTab === "movies" ? "default" : "ghost"}
              size="sm"
              onClick={() => onChangeTab("movies")}
            >
              <Film className="w-4 h-4 mr-1" />
              Filmes
            </Button>

            <Button
              variant={activeTab === "series" ? "default" : "ghost"}
              size="sm"
              onClick={() => onChangeTab("series")}
            >
              <Tv className="w-4 h-4 mr-1" />
              Séries
            </Button>
          </div>
        )}

        {/* ADMIN */}
        {isAdmin && onOpenAdmin && (
          <Button size="sm" variant="outline" onClick={onOpenAdmin}>
            <Shield className="w-4 h-4 mr-2" />
            Admin
          </Button>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
