import { useEffect, useState } from "react";
import { subscriptions, plans } from "../../services/api";
import type { Subscription, Plan } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { motion } from "framer-motion";

export function SubscriptionsPage() {
  const [subList, setSubList] = useState<Subscription[]>([]);
  const [_planList, setPlanList] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ payment_status: "", status: "", end_date: "" });

  useEffect(() => {
    Promise.all([subscriptions.list(), plans.list()]).then(([s, p]) => {
      setSubList(s);
      setPlanList(p);
      setLoading(false);
    });
  }, []);

  const handleUpdate = async (id: number) => {
    const updates: Record<string, string> = {};
    if (editForm.payment_status) updates.payment_status = editForm.payment_status;
    if (editForm.status)         updates.status         = editForm.status;
    if (editForm.end_date)       updates.end_date        = editForm.end_date;
    await subscriptions.update(id, updates);
    const updated = await subscriptions.list();
    setSubList(updated);
    setEditId(null);
  };

  const selectCls = `w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
    focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all cursor-pointer`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subscriptions</h1>
          {!loading && subList.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 font-semibold rounded-full border border-orange-100">
              {subList.length} active
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Manage client subscription plans and payment status</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden
                      shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subList.length === 0 ? (
          <div className="p-16 text-center">
            <span className="text-4xl">💳</span>
            <p className="text-gray-500 text-sm mt-3">No subscriptions yet</p>
            <p className="text-gray-400 text-xs mt-1">Add clients and assign plans to see them here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                {["Client", "Plan", "Status", "Payment", "Expires", "Actions"].map((h) => (
                  <th key={h} className="text-left px-6 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subList.map((sub, i) => (
                <motion.tr
                  key={sub.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-slate-50/80 transition-colors duration-100"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(sub.client_name ?? "?")[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{sub.client_name ?? "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                      {sub.plan_name}
                    </span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={sub.status} /></td>
                  <td className="px-6 py-4"><StatusBadge status={sub.payment_status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(sub.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setEditId(sub.id);
                        setEditForm({ payment_status: sub.payment_status, status: sub.status, end_date: sub.end_date });
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-2.5 py-1.5
                                 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Subscription</h2>
                <p className="text-xs text-gray-400 mt-0.5">Update plan status and expiry</p>
              </div>
              <button onClick={() => setEditId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
                <select value={editForm.payment_status}
                  onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                  className={selectCls}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subscription Status</label>
                <select value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className={selectCls}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <input type="date" value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className={selectCls} />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-all">
                  Cancel
                </button>
                <button onClick={() => handleUpdate(editId)}
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all">
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
