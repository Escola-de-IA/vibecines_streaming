import { Heart, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '@/contexts/ContentContext';
import { useProfile } from '@/contexts/ProfileContext';
import { getAppAssetPath } from '@/lib/app-path';

interface ContentCardProps {
  id: string;
  title: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
  isContinueWatching?: boolean;
}

const BRAND_LOGO_PATH = getAppAssetPath('logo.png');

export function ContentCard({ id, title, logo, group, type, isContinueWatching }: ContentCardProps) {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useContent();
  const { userData, updateUserData } = useProfile();
  const fav = isFavorite(id);

  const handleRemoveProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userData?.progress) return;
    const newProgress = { ...userData.progress };
    delete newProgress[id];
    void updateUserData({ progress: newProgress });
  };

  const handleClick = () => {
    if (type === 'movie') {
      navigate(`/watch/${id}`);
    } else {
      navigate(`/series/${id}`);
    }
  };

  return (
    <div
      className="group relative w-full cursor-pointer text-left focus:outline-none"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary shadow-card transition-transform duration-300 group-hover:scale-105 group-hover:shadow-glow group-focus:scale-105 group-focus:shadow-glow">
        {logo ? (
          <img src={logo} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-secondary to-muted px-4 py-6">
            <img
              src={BRAND_LOGO_PATH}
              alt="Logo do app"
              className="max-w-[72%] max-h-12 object-contain opacity-95"
              loading="lazy"
            />
            <span className="text-center text-sm text-foreground font-semibold line-clamp-4">
              {title}
            </span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="p-2 rounded-full bg-primary text-primary-foreground">
            <Play className="w-5 h-5 fill-current" />
          </div>
        </div>

        {/* Action Button */}
        {isContinueWatching ? (
          <button
            onClick={handleRemoveProgress}
            data-spatial-skip="true"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
            title="Remover do Continue Assistindo"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(id); }}
            data-spatial-skip="true"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Adicionar aos Favoritos"
          >
            <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-primary text-primary' : 'text-foreground'}`} />
          </button>
        )}
      </div>
      
      {logo && (
        <>
          <p className="mt-2 text-xs text-foreground/80 font-medium line-clamp-2">{title}</p>
          {group && <p className="text-[10px] text-muted-foreground">{group}</p>}
        </>
      )}
    </div>
  );
}
