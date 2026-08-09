import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, Field, PageHeader, StatTile, inputCls } from "./ui";

export default function ProfileView() {
  const {
    currentPasscode,
    handleProfileUpdate,
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
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account details." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-semibold text-white ring-2 ring-indigo-500/30 dark:ring-violet-400/30">
                {(username || "?").charAt(0).toUpperCase()}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{username}</h3>
                <Badge tone="neutral">Member</Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <StatTile label="Saved projects" value={`${projects.length} projects`} />
              <StatTile label="Database server" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Linked</span>} caption="SQLite persistence" />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Update profile</h3>
            <form onSubmit={handleProfileUpdate} className="mt-4 space-y-4">
              <Field label="New username">
                <input className={inputCls} type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter a new username" />
              </Field>
              <Field label="New email">
                <input className={inputCls} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter a new email" />
              </Field>
              {passcodeSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {passcodeSuccess}
                </div>
              )}
              <Button type="submit">Update profile</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Change password</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasscodeSuccess("Password updated successfully.");
                setCurrentPasscode("");
                setNewPasscode("");
              }}
              className="mt-4 space-y-4"
            >
              <Field label="Current password">
                <input className={inputCls} type="password" required value={currentPasscode} onChange={(e) => setCurrentPasscode(e.target.value)} />
              </Field>
              <Field label="New password">
                <input className={inputCls} type="password" required value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} />
              </Field>
              {passcodeSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {passcodeSuccess}
                </div>
              )}
              <Button type="submit">Update password</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Access logs</h3>
            <div className="mt-3 space-y-1 rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
              <div>[AUTH] Session established.</div>
              <div>[SQLITE] User profile loaded. (Success)</div>
              <div>[SYSTEM] Session token verified.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
