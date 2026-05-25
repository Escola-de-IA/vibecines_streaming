import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Film, Home, Menu, Search, Tv, Upload, User, X, LogOut, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useContent } from '@/contexts/ContentContext';
import { ImportModal } from './ImportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { cn } from '@/lib/utils';
import { getAppAssetPath } from '@/lib/app-path';

const BRAND_LOGO_PATH = getAppAssetPath('logo.png');

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog } = useContent();
  const { isAdmin, isPrimaryOwner, logout, user } = useAuth();
  const { activeProfile, selectProfile } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const activeCategory = new URLSearchParams(location.search).get('cat');

  const navItems = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/movies', label: 'Filmes', icon: Film },
    { to: '/series', label: 'Séries', icon: Tv },
  ];

  const movieGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.movies.forEach((movie) => {
      groups.set(movie.group, (groups.get(movie.group) || 0) + 1);
    });
    return catalog.groups
      .map((group) => [group, groups.get(group) || 0] as const)
      .filter(([, count]) => count > 0);
  }, [catalog.groups, catalog.movies]);

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.series.forEach((series) => {
      groups.set(series.group, (groups.get(series.group) || 0) + 1);
    });
    return catalog.groups
      .map((group) => [group, groups.get(group) || 0] as const)
      .filter(([, count]) => count > 0);
  }, [catalog.groups, catalog.series]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1800px] px-3 md:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-full text-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 ml-1">
              <img
                src={BRAND_LOGO_PATH}
                alt="Logo Tela Quente"
                className="h-10 w-10 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)] md:h-12 md:w-12"
              />
              <span
                className="text-2xl md:text-4xl font-bold tracking-tight text-primary"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                TELA QUENTE
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-4 justify-end">
            <button
              onClick={() => navigate('/search')}
              className="hidden md:flex rounded-full border border-border/50 bg-secondary/30 px-5 py-2 items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm font-medium">Buscar...</span>
            </button>

            <button
              onClick={() => navigate('/search')}
              className="md:hidden p-2.5 rounded-full text-foreground hover:bg-secondary/80 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* TODO(fase-E): notificações in-app via Firestore — sino removido por ora. */}

            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="pl-2 pr-4 py-1.5 md:py-2 rounded-full border border-border/50 bg-secondary/30 text-foreground flex items-center gap-2.5 hover:bg-secondary/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden sm:block">
                {activeProfile?.name || (isAdmin ? 'Admin' : 'Usuário')}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Unified Sidebar for Mobile (Glassmorphism) - Hidden on lg screens because DashboardSidebar takes over */}
      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <aside
            className="absolute inset-y-0 left-0 w-[80vw] max-w-[300px] bg-background border-r border-border/30 p-5 overflow-y-auto overscroll-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <img
                  src={BRAND_LOGO_PATH}
                  alt="Logo Tela Quente"
                  className="h-9 w-9 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
                />
                <span className="text-2xl font-bold tracking-tight text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  MENU
                </span>
              </Link>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-full hover:bg-secondary/80 text-foreground/80 hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 mb-8">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                      active 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-foreground/80 hover:bg-secondary/80 hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mb-6">
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3 px-4">Filmes</p>
              <div className="space-y-0.5">
                {movieGroups.map(([group, count]) => (
                  <Link
                    key={group}
                    to={`/movies?cat=${encodeURIComponent(group)}`}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === '/movies' && activeCategory === group
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-primary hover:bg-primary/5',
                    )}
                  >
                    <span className="truncate">{group}</span>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pb-8">
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-3 px-4">Séries</p>
              <div className="space-y-0.5">
                {seriesGroups.map(([group, count]) => (
                  <Link
                    key={group}
                    to={`/series?cat=${encodeURIComponent(group)}`}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === '/series' && activeCategory === group
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-primary hover:bg-primary/5',
                    )}
                  >
                    <span className="truncate">{group}</span>
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-[75]" onClick={() => setProfileOpen(false)}>
          <div
            className="absolute right-3 md:right-6 top-16 md:top-20 w-64 rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium">{activeProfile?.name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || 'Logado'}</p>
            </div>

            <button
              onClick={() => {
                setProfileOpen(false);
                selectProfile(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary mb-1"
            >
              <Users className="w-4 h-4" />
              Trocar de Perfil
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/admin/users');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary"
                >
                  <User className="w-4 h-4" />
                  Gerenciar Usuários
                </button>
                {isPrimaryOwner && (
                  <button
                    onClick={() => {
                      setImportOpen(true);
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary mt-1"
                  >
                    <Upload className="w-4 h-4" />
                    Upload da lista
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => {
                setProfileOpen(false);
                void logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {isPrimaryOwner && <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />}
    </>
  );
}
