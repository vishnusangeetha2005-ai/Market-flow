import { useEffect, useState } from "react";
import { dashboard } from "../../services/api";
import { StatCard } from "../../components/ui/StatCard";
import { TokenProgressBar } from "../../components/ui/TokenProgressBar";
import type { ClientStats } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function ClientDashboardPage() {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.clientStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your marketing activity overview</p>
      </div>
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!stats) return null;

  const daysRemaining = stats.subscription_end_date
    ? Math.max(0, Math.ceil((new Date(stats.subscription_end_date).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your marketing activity overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Posts Published" value={stats.posts_published} icon="✅" color="green" />
        <StatCard title="Scheduled"       value={stats.posts_scheduled} icon="📅" color="orange" />
        <StatCard title="Failed Posts"    value={stats.posts_failed}    icon="❌" color="red" />
        <StatCard title="Banners"         value={stats.banners_generated} icon="🖼️" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-gray-900 font-semibold mb-4">AI Token Usage</h3>
          <TokenProgressBar used={stats.tokens_used} limit={stats.tokens_limit} />
          <p className="text-xs text-gray-500 mt-3">Resets monthly with your plan</p>
        </div>

        {/* Subscription */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-gray-900 font-semibold mb-4">Subscription</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm text-gray-900 font-medium">{stats.plan_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={stats.subscription_status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Days Remaining</span>
              <span className={`text-sm font-medium ${daysRemaining < 7 ? "text-red-500" : "text-gray-900"}`}>
                {daysRemaining} days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
