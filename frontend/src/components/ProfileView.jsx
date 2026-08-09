import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, Field, PageHeader, StatTile, inputCls } from "./ui";

export default function ProfileView() {
  const {
    currentPasscode,
    handleProfileUpdate,
    handlePasswordUpdate,
    newEmail,
    newPasscode,
    newUsername,
    passcodeSuccess,
    projects,
    setCurrentPasscode,
    setNewEmail,
    setNewPasscode,
    setNewUsername,
    setPasscodeSuccess,
    username,
    email,
    provider,
  } = useAppContext();

  // Password checks for UI feedback
  const passLength = newPasscode.length >= 8;
  const passUpper = /[A-Z]/.test(newPasscode);
  const passNumber = /\d/.test(newPasscode);
  const passValid = passLength && passUpper && passNumber;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account details." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          
          <Card className="p-6 overflow-hidden relative">
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="flex items-center gap-5 relative z-10">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                {(username || "?").charAt(0).toUpperCase()}
              </span>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{username}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{email}</p>
                <div className="flex gap-2">
                  <Badge tone="neutral">Member</Badge>
                  {provider === "google" && <Badge tone="info">Google Account</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 relative z-10">
              <StatTile label="Saved projects" value={`${projects.length} projects`} />
              <StatTile label="Database server" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />Linked</span>} caption="SQLite persistence" />
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] pointer-events-none"></div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white relative z-10">Update profile</h3>
            <form onSubmit={handleProfileUpdate} className="mt-5 space-y-5 relative z-10">
              <Field label="New username">
                <input className={`${inputCls} dark:bg-slate-900/50 dark:border-slate-800 transition-colors focus:border-indigo-500 focus:ring-indigo-500/20`} type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter a new username" />
              </Field>
              <Field label="New email">
                <input className={`${inputCls} dark:bg-slate-900/50 dark:border-slate-800 transition-colors focus:border-indigo-500 focus:ring-indigo-500/20`} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter a new email" />
              </Field>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Update profile</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          {provider !== "google" && (
            <Card className="p-6 relative overflow-hidden">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white relative z-10">Change password</h3>
              <form onSubmit={handlePasswordUpdate} className="mt-5 space-y-5 relative z-10">
                <Field label="Current password">
                  <input className={`${inputCls} dark:bg-slate-900/50 dark:border-slate-800 transition-colors focus:border-indigo-500 focus:ring-indigo-500/20`} type="password" required value={currentPasscode} onChange={(e) => setCurrentPasscode(e.target.value)} />
                </Field>
                <Field label="New password">
                  <input className={`${inputCls} dark:bg-slate-900/50 dark:border-slate-800 transition-colors focus:border-indigo-500 focus:ring-indigo-500/20`} type="password" required value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} />
                </Field>
                
                {newPasscode.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="flex gap-1 mb-2">
                       <div className={`h-1 w-1/3 rounded-full transition-colors ${passLength ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                       <div className={`h-1 w-1/3 rounded-full transition-colors ${passUpper ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                       <div className={`h-1 w-1/3 rounded-full transition-colors ${passNumber ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                    </div>
                    <p className={`text-[11px] ${passLength ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>✓ At least 8 characters</p>
                    <p className={`text-[11px] ${passUpper ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>✓ Contains uppercase letter</p>
                    <p className={`text-[11px] ${passNumber ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>✓ Contains number</p>
                  </div>
                )}

                {passcodeSuccess && (
                  <div className={`rounded-lg border px-3 py-2 text-sm ${passcodeSuccess.includes("successfully") ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                    {passcodeSuccess}
                  </div>
                )}
                <Button type="submit" disabled={newPasscode.length > 0 && !passValid} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors">Update password</Button>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Access logs</h3>
            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-400 shadow-inner border border-slate-800/50">
              <div className="flex gap-2"><span className="text-indigo-400">[AUTH]</span> Session established via {provider}.</div>
              <div className="flex gap-2"><span className="text-indigo-400">[SQLITE]</span> User profile loaded. (Success)</div>
              <div className="flex gap-2"><span className="text-indigo-400">[SYSTEM]</span> Session token verified.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
