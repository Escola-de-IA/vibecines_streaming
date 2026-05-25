import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

/**
 * Tela bloqueante exibida quando o usuário logado está com `expiresAt` no
 * passado. Owner nunca cai aqui (não tem expiração).
 *
 * - Admin → "Renovação de contrato"
 * - Cliente → "Renovação de plano" (mostra o plano atual)
 *
 * Por enquanto o CTA principal é WhatsApp/contato; quando a Fase D estiver
 * pronta, troca para `/checkout` reabrindo o gateway com o mesmo plano.
 */
export function ExpirationGate() {
  const { user, claims, logout } = useAuth();
  const { accountData } = useProfile();

  const isAdmin = claims.role === 'admin';
  const heading = isAdmin ? 'Seu contrato expirou' : 'Seu plano expirou';
  const lead = isAdmin
    ? 'Para continuar gerenciando o sistema, renove seu contrato com a administração.'
    : 'Para voltar a assistir, renove o seu plano. Você pode continuar com o mesmo plano de antes.';

  const planToRenew = accountData?.plan && accountData.plan !== 'Gratuito'
    ? accountData.plan
    : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-card text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive">
          <Clock className="h-8 w-8" />
        </div>

        <h1
          className="text-3xl md:text-4xl font-bold text-foreground"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
        >
          {heading}
        </h1>

        <p className="mt-3 text-sm md:text-base text-muted-foreground">{lead}</p>

        {!isAdmin && planToRenew && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Plano anterior</p>
            <p className="mt-1 text-lg font-bold text-primary">{planToRenew}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Já renovei, atualizar
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-6 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {user?.email && <>Conta: <span className="font-medium text-foreground/80">{user.email}</span></>}
        </p>
      </div>
    </div>
  );
}
