import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginBg from '@/assets/login-bg-premium.png';
import { useAuth } from '@/contexts/AuthContext';
import { getLastRoute, hasRememberChoice, setRememberChoice } from '@/lib/session';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isSigningIn, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepConnected, setKeepConnected] = useState(hasRememberChoice());
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const destination = hasRememberChoice() ? getLastRoute() : '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const success = await login(email, password, keepConnected);
    if (!success) return;

    setRememberChoice(keepConnected);
    navigate(keepConnected ? getLastRoute() : '/', { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-background/30 backdrop-blur-2xl p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.4)]">
        <h1 className="text-4xl font-bold text-white mb-2 text-center drop-shadow-lg" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-foreground/80 mb-8 text-center font-medium">
          Faça login para acessar o acervo de filmes e séries.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Email</label>
            <input
              type="email"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Senha</label>
            <input
              type="password"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-white/80 font-medium pt-1 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary"
              checked={keepConnected}
              onChange={(e) => setKeepConnected(e.target.checked)}
            />
            Manter conectado
          </label>

          {error && <p className="text-sm text-red-400 font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 hover:scale-[1.02] text-primary-foreground py-3.5 font-bold tracking-wide transition-all disabled:opacity-60 disabled:hover:scale-100 shadow-[0_0_20px_rgba(var(--primary),0.4)]"
          >
            {isSigningIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-white/60 font-medium">
            Ainda não tem uma conta?
          </p>
          <button
            type="button"
            onClick={() => setIsUpgradeOpen(true)}
            className="w-full rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 py-3.5 font-bold transition-all hover:scale-[1.02]"
          >
            Obter Acesso
          </button>
        </div>
      </div>

      <UpgradeModal open={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
