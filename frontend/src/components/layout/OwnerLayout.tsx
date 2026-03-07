import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";

const navItems = [
  { path: "/owner/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/owner/clients", label: "Clients", icon: "👥" },
  { path: "/owner/subscriptions", label: "Subscriptions", icon: "💳" },
  { path: "/owner/banner-templates", label: "Banner Templates", icon: "🎨" },
  { path: "/owner/social-monitor", label: "Social Monitor", icon: "📱" },
  { path: "/owner/settings", label: "Settings", icon: "⚙️" },
];

export function OwnerLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar — Orange */}
      <aside className="w-64 bg-orange-600 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/[0.15]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-orange-600 text-sm font-bold">M</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">AdSpectra</span>
          </div>
          <p className="text-orange-200 text-xs mt-1.5 ml-[42px]">Owner Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/[0.20] text-white shadow-sm"
                    : "text-white/70 hover:bg-white/[0.10] hover:text-white"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-4 border-t border-white/[0.15]">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.[0]?.toUpperCase() || "O"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "Owner"}</p>
              <p className="text-xs text-orange-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-red-200 hover:bg-white/[0.08] transition-all duration-150"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
