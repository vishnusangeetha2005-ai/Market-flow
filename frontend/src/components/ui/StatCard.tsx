import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
  variant?: "light" | "dark";
}

const iconBgLight: Record<string, string> = {
  purple: "bg-violet-50",
  blue:   "bg-orange-50",
  green:  "bg-emerald-50",
  red:    "bg-red-50",
  yellow: "bg-amber-50",
  cyan:   "bg-amber-50",
};

const iconBgDark: Record<string, string> = {
  purple: "bg-violet-900/30",
  blue:   "bg-orange-900/30",
  green:  "bg-emerald-900/30",
  red:    "bg-red-900/30",
  yellow: "bg-amber-900/30",
  cyan:   "bg-amber-900/30",
};

const valueColorLight: Record<string, string> = {
  purple: "text-violet-600",
  blue:   "text-orange-600",
  green:  "text-emerald-600",
  red:    "text-red-500",
  yellow: "text-amber-600",
  cyan:   "text-amber-500",
};

const valueColorDark: Record<string, string> = {
  purple: "text-violet-400",
  blue:   "text-orange-400",
  green:  "text-emerald-400",
  red:    "text-red-400",
  yellow: "text-amber-400",
  cyan:   "text-amber-400",
};

export function StatCard({ title, value, icon, color = "blue", subtitle, variant = "light" }: StatCardProps) {
  const isDark = variant === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 transition-all duration-200 ${
        isDark
          ? "bg-gray-900 border border-gray-800 hover:border-gray-700"
          : "bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            isDark
              ? (valueColorDark[color] ?? "text-white")
              : (valueColorLight[color] ?? "text-gray-900")
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs mt-1.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isDark
            ? (iconBgDark[color] ?? "bg-gray-800")
            : (iconBgLight[color] ?? "bg-slate-50")
        }`}>
          <span className="text-xl leading-none">{icon}</span>
        </div>
      </div>
    </motion.div>
  );
}
