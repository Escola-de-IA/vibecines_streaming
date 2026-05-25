import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const PLAN_DATA = {
  Mensal: [
    { telas: 2, price: '19,90', link: 'https://wa.me/' },
    { telas: 3, price: '24,90', link: 'https://wa.me/' },
    { telas: 5, price: '29,90', link: 'https://wa.me/' },
  ],
  Trimestral: [
    { telas: 2, price: '49,90', link: 'https://wa.me/' },
    { telas: 3, price: '59,90', link: 'https://wa.me/' },
    { telas: 5, price: '79,90', link: 'https://wa.me/' },
  ],
  Anual: [
    { telas: 2, price: '149,90', link: 'https://wa.me/' },
    { telas: 3, price: '189,90', link: 'https://wa.me/' },
    { telas: 5, price: '249,90', link: 'https://wa.me/' },
  ],
};

type PlanPeriod = keyof typeof PLAN_DATA;

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [activeTab, setActiveTab] = useState<PlanPeriod>('Mensal');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl border border-border flex flex-col animate-in fade-in zoom-in-95 duration-300 relative">
        
        {/* Header */}
        <div className="relative p-6 md:p-8 text-center border-b border-border bg-gradient-to-b from-primary/10 to-transparent shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-secondary/50 hover:bg-secondary rounded-full text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            Faça um <span className="text-primary">Upgrade</span> no seu plano
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Para adicionar mais telas e convidar mais pessoas para assistir com você, escolha um dos nossos planos premium abaixo. Desbloqueie todo o potencial da sua conta agora mesmo!
          </p>
        </div>

        <div className="overflow-y-auto p-6">
          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-secondary p-1 rounded-xl">
            {(Object.keys(PLAN_DATA) as PlanPeriod[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {PLAN_DATA[activeTab].map((plan, i) => (
              <div 
                key={i} 
                className="relative bg-secondary/30 border border-border rounded-xl p-5 flex flex-col hover:border-primary/50 transition-colors group"
              >
                {plan.telas === 5 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full shadow-glow">
                    Mais Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.telas} Telas</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">R$</span>
                    <span className="text-4xl font-extrabold text-foreground tracking-tighter">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{activeTab.toLowerCase()}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    Crie até {plan.telas} perfis na conta
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    Assista em {plan.telas} telas simultâneas
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    Resolução Máxima 4K
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    Sem anúncios
                  </div>
                </div>

                <a 
                  href={plan.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl font-bold text-center transition-all ${
                    plan.telas === 5 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow' 
                      : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border hover:border-foreground/20'
                  }`}
                >
                  Assinar Agora
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
