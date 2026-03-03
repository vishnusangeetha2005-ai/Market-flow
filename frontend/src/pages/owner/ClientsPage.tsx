import { useEffect, useState } from "react";
import { clients, plans } from "../../services/api";
import type { Client, Plan } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ClientDrawer } from "./ClientDrawer";
import { motion } from "framer-motion";

export function ClientsPage() {
  const [clientList, setClientList] = useState<Client[]>([]);
  const [planList, setPlanList] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cl, pl] = await Promise.all([
        clients.list({ search, status: statusFilter || undefined }),
        plans.list(),
      ]);
      setClientList(cl);
      setPlanList(pl);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const handleAction = async (action: string, id: number) => {
    try {
      if (action === "suspend")  await clients.suspend(id);
      if (action === "activate") await clients.activate(id);
      if (action === "unlock")   await clients.unlock(id);
      if (action === "delete") {
        if (!confirm("Delete this client? This cannot be undone.")) return;
        await clients.delete(id);
      }
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
            {!loading && (
              <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 font-semibold rounded-full border border-orange-100">
                {clientList.length} total
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage all your client accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600
                     text-white text-sm font-semibold rounded-xl shadow-sm
                     transition-all duration-150 hover:shadow-lg hover:shadow-orange-600/20"
        >
          + Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:border-orange-500
                     focus:ring-4 focus:ring-orange-500/10 transition-all shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700
                     focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10
                     transition-all shadow-sm cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden
                      shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clientList.length === 0 ? (
          <div className="p-16 text-center">
            <span className="text-4xl">👥</span>
            <p className="text-gray-500 text-sm mt-3">No clients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Email</th>
                <th className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Plan</th>
                <th className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Last Login</th>
                <th className="text-right px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clientList.map((client, i) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-slate-50/80 cursor-pointer transition-colors duration-100"
                  onClick={() => setSelected(client)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {client.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{client.name}</span>
                      {client.account_locked && (
                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
                          🔒 Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{client.email}</td>
                  <td className="px-6 py-4">
                    {client.plan_name ? (
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                        {client.plan_name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={client.account_locked ? "locked" : client.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {client.last_login ? new Date(client.last_login).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {client.account_locked && (
                        <button onClick={() => handleAction("unlock", client.id)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 hover:bg-amber-50 rounded-lg transition-colors">
                          Unlock
                        </button>
                      )}
                      {client.status === "active" ? (
                        <button onClick={() => handleAction("suspend", client.id)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 hover:bg-amber-50 rounded-lg transition-colors">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => handleAction("activate", client.id)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 hover:bg-emerald-50 rounded-lg transition-colors">
                          Activate
                        </button>
                      )}
                      <button onClick={() => handleAction("delete", client.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <ClientDrawer client={selected} plans={planList} onClose={() => { setSelected(null); load(); }} />
      )}
      {showCreate && (
        <CreateClientModal plans={planList} onClose={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function CreateClientModal({ plans: planList, onClose }: { plans: Plan[]; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", plan_id: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plan_id) { setError("Please select a plan"); return; }
    setLoading(true);
    try {
      await clients.create(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Client</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create a client account and assign a plan</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { field: "name", label: "Full Name", type: "text", placeholder: "e.g. John Smith" },
            { field: "email", label: "Email Address", type: "email", placeholder: "john@company.com" },
            { field: "password", label: "Password", type: "password", placeholder: "Min. 8 characters" },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:border-orange-500
                           focus:ring-4 focus:ring-orange-500/10 transition-all"
                required
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subscription Plan</label>
            <select
              value={form.plan_id}
              onChange={(e) => setForm({ ...form, plan_id: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                         focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all cursor-pointer"
            >
              <option value={0}>Select a plan…</option>
              {planList.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price}/mo</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 text-sm">⚠</span>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
              {loading ? "Creating…" : "Create Client"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
