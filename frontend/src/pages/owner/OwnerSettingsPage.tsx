import { useState, useEffect } from "react";
import { ownerSettings } from "../../services/api";

const inputCls = `w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
  placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all`;

const cardCls = `bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]`;

export function OwnerSettingsPage() {
  const [info, setInfo] = useState<{ name: string; email: string; openai_configured: boolean; app_name: string } | null>(null);

  // Name edit
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    ownerSettings.get().then((d) => {
      setInfo(d);
      setName(d.name);
    });
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name cannot be empty"); return; }
    setNameError("");
    setSavingName(true);
    try {
      await ownerSettings.updateName(name.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd) { setPwdError("Enter your current password"); return; }
    if (newPwd.length < 8) { setPwdError("New password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    setPwdError("");
    setSavingPwd(true);
    try {
      await ownerSettings.changePassword(currentPwd, newPwd);
      setPwdSaved(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Owner account settings and configuration</p>
      </div>

      {/* Account info */}
      <div className={cardCls}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {info?.name?.[0]?.toUpperCase() || "O"}
          </div>
          <div>
            <p className="text-gray-900 font-semibold">{info?.name}</p>
            <p className="text-gray-500 text-sm">{info?.email}</p>
            <p className="text-orange-600 text-xs mt-0.5 font-medium">Owner / Administrator</p>
          </div>
        </div>

        {/* Edit Name */}
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className={inputCls}
            />
          </div>
          {nameError && <p className="text-red-500 text-xs">{nameError}</p>}
          <button
            type="submit"
            disabled={savingName}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {savingName ? "Saving…" : nameSaved ? "✓ Name Updated!" : "Update Name"}
          </button>
          {nameSaved && <p className="text-emerald-600 text-xs text-center">Name updated successfully.</p>}
        </form>
      </div>

      {/* Change Password */}
      <div className={cardCls}>
        <h3 className="text-base font-bold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter current password"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Minimum 8 characters"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              className={inputCls}
            />
          </div>
          {pwdError && <p className="text-red-500 text-xs">{pwdError}</p>}
          {pwdSaved && <p className="text-emerald-600 text-xs">✓ Password changed successfully!</p>}
          <button
            type="submit"
            disabled={savingPwd}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {savingPwd ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>

      {/* System status */}
      <div className={cardCls}>
        <h3 className="text-base font-bold text-gray-900 mb-4">System Status</h3>
        <div className="space-y-0 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">App Name</p>
              <p className="text-xs text-gray-400 mt-0.5">Set via APP_NAME environment variable</p>
            </div>
            <span className="text-sm font-medium text-gray-600">{info?.app_name}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">OpenAI API Key</p>
              <p className="text-xs text-gray-400 mt-0.5">Set via OPENAI_API_KEY environment variable</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
              info?.openai_configured
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-amber-700 bg-amber-50 border-amber-200"
            }`}>
              {info?.openai_configured ? "✓ Configured" : "⚠ Mock Mode"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Auto-Posting Scheduler</p>
              <p className="text-xs text-gray-400 mt-0.5">Runs every minute — checks all enabled automations</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full border font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
              ✓ Running
            </span>
          </div>
        </div>
      </div>

      {/* OpenAI mock mode notice */}
      {!info?.openai_configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="text-amber-700 font-semibold text-sm mb-2">⚠ OpenAI in Mock Mode</h4>
          <p className="text-gray-600 text-xs leading-relaxed">
            AI content generation is using mock responses. To enable real AI:
          </p>
          <ol className="text-gray-600 text-xs mt-2 space-y-1 list-decimal list-inside">
            <li>Get your API key from platform.openai.com</li>
            <li>Open your <code className="text-amber-600 font-mono">.env</code> file</li>
            <li>Set <code className="text-amber-600 font-mono">OPENAI_API_KEY=sk-...</code></li>
            <li>Restart the backend container</li>
          </ol>
        </div>
      )}
    </div>
  );
}
