import { FormEvent, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Loader2, RefreshCw, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { db, type UserRole } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  callBootstrapOwner,
  callCreateUser,
  callDeleteUser,
  callRenewSubscription,
  callResetUserPassword,
  callSetUserRole,
  type CreateUserPayload,
} from '@/lib/functions';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  plan: string;
  maxProfiles: number;
  /** epoch ms ou null (owner) */
  expiresAt: number | null;
  createdAt?: number;
}

const PLANS_USER = [
  { label: 'Gratuito', maxProfiles: 1 },
  { label: 'Mensal - 2 telas', maxProfiles: 2 },
  { label: 'Mensal - 3 telas', maxProfiles: 3 },
  { label: 'Mensal - 5 telas', maxProfiles: 5 },
  { label: 'Trimestre - 2 telas', maxProfiles: 2 },
  { label: 'Trimestre - 3 telas', maxProfiles: 3 },
  { label: 'Trimestre - 5 telas', maxProfiles: 5 },
  { label: 'Anual - 2 telas', maxProfiles: 2 },
  { label: 'Anual - 3 telas', maxProfiles: 3 },
  { label: 'Anual - 5 telas', maxProfiles: 5 },
] as const;

const PLANS_ADMIN = [{ label: 'ADMIN', maxProfiles: 5 }] as const;

type TabKey = 'users' | 'admins';

const MS_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_DAYS_USER = 30;
const DEFAULT_DAYS_ADMIN = 365;

