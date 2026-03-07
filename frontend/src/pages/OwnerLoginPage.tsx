import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export function OwnerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsOwner } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginAsOwner("owner@marketflow.io", "Admin123456");
      navigate("/owner/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAsOwner(email.trim(), password.trim());
      navigate("/owner/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center p-4 font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(255,255,255,0.20),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-gray-900 font-bold text-2xl tracking-tight">AdSpectra</span>
          </div>
          <p className="text-gray-500 text-sm">Owner Administration Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {/* Owner badge */}
          <div className="flex items-center justify-center mb-6">
            <span className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 font-semibold rounded-full border border-orange-100">
              👑 Owner Access
            </span>
          </div>

          {/* Quick login */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl
                       transition-all duration-150 disabled:opacity-50 shadow-sm
                       hover:shadow-lg hover:shadow-orange-500/25 text-sm mb-5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : "⚡ Quick Login (one click)"}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-gray-400 text-xs font-medium">or enter manually</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:border-orange-500
                           focus:ring-4 focus:ring-orange-500/10 transition-all"
                placeholder="owner@marketflow.io"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:border-orange-500
                           focus:ring-4 focus:ring-orange-500/10 transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm"
              >
                <span>⚠</span> {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-xl
                         transition-all duration-150 disabled:opacity-50 text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
