import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedUserRoute({ children }) {
  const { loadingAuth, isAuthenticated } = useAuth();

  if (loadingAuth) {
    return (
      <div className="page-shell" style={{ padding: "40px", color: "#fff" }}>
        Memeriksa akses user...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}