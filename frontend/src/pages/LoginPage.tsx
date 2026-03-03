import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsOwner, loginAsClient } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const trimEmail = email.trim();
    const trimPass = password.trim();
    try {
      try {
        await loginAsOwner(trimEmail, trimPass);
        navigate("/owner/dashboard");
        return;
      } catch { /* not owner */ }
      await loginAsClient(trimEmail, trimPass);
      navigate("/client/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center p-4 font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.20),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-gray-900 font-bold text-2xl tracking-tight">MarketFlow</span>
          </div>
          <p className="text-gray-500 text-sm">AI-Powered Digital Marketing Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:border-orange-500
                           focus:ring-4 focus:ring-orange-500/10 transition-all duration-150"
                placeholder="you@example.com"
                autoComplete="off"
                required
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
                           focus:ring-4 focus:ring-orange-500/10 transition-all duration-150"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm"
              >
                <span className="text-base leading-none">⚠</span>
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl
                         transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-sm hover:shadow-lg hover:shadow-orange-600/25 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Owner?{" "}
          <Link to="/owner-login" className="text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2">
            Owner login →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
