import { Loader2 } from 'lucide-react';
import { getAppAssetPath } from '@/lib/app-path';

interface AppSplashProps {
  message?: string;
}

const BRAND_LOGO_PATH = getAppAssetPath('logo.png');

/**
 * Tela de boot — substitui o "Carregando..." em texto cru.
 * Usada antes da autenticação resolver e enquanto os perfis carregam.
 */
export function AppSplash({ message = 'Carregando...' }: AppSplashProps) {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <img
          src={BRAND_LOGO_PATH}
          alt=""
          aria-hidden="true"
          className="h-20 w-20 object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.4)] animate-pulse"
        />
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
}
