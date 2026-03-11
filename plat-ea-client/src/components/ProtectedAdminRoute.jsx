import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedAdminRoute({ children }) {
  const { loadingAuth, isAuthenticated, isAdmin } = useAuth();

  if (loadingAuth) {
    return (
      <div className="page-shell" style={{ padding: "40px", color: "#fff" }}>
        Memeriksa akses admin...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}