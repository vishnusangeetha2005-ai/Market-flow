type StatusType =
  | "active" | "suspended" | "locked"
  | "published" | "scheduled" | "draft" | "failed" | "partial"
  | "paid" | "pending" | "overdue" | "cancelled"
  | "success" | string;

const colors: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  success:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-amber-50  text-amber-700  border-amber-200",
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  scheduled: "bg-orange-50 text-orange-600 border-orange-200",
  draft:     "bg-slate-100 text-slate-500  border-slate-200",
  cancelled: "bg-slate-100 text-slate-500  border-slate-200",
  locked:    "bg-red-50    text-red-600    border-red-200",
  failed:    "bg-red-50    text-red-600    border-red-200",
  overdue:   "bg-red-50    text-red-600    border-red-200",
  partial:   "bg-orange-50 text-orange-600 border-orange-200",
};

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-semibold capitalize
                      ${colors[status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}
