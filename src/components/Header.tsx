import { motion } from "framer-motion";
import { Play } from "lucide-react";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <span className="text-xl font-bold text-foreground">StreamMax</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#login" className="text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </a>
          <a href="#plans" className="text-muted-foreground hover:text-foreground transition-colors">
            Planos
          </a>
        </nav>
      </div>
    </motion.header>
  );
};

export default Header;
