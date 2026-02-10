import { LayoutDashboard, Film, Tv, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  isAdmin?: boolean;
  activeTab: "movies" | "series";
  onChangeTab: (tab: "movies" | "series") => void;
  onOpenAdmin?: (e: React.MouseEvent) => void;
}

export default function DashboardHeader({
  isAdmin = false,
  activeTab,
  onChangeTab,
  onOpenAdmin,
}: DashboardHeaderProps) {
  return (
    <header className="w-full border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* LOGO / TÍTULO */}
        <h1 className="text-lg font-semibold tracking-tight">
          Dashboard
        </h1>

        {/* ===== DESKTOP ===== */}
        <div className="hidden md:flex items-center gap-6">
          {/* Abas */}
          <button
            onClick={() => onChangeTab("movies")}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === "movies"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="w-4 h-4" />
            Filmes
          </button>

          <button
            onClick={() => onChangeTab("series")}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === "series"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tv className="w-4 h-4" />
            Séries
          </button>

          {/* Admin */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAdmin?.(e);
              }}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Gerenciamento
            </button>
          )}
        </div>

        {/* ===== MOBILE ===== */}
        <div className="flex md:hidden items-center gap-2">
          {/* Abas Mobile */}
          <button
            onClick={() => onChangeTab("movies")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "movies"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Filmes
          </button>

          <button
            onClick={() => onChangeTab("series")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "series"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Séries
          </button>

          {/* Menu Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-muted transition">
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              {isAdmin && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAdmin?.(e);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Painel Administrativo
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
