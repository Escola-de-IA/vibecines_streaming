import { Film, Heart, Home, Tv } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/movies', label: 'Filmes', icon: Film },
  { to: '/series', label: 'Séries', icon: Tv },
  { to: '/favorites', label: 'Favoritos', icon: Heart },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/80 backdrop-blur-2xl shadow-[0_-15px_40px_rgba(0,0,0,0.6)] md:hidden pb-safe">
      <div className="grid grid-cols-4 gap-1 px-3 py-2">
        {items.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl py-2 px-1 text-[10px] transition-all duration-300',
                active ? 'text-primary font-bold' : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40'
              )}
            >
              <div 
                className={cn(
                  "p-1.5 rounded-full mb-1 transition-all duration-300", 
                  active ? "bg-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.4)] scale-110" : ""
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span className={cn(active ? "opacity-100" : "opacity-90")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}