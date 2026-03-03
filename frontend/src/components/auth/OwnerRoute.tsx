import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ReactNode } from "react";

export function OwnerRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "owner") return <Navigate to="/client/dashboard" replace />;
  return <>{children}</>;
}
