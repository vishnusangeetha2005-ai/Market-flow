import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../services/api";
import type { AuthState } from "../types";

interface AuthContextType extends AuthState {
  loginAsOwner: (email: string, password: string) => Promise<void>;
  loginAsClient: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Legacy compatibility fields
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAuthenticated: false,
    accessToken: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role") as "owner" | "client" | null;
    const userStr = localStorage.getItem("user_info");
    if (token && role && userStr) {
      setState({
        user: JSON.parse(userStr),
        role,
        isAuthenticated: true,
        accessToken: token,
      });
    }
  }, []);

  const loginAsOwner = async (email: string, password: string) => {
    const res = await auth.ownerLogin(email, password);
    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("refresh_token", res.refresh_token);
    localStorage.setItem("user_role", "owner");
    const userInfo = { email, name: "Owner" };
    localStorage.setItem("user_info", JSON.stringify(userInfo));
    setState({
      user: userInfo,
      role: "owner",
      isAuthenticated: true,
      accessToken: res.access_token,
    });
  };

  const loginAsClient = async (email: string, password: string) => {
    const res = await auth.clientLogin(email, password);
    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("refresh_token", res.refresh_token);
    localStorage.setItem("user_role", "client");
    const userInfo = { email, name: email.split("@")[0] };
    localStorage.setItem("user_info", JSON.stringify(userInfo));
    setState({
      user: userInfo,
      role: "client",
      isAuthenticated: true,
      accessToken: res.access_token,
    });
  };

  // Legacy login method for backward compatibility
  const login = async (email: string, password: string) => {
    await loginAsClient(email, password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_info");
    setState({ user: null, role: null, isAuthenticated: false, accessToken: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, loginAsOwner, loginAsClient, logout, isLoading: false, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Compatibility alias for legacy components
export const useAuthContext = useAuth;
