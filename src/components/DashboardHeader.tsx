import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
  X,
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useContent } from "@/contexts/ContentContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import MovieCard from "@/components/MovieCard";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardHeaderProps {
  onOpenAdmin?: () => void;
}

const DashboardHeader = ({ onOpenAdmin }: DashboardHeaderProps) => {
  const { user, logout, isAdmin } = useAuth();
  const { items } = useContent();
  const navigate = useNavigate();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtrar conteúdo baseado na pesquisa
  const movies = items.filter(item => item.source === 'movie');
  const series = items.filter(item => item.source === 'series');

  const searchResults = {
    movies: movies.filter(movie =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6),
    series: series.filter(ep =>
      ep.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6),
  };

  const hasResults = searchResults.movies.length > 0 || searchResults.series.length > 0;

  const handleSearchOpen = () => {
    setSearchOpen(true);
    setSearchQuery("");
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/80 to-transparent"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1
              onClick={() => handleNavigate("/")}
              className="text-2xl font-bold text-primary cursor-pointer"
            >
              StreamMax
            </h1>

            {/* NAVEGAÇÃO DESKTOP */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <span 
                onClick={() => handleNavigate("/")} 
                className="cursor-pointer hover:text-primary transition-colors"
              >
                Início
              </span>
              <span 
                onClick={() => handleNavigate("/movies")} 
                className="cursor-pointer hover:text-primary transition-colors"
              >
                Filmes
              </span>
              <span 
                onClick={() => handleNavigate("/series")} 
                className="cursor-pointer hover:text-primary transition-colors"
              >
                Séries
              </span>

              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Gerenciamento
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSearchOpen}>
              <Search className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Bell className="w-5 h-5" />
            </Button>

            {/* MENU MOBILE */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                        {user?.name?.charAt(0)}
                      </div>
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Shield className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <nav className="flex flex-col gap-2">
                    <button
                      onClick={() => handleNavigate("/")}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-foreground font-medium">Início</span>
                    </button>
                    <button
                      onClick={() => handleNavigate("/movies")}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-foreground font-medium">Filmes</span>
                    </button>
                    <button
                      onClick={() => handleNavigate("/series")}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-foreground font-medium">Séries</span>
                    </button>

                    {isAdmin && (
                      <>
                        <div className="border-t border-border my-2" />
                        <button
                          onClick={() => {
                            onOpenAdmin?.();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
                        >
                          <LayoutDashboard className="w-5 h-5 text-primary" />
                          <span className="text-primary font-medium">Painel Admin</span>
                        </button>
                      </>
                    )}
                  </nav>

                  <div className="border-t border-border mt-auto pt-4">
                    <button
                      onClick={() => handleNavigate("/")}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors w-full text-left mb-2"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-foreground">Configurações</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 transition-colors w-full text-left"
                    >
                      <LogOut className="w-5 h-5 text-destructive" />
                      <span className="text-destructive">Sair</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* DROPDOWN DESKTOP */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {user?.name?.charAt(0)}
                    </div>
                    {isAdmin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    {isAdmin && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>

                <DropdownMenuSeparator />

                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={onOpenAdmin} className="gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      Painel Administrativo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {/* Modal de Pesquisa */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[60] overflow-y-auto"
            onClick={handleSearchClose}
          >
            <div className="container mx-auto px-4 py-8" onClick={(e) => e.stopPropagation()}>
              <div className="max-w-3xl mx-auto mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar filmes e séries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full h-16 pl-14 pr-14 bg-secondary border-2 border-border focus:border-primary rounded-xl text-lg outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-secondary-foreground/10 rounded-full p-1 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {searchQuery.length > 0 && (
                <div className="max-w-7xl mx-auto">
                  {!hasResults ? (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground text-lg">
                        Nenhum resultado encontrado para "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {searchResults.movies.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-4">
                            Filmes ({searchResults.movies.length})
                          </h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {searchResults.movies.map((movie, index) => (
                              <div key={movie.id} onClick={handleSearchClose}>
                                <MovieCard
                                  title={movie.title}
                                  image={movie.image}
                                  year=""
                                  duration=""
                                  rating=""
                                  delay={index * 0.05}
                                  onPlay={() => {
                                    handleSearchClose();
                                    window.open(movie.url, "_blank");
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.series.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-4">
                            Episódios ({searchResults.series.length})
                          </h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {searchResults.series.map((ep, index) => (
                              <div key={ep.id} onClick={handleSearchClose}>
                                <MovieCard
                                  title={ep.title}
                                  image={ep.image}
                                  year=""
                                  duration=""
                                  rating=""
                                  delay={index * 0.05}
                                  onPlay={() => {
                                    handleSearchClose();
                                    window.open(ep.url, "_blank");
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {searchQuery.length === 0 && (
                <div className="max-w-3xl mx-auto text-center py-12">
                  <h3 className="text-xl font-semibold mb-4">Explore nosso catálogo</h3>
                  <p className="text-muted-foreground mb-8">
                    Digite o nome de um filme ou série que você gostaria de assistir
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { handleSearchClose(); handleNavigate("/movies"); }}
                    >
                      Ver todos os filmes
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { handleSearchClose(); handleNavigate("/series"); }}
                    >
                      Ver todas as séries
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSearchClose}
              className="fixed top-4 right-4 w-12 h-12 bg-secondary hover:bg-secondary-foreground/10 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardHeader;