import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "../services/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.forgotPassword(email.trim());
      setResetToken(res.reset_token || "");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center p-4 font-sans">
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
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <span className="text-orange-600 font-bold text-lg">M</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">AdSpectra</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {!submitted ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we'll generate a reset link for you.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
                               text-gray-900 placeholder:text-gray-400 focus:outline-none
                               focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm"
                  >
                    <span>⚠</span> {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5
                             rounded-xl transition-all duration-150 disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating…
                    </span>
                  ) : "Generate Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Reset Link Generated</h2>
                <p className="text-sm text-gray-500 mt-1">Use the token below to reset your password.</p>
              </div>

              {resetToken && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-orange-700 mb-2">Your Reset Token:</p>
                  <p className="text-xs font-mono text-orange-900 break-all">{resetToken}</p>
                </div>
              )}

              <Link
                to={`/reset-password?token=${resetToken}`}
                className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold
                           py-2.5 rounded-xl text-center text-sm transition-all duration-150"
              >
                Reset Password Now →
              </Link>
            </motion.div>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
