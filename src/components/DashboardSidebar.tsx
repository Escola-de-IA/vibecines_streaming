import { useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Film, Layers, Tv, ChevronLeft, ChevronRight, Home, Heart } from 'lucide-react';
import { useContent } from '@/contexts/ContentContext';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { catalog } = useContent();
  const activeCategory = new URLSearchParams(location.search).get('cat');

  const navItems = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/movies', label: 'Filmes', icon: Film },
    { to: '/series', label: 'Séries', icon: Tv },
    { to: '/favorites', label: 'Favoritos', icon: Heart },
  ];

  const movieGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.movies.forEach((m) => {
      groups.set(m.group, (groups.get(m.group) || 0) + 1);
    });
    return catalog.groups
      .map((group) => [group, groups.get(group) || 0] as const)
      .filter(([, count]) => count > 0);
  }, [catalog.groups, catalog.movies]);

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, number>();
    catalog.series.forEach((s) => {
      groups.set(s.group, (groups.get(s.group) || 0) + 1);
    });
    return catalog.groups
      .map((group) => [group, groups.get(group) || 0] as const)
      .filter(([, count]) => count > 0);
  }, [catalog.groups, catalog.series]);

  if (!catalog.isLoaded) return null;

  return (
    <aside 
      className={`hidden lg:flex fixed left-0 top-20 bottom-0 z-40 transition-all duration-300 ease-in-out flex-col bg-background/80 backdrop-blur-2xl border-r border-border/30 shadow-2xl ${isOpen ? 'w-[240px]' : 'w-[72px]'}`}
    >
      <div className={`h-14 flex items-center border-b border-border/30 transition-all ${isOpen ? 'justify-between px-5' : 'justify-center px-0'}`}>
        {isOpen && <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase whitespace-nowrap overflow-hidden">Navegação</h2>}
        <button 
          onClick={onToggle} 
          className="p-2 rounded-xl text-foreground hover:bg-primary/20 hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={isOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          {isOpen ? <ChevronLeft className="w-5 h-5 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 flex-shrink-0" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col pt-4">
        {/* Main Nav Links (Icons always visible) */}
        <div className="px-3 mb-6 space-y-1.5 border-b border-border/20 pb-4 mx-2">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  active ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-secondary/80 hover:text-foreground',
                  isOpen ? 'px-4' : 'px-0 justify-center'
                )}
                title={!isOpen ? item.label : undefined}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", active && "text-primary")} />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Categories (Hidden when collapsed) */}
        <div className={`transition-all duration-300 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
          {movieGroups.length > 0 && (
          <div className="px-3 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">
              Categorias de Filmes
            </p>
            {movieGroups.map(([group, count]) => (
              <button
                key={group}
                onClick={() => navigate(`/movies?cat=${encodeURIComponent(group)}`)}
                className={cn(
                  'flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-colors',
                  location.pathname === '/movies' && activeCategory === group
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                <span className="truncate">{group}</span>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>
        )}

        {seriesGroups.length > 0 && (
          <div className="px-3 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">
              Categorias de Séries
            </p>
            {seriesGroups.map(([group, count]) => (
              <button
                key={group}
                onClick={() => navigate(`/series?cat=${encodeURIComponent(group)}`)}
                className={cn(
                  'flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-colors',
                  location.pathname === '/series' && activeCategory === group
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                <span className="truncate">{group}</span>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      <div className={`px-4 py-4 border-t border-border/30 space-y-2 transition-all ${!isOpen ? 'hidden' : 'block'}`}>
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground/70 font-medium">
          <Film className="w-3.5 h-3.5" />
          <span>{catalog.movies.length} filmes</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground/70 font-medium">
          <Tv className="w-3.5 h-3.5" />
          <span>{catalog.series.length} séries</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground/70 font-medium">
          <Layers className="w-3.5 h-3.5" />
          <span>{catalog.groups.length} categorias</span>
        </div>
      </div>
    </aside>
  );
}
