import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ReactNode } from "react";

export function ClientRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "client") return <Navigate to="/owner/dashboard" replace />;
  return <>{children}</>;
}
