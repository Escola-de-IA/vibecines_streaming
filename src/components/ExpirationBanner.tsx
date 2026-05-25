import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const WARNING_DAYS = 7;
const DISMISS_KEY = STORAGE_KEYS.expirationBannerDismissedAt;

/**
 * Banner fixo no topo que aparece nos N dias finais antes da expiração.
 * Owner nunca vê. Dismissível por sessão (reaparece se o user trocar de dia).
 */
export function ExpirationBanner() {
  const { isAuthenticated, isOwner, expiresInDays, claims } = useAuth();
  const [dismissedAt, setDismissedAt] = useState<number | null>(() => {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    return raw ? Number.parseInt(raw, 10) : null;
  });

  const todayKey = useMemo(() => {
    const now = new Date();
    return Number.parseInt(`${now.getFullYear()}${now.getMonth()}${now.getDate()}`, 10);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isOwner) return;
    if (dismissedAt === todayKey) return;
  }, [isAuthenticated, isOwner, dismissedAt, todayKey]);

  if (!isAuthenticated || isOwner) return null;
  if (expiresInDays === null) return null;
  if (expiresInDays > WARNING_DAYS) return null;
  if (expiresInDays <= 0) return null; // já expirou → ExpirationGate cuida
  if (dismissedAt === todayKey) return null;

  const isAdmin = claims.role === 'admin';
  const dayWord = expiresInDays === 1 ? 'dia' : 'dias';

  return (
    <div className="sticky top-0 z-[60] w-full bg-destructive/10 border-b border-destructive/30 text-destructive">
      <div className="mx-auto max-w-[1800px] px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="truncate">
            <strong>
              {isAdmin ? 'Seu contrato' : 'Seu plano'} vence em {expiresInDays} {dayWord}.
            </strong>{' '}
            {isAdmin
              ? 'Procure a administração para renovação.'
              : 'Renove agora para não perder o acesso.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, String(todayKey));
            setDismissedAt(todayKey);
          }}
          className="p-1.5 rounded-md hover:bg-destructive/15 shrink-0"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
