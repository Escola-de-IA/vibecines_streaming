import { useState } from 'react';
import { useProfile, type UserProfile } from '@/contexts/ProfileContext';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'
];

export default function ProfilesPage() {
  const { profiles, selectProfile, createProfile, deleteProfile, accountData } = useProfile();
  const { logout, isAdmin } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const canDeleteProfiles = profiles.length > 1;

  const handleConfirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    setIsDeletingProfile(true);
    try {
      await deleteProfile(profileToDelete.id);
      setProfileToDelete(null);
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const limit = isAdmin ? Infinity : (accountData?.maxProfiles || 1);
    if (profiles.length >= limit) {
      setShowUpgradeModal(true);
      return;
    }

    const avatarId = Math.floor(Math.random() * AVATAR_COLORS.length);
    await createProfile(newName.trim(), avatarId);
    setNewName('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl text-foreground font-bold mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Adicionar Perfil</h1>
        <form onSubmit={handleAdd} className="w-full max-w-sm space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Nome do perfil"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-4">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-foreground bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancelar</button>
            <button type="submit" disabled={!newName.trim()} className="flex-1 py-3 text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">Criar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <button onClick={logout} className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">Sair da Conta</button>
      </div>

      <h1 className="text-4xl md:text-5xl text-foreground font-bold mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        Quem está assistindo?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 md:gap-10 max-w-4xl">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex flex-col items-center gap-3 relative group">
            {isManaging && canDeleteProfiles && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileToDelete(profile);
                }}
                aria-label={`Excluir perfil ${profile.name}`}
                className="absolute -top-2 -right-2 p-1.5 bg-destructive rounded-full z-10 hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
            <button 
              onClick={() => selectProfile(profile.id)}
              className={`w-28 h-28 md:w-36 md:h-36 rounded-xl ${AVATAR_COLORS[profile.avatarId % AVATAR_COLORS.length]} border-[3px] border-transparent group-hover:border-foreground group-focus-visible:border-foreground transition-all shadow-card group-hover:scale-105 group-focus-visible:scale-105 focus:outline-none flex items-center justify-center text-4xl text-white font-bold ${isManaging ? 'opacity-50' : 'opacity-100'}`}
              disabled={isManaging}
            >
              {profile.name.charAt(0).toUpperCase()}
            </button>
            <span className="text-foreground/80 group-hover:text-foreground group-focus-visible:text-foreground font-medium transition-colors">{profile.name}</span>
          </div>
        ))}

        {(isAdmin || profiles.length < 5) && !isManaging && (
          <div className="flex flex-col items-center gap-3 group">
            <button 
              onClick={() => {
                const limit = isAdmin ? Infinity : (accountData?.maxProfiles || 1);
                if (profiles.length >= limit) {
                  setShowUpgradeModal(true);
                } else {
                  setIsAdding(true);
                }
              }}
              className="w-28 h-28 md:w-36 md:h-36 rounded-xl border-[3px] border-secondary bg-transparent group-hover:bg-secondary group-focus-visible:bg-secondary group-hover:border-foreground group-focus-visible:border-foreground transition-all flex items-center justify-center focus:outline-none"
            >
              <Plus className="w-12 h-12 text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground transition-colors" />
            </button>
            <span className="text-foreground/80 group-hover:text-foreground font-medium transition-colors">Adicionar</span>
          </div>
        )}
      </div>

      {profiles.length > 0 && (
        <button 
          onClick={() => setIsManaging(!isManaging)}
          className="mt-12 px-6 py-2 border border-muted-foreground text-muted-foreground hover:border-foreground hover:text-foreground font-medium text-sm transition-colors rounded-sm tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          {isManaging ? 'Concluído' : 'Gerenciar Perfis'}
        </button>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
              <h2 className="text-lg font-bold text-foreground">Limite de Telas Atingido</h2>
              <button onClick={() => setShowUpgradeModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8" />
              </div>
              <p className="text-foreground mb-4">
                Seu plano atual ({accountData?.plan || 'Gratuito'}) permite ter até <strong>{accountData?.maxProfiles || 1} tela(s)</strong> no total.
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Para adicionar ainda mais perfis, é necessário fazer um upgrade na sua conta. Libere o acesso e compartilhe com todos!
              </p>
              <button 
                onClick={() => {
                   setShowUpgradeModal(false);
                   setShowPlansModal(true);
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-glow"
              >
                Fazer Upgrade Agora
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal open={showPlansModal} onClose={() => setShowPlansModal(false)} />

      <ConfirmDialog
        open={!!profileToDelete}
        destructive
        title="Excluir este perfil?"
        description={
          profileToDelete
            ? `O perfil "${profileToDelete.name}" e todo o seu histórico (favoritos, progresso) serão removidos. Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel={isDeletingProfile ? 'Excluindo...' : 'Excluir perfil'}
        loading={isDeletingProfile}
        onConfirm={() => void handleConfirmDeleteProfile()}
        onClose={() => { if (!isDeletingProfile) setProfileToDelete(null); }}
      />
    </div>
  );
}
