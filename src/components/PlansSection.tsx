import { motion } from "framer-motion";
import PlanCard from "./PlanCard";

const plans = [
  {
    name: "Básico",
    price: "R$ 19,90",
    period: "mês",
    icon: "basic" as const,
    features: [
      "Acesso a todo catálogo",
      "1 tela simultânea",
      "Qualidade HD (720p)",
      "Assista no celular e tablet",
      "Cancele quando quiser",
    ],
  },
  {
    name: "Padrão",
    price: "R$ 39,90",
    period: "mês",
    icon: "standard" as const,
    isPopular: true,
    features: [
      "Tudo do Básico, mais:",
      "2 telas simultâneas",
      "Qualidade Full HD (1080p)",
      "Downloads para assistir offline",
      "Sem anúncios",
    ],
  },
  {
    name: "Premium",
    price: "R$ 59,90",
    period: "mês",
    icon: "premium" as const,
    isPremium: true,
    features: [
      "Tudo do Padrão, mais:",
      "4 telas simultâneas",
      "Qualidade 4K + HDR",
      "Áudio Dolby Atmos",
      "Lançamentos exclusivos",
      "Acesso antecipado",
    ],
  },
];

const PlansSection = () => {
  return (
    <section id="plans" className="py-20 lg:py-32 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Escolha seu plano
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Assine hoje e tenha acesso ilimitado a milhares de filmes, séries e documentários exclusivos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.name}
              {...plan}
              delay={index * 0.1}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground text-sm mt-12"
        >
          Todos os planos incluem 7 dias grátis. Cancele a qualquer momento.
        </motion.p>
      </div>
    </section>
  );
};

export default PlansSection;
