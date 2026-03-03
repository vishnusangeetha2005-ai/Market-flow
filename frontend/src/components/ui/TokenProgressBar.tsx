interface TokenProgressBarProps {
  used: number;
  limit: number;
}

export function TokenProgressBar({ used, limit }: TokenProgressBarProps) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const barColor =
    pct > 90 ? "from-red-500 to-red-400" :
    pct > 70 ? "from-amber-500 to-amber-400" :
               "from-orange-500 to-amber-400";
  const textColor =
    pct > 90 ? "text-red-600" :
    pct > 70 ? "text-amber-600" :
               "text-orange-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">AI Token Usage</span>
        <span className={`text-sm font-bold ${textColor}`}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{(100 - pct).toFixed(1)}% remaining</p>
        <p className="text-xs text-gray-400">{pct.toFixed(0)}% used</p>
      </div>
    </div>
  );
}
