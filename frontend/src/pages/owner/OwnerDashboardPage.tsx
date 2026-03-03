import { useEffect, useState } from "react";
import { dashboard } from "../../services/api";
import { StatCard } from "../../components/ui/StatCard";
import type { OwnerStats } from "../../types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#F97316", "#FB923C", "#10B981"];

export function OwnerDashboardPage() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboard.ownerStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-white rounded-xl w-48 animate-pulse shadow-sm" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 h-28 animate-pulse shadow-sm" />
        ))}
      </div>
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 text-sm">
      ⚠ Error loading dashboard: {error}
    </div>
  );
  if (!stats) return null;

  const pieData = Object.entries(stats.subscription_breakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Owner Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all clients, revenue and activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients"    value={stats.total_clients}                              icon="👥" color="blue" />
        <StatCard title="Active Clients"   value={stats.active_clients}                             icon="✅" color="green" />
        <StatCard title="Suspended"        value={stats.suspended_clients}                          icon="⏸️" color="yellow" />
        <StatCard title="Locked"           value={stats.locked_clients}                             icon="🔒" color="red" />
        <StatCard title="Monthly Revenue"  value={`$${stats.monthly_revenue.toFixed(0)}`}           icon="💰" color="green" />
        <StatCard title="Total Revenue"    value={`$${stats.total_revenue.toFixed(0)}`}             icon="📈" color="blue" />
        <StatCard title="AI Tokens Used"   value={stats.total_ai_tokens_used.toLocaleString()}      icon="🤖" color="cyan" />
        <StatCard title="Scheduled Posts"  value={stats.scheduled_posts}                            icon="📅" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6
                        shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Revenue Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 font-semibold rounded-full border border-orange-100">
              Monthly
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.revenue_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#F97316"
                strokeWidth={2.5}
                dot={{ fill: "#F97316", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#F97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6
                        shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900">Subscriptions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Plan breakdown</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ color: "#6B7280", fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-sm">No subscriptions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