function toDateInputValue(epochMs: number | null): string {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputValue(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(`${value}T23:59:59`);
  return Number.isFinite(ms) ? ms : null;
}

function defaultExpiresAtFor(role: UserRole): number {
  const days = role === 'admin' ? DEFAULT_DAYS_ADMIN : DEFAULT_DAYS_USER;
  return Date.now() + days * MS_DAY;
}

function statusBadge(expiresAt: number | null) {
  if (expiresAt === null) {
    return { label: 'Sem validade', tone: 'bg-primary/10 text-primary border-primary/20' };
  }
  const now = Date.now();
  const diffDays = Math.ceil((expiresAt - now) / MS_DAY);
  if (diffDays <= 0) {
    return { label: 'EXPIRADO', tone: 'bg-destructive/15 text-destructive border-destructive/30' };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d restantes`, tone: 'bg-amber-500/15 text-amber-500 border-amber-500/30' };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d restantes`, tone: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/30' };
  }
  return { label: `${diffDays}d restantes`, tone: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
}

function formatExpires(epochMs: number | null): string {
  if (!epochMs) return '—';
  return new Date(epochMs).toLocaleDateString('pt-BR');
}

export default function AdminUsers() {
  const { isAdmin, isOwner, isPrimaryOwner, user, refreshClaims } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const [isBootstrappingOwner, setIsBootstrappingOwner] = useState(false);

  // Form de criação
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newPlan, setNewPlan] = useState<string>('Gratuito');
  const [newExpiresAt, setNewExpiresAt] = useState<string>(toDateInputValue(defaultExpiresAtFor('user')));

  // Renovação
  const [renewTarget, setRenewTarget] = useState<UserData | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [renewPlan, setRenewPlan] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);

  // Reset de senha
  const [resetTarget, setResetTarget] = useState<UserData | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmação de troca de papel
  const [roleTarget, setRoleTarget] = useState<{ user: UserData; nextRole: UserRole } | null>(null);
  const [isTogglingRole, setIsTogglingRole] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const loaded: UserData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.email) return;
          loaded.push({
            id: docSnap.id,
            email: data.email,
            role: (data.role as UserRole | undefined) ?? 'user',
            plan: data.plan ?? 'Gratuito',
            maxProfiles: data.maxProfiles ?? 1,
            expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null,
            createdAt: data.createdAt,
          });
        });
        loaded.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setUsers(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn('[AdminUsers] users snapshot failed', err);
        setUsers([]);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [isAdmin, navigate, usersReloadKey]);

  // Quando muda role no form, ajusta plano e data padrão
  useEffect(() => {
    if (newRole === 'admin') {
      setNewPlan(PLANS_ADMIN[0].label);
      setNewExpiresAt(toDateInputValue(defaultExpiresAtFor('admin')));
    } else {
      setNewPlan(PLANS_USER[0].label);
      setNewExpiresAt(toDateInputValue(defaultExpiresAtFor('user')));
    }
  }, [newRole]);

  const visible = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'owner') return false; // owner não aparece nas abas
      if (activeTab === 'admins') return u.role === 'admin';
      return u.role === 'user';
    });
  }, [users, activeTab]);

  const ownerRow = useMemo(() => users.find((u) => u.role === 'owner') ?? null, [users]);
  const showOwnerBootstrap = isOwner && !loading && !ownerRow;

  const handleBootstrapOwner = async () => {
    setIsBootstrappingOwner(true);
    try {
      await callBootstrapOwner();
      await refreshClaims();
      setUsersReloadKey((key) => key + 1);
      toast.success('Owner ativado com sucesso.', {
        description: 'Se as permissoes nao atualizarem na hora, saia e entre novamente.',
      });
    } catch (err) {
      toast.error('Erro ao ativar owner', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsBootstrappingOwner(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    setIsCreating(true);

    const planConfig = newRole === 'admin'
      ? PLANS_ADMIN[0]
      : PLANS_USER.find((p) => p.label === newPlan) ?? PLANS_USER[0];

    const payload: CreateUserPayload = {
      email: newEmail.trim(),
      password: newPassword,
      role: newRole,
      plan: planConfig.label,
      maxProfiles: planConfig.maxProfiles,
      expiresAt: fromDateInputValue(newExpiresAt),
    };

    try {
      await callCreateUser(payload);
      await refreshClaims();
      setUsersReloadKey((key) => key + 1);
      toast.success(`${newRole === 'admin' ? 'Administrador' : 'Cliente'} criado com sucesso.`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setIsAddingUser(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar usuário';
      toast.error('Falha ao criar usuário', { description: message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await callDeleteUser({ uid: deleteTarget.id });
      toast.success(`${deleteTarget.email} foi excluído.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Erro ao excluir', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsDeleting(false);
    }
  };

  const openRenew = (u: UserData) => {
    setRenewTarget(u);
    setRenewDate(toDateInputValue(u.expiresAt ?? defaultExpiresAtFor(u.role)));
    setRenewPlan(u.plan);
  };

  const handleRenew = async (e: FormEvent) => {
    e.preventDefault();
    if (!renewTarget) return;
    const ms = fromDateInputValue(renewDate);
    if (!ms) {
      alert('Data inválida.');
      return;
    }
    setIsRenewing(true);
    try {
      const planConfig = renewTarget.role === 'admin'
        ? PLANS_ADMIN[0]
        : PLANS_USER.find((p) => p.label === renewPlan) ?? PLANS_USER[0];
      await callRenewSubscription({
        uid: renewTarget.id,
        expiresAt: ms,
        plan: planConfig.label,
        maxProfiles: planConfig.maxProfiles,
      });
      toast.success(`Validade de ${renewTarget.email} atualizada.`);
      setRenewTarget(null);
    } catch (err) {
      toast.error('Erro ao renovar', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsRenewing(false);
    }
  };

  const openReset = (u: UserData) => {
    setResetTarget(u);
    setResetPassword('');
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPassword.length < 6) return;
    setIsResetting(true);
    try {
      await callResetUserPassword({ uid: resetTarget.id, newPassword: resetPassword });
      toast.success(`Senha de ${resetTarget.email} redefinida.`);
      setResetTarget(null);
    } catch (err) {
      toast.error('Erro ao redefinir senha', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsResetting(false);
    }
  };

  const openToggleRole = (u: UserData) => {
    if (!isPrimaryOwner) return;
    const nextRole: UserRole = u.role === 'admin' ? 'user' : 'admin';
    setRoleTarget({ user: u, nextRole });
  };

  const handleConfirmToggleRole = async () => {
    if (!roleTarget) return;
    setIsTogglingRole(true);
    try {
      await callSetUserRole({ uid: roleTarget.user.id, role: roleTarget.nextRole });
      toast.success(
        `${roleTarget.user.email} agora é ${roleTarget.nextRole === 'admin' ? 'Administrador' : 'Cliente'}.`,
      );
      setRoleTarget(null);
    } catch (err) {
      toast.error('Erro ao alterar papel', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsTogglingRole(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pt-6 md:pt-8 pb-12 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <button onClick={() => navigate(-1)} className="text-foreground/70 hover:text-foreground mb-4 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1
            className="text-4xl font-bold text-foreground flex items-center gap-3"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
          >
            <Users className="w-8 h-8 text-primary" />
            Gerenciar Usuários
          </h1>
          <button
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Novo {isPrimaryOwner ? 'usuário/admin' : 'usuário'}
          </button>
        </div>

        {/* Linha do Dono (se houver) */}
        {ownerRow && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Dono</p>
              <p className="text-foreground font-medium">{ownerRow.email}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground tracking-widest shadow-glow">
              OWNER
            </span>
          </div>
        )}

        {showOwnerBootstrap && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Bootstrap</p>
              <p className="text-foreground font-medium">Ativar owner inicial</p>
            </div>
            <button
              onClick={() => void handleBootstrapOwner()}
              disabled={isBootstrappingOwner}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 transition-colors disabled:opacity-60"
            >
              {isBootstrappingOwner ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Ativar owner
            </button>
          </div>
        )}

        {/* Tabs (só dono principal vê 'Admins'). Admin comum só gerencia Users. */}
        {isPrimaryOwner && (
          <div className="mb-4 inline-flex bg-secondary p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'admins' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Administradores
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-card/50 border border-border rounded-xl flex-col flex overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">E-mail</th>
                    <th className="px-6 py-4 font-medium">Plano</th>
                    <th className="px-6 py-4 font-medium">Telas</th>
                    <th className="px-6 py-4 font-medium">Validade</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((u) => {
                    const status = statusBadge(u.expiresAt);
                    const canRenew = isPrimaryOwner || u.role === 'user';
                    const canResetPassword = u.id !== user?.uid && (isPrimaryOwner || u.role === 'user');
                    const canDelete = u.id !== user?.uid && isPrimaryOwner;
                    return (
                      <tr key={u.id} className="bg-card hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{u.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">{u.plan}</td>
                        <td className="px-6 py-4 text-muted-foreground">{u.maxProfiles}</td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{formatExpires(u.expiresAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${status.tone}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {canRenew && (
                              <button
                                onClick={() => openRenew(u)}
                                title="Renovar"
                                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            {canResetPassword && (
                              <button
                                onClick={() => openReset(u)}
                                title="Resetar senha"
                                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                            {isPrimaryOwner && (
                              <>
                                <button
                                  onClick={() => openToggleRole(u)}
                                  title={u.role === 'admin' ? 'Rebaixar para Cliente' : 'Promover a Admin'}
                                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors border border-border"
                                >
                                  {u.role === 'admin' ? 'Rebaixar' : 'Promover'}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                title="Excluir"
                                className="p-2 w-10 min-w-[40px] flex items-center justify-center text-destructive bg-destructive/10 hover:bg-destructive hover:text-white rounded-lg transition-colors border border-destructive/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        Nenhum {activeTab === 'admins' ? 'administrador' : 'cliente'} cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Novo usuário/admin */}
      {isAddingUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
              <h2 className="text-lg font-bold text-foreground">Novo usuário</h2>
              <button disabled={isCreating} onClick={() => setIsAddingUser(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {isPrimaryOwner && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('user')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      newRole === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      newRole === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    Administrador
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  placeholder="usuario@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {newRole === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Plano</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                  >
                    {PLANS_USER.map((p) => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Validade (último dia de acesso)</label>
                <input
                  type="date"
                  required
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renovar */}
      {renewTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
              <h2 className="text-lg font-bold text-foreground">Renovar {renewTarget.email}</h2>
              <button disabled={isRenewing} onClick={() => setRenewTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRenew} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nova validade</label>
                <input
                  type="date"
                  required
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground"
                />
              </div>
              {renewTarget.role === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Plano</label>
                  <select
                    value={renewPlan}
                    onChange={(e) => setRenewPlan(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground"
                  >
                    {PLANS_USER.map((p) => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isRenewing}
                  onClick={() => setRenewTarget(null)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  {isRenewing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Renovar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset senha */}
      {resetTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
              <h2 className="text-lg font-bold text-foreground">Nova senha para {resetTarget.email}</h2>
              <button disabled={isResetting} onClick={() => setResetTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReset} className="p-6 space-y-4">
              <input
                type="password"
                required
                minLength={6}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground"
              />
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetPassword.length < 6}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação: excluir usuário */}
      <ConfirmDialog
        open={!!deleteTarget}
        destructive
        title="Excluir este usuário?"
        description={
          deleteTarget
            ? `Esta ação remove o login de ${deleteTarget.email} e apaga os dados associados. Não pode ser desfeita.`
            : undefined
        }
        confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
        loading={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => { if (!isDeleting) setDeleteTarget(null); }}
      />

      {/* Confirmação: trocar papel */}
      <ConfirmDialog
        open={!!roleTarget}
        title={
          roleTarget?.nextRole === 'admin'
            ? 'Promover a Administrador?'
            : 'Rebaixar para Cliente?'
        }
        description={
          roleTarget
            ? `${roleTarget.user.email} passará a ter as permissões de ${
                roleTarget.nextRole === 'admin' ? 'Administrador' : 'Cliente'
              }.`
            : undefined
        }
        confirmLabel={isTogglingRole ? 'Aplicando...' : 'Confirmar'}
        loading={isTogglingRole}
        onConfirm={() => void handleConfirmToggleRole()}
        onClose={() => { if (!isTogglingRole) setRoleTarget(null); }}
      />
    </div>
  );
}
