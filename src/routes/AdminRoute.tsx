import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminPanel from "@/components/AdminPanel";

const AdminRoute = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminPanel onClose={() => navigate("/")} />
  );
};

export default AdminRoute;
