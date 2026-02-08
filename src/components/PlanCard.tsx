import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  isPremium?: boolean;
  icon: "basic" | "standard" | "premium";
  delay: number;
}

const iconMap = {
  basic: Zap,
  standard: Star,
  premium: Crown,
};

const PlanCard = ({
  name,
  price,
  period,
  features,
  isPopular = false,
  isPremium = false,
  icon,
  delay,
}: PlanCardProps) => {
  const { toast } = useToast();
  const Icon = iconMap[icon];

  const handleSubscribe = () => {
    toast({
      title: "Assinatura iniciada!",
      description: `Você selecionou o plano ${name}. Redirecionando para o pagamento...`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className={`relative glass-card rounded-2xl p-6 lg:p-8 card-hover ${
        isPopular ? "ring-2 ring-primary" : ""
      } ${isPremium ? "ring-2 ring-amber-500" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full text-xs font-semibold text-primary-foreground">
          Mais Popular
        </div>
      )}
      
      {isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 rounded-full text-xs font-semibold text-white">
          Premium
        </div>
      )}

      <div className="text-center mb-6">
        <div
          className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center ${
            isPremium
              ? "bg-gradient-to-br from-amber-500 to-orange-500"
              : isPopular
              ? "bg-primary"
              : "bg-secondary"
          }`}
        >
          <Icon className={`w-7 h-7 ${isPremium || isPopular ? "text-white" : "text-foreground"}`} />
        </div>
        
        <h3 className={`text-xl font-bold mb-2 ${isPremium ? "gradient-text-premium" : "text-foreground"}`}>
          {name}
        </h3>
        
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isPremium ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"
            }`}>
              <Check className="w-3 h-3" />
            </div>
            <span className="text-muted-foreground text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={handleSubscribe}
        className={`w-full h-12 font-semibold ${
          isPremium
            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            : isPopular
            ? "btn-primary-gradient text-primary-foreground"
            : "bg-secondary hover:bg-muted text-foreground"
        }`}
      >
        Assinar Agora
      </Button>
    </motion.div>
  );
};

export default PlanCard;
