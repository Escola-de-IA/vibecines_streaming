import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase.config";

type UserRole = "admin" | "user";

interface User {
  email: string;
  name: string;
  role: UserRole;
  uid: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 🔐 LISTA DE EMAILS COM PRIVILÉGIOS DE ADMIN
// Adicione aqui os emails que devem ter acesso administrativo
const ADMIN_EMAILS = [
  "dev@vibecines.com",
  "devj@vibecines.com",
  // Adicione mais emails de administradores aqui
];

// Função para verificar se o email é de admin
const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitora o estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = firebaseUser.email || "";
        
        // Determina o role baseado no email
        const userRole: UserRole = isAdminEmail(userEmail) ? "admin" : "user";
        
        // Usuário está autenticado
        setUser({
          email: userEmail,
          name: firebaseUser.displayName || "Usuário",
          role: userRole,
          uid: firebaseUser.uid,
        });
        
        // Log para debug (remova em produção)
        console.log(`Usuário autenticado: ${userEmail} | Role: ${userRole}`);
      } else {
        // Usuário não está autenticado
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup da inscrição
    return () => unsubscribe();
  }, []);

  // Função de login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err: any) {
      console.error("Erro no login:", err.message);
      return false;
    }
  };

  // Função de registro (cadastro de novo usuário)
  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualiza o perfil com o nome do usuário
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      return true;
    } catch (err: any) {
      console.error("Erro no registro:", err.message);
      return false;
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro no logout:", err);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro do AuthProvider");
  return context;
};