import { useAppContext } from "../context/AppContext";
import { Badge, Button, Field, inputCls } from "./ui";

export default function CollabModal() {
  const {
    collaborators,
    inviteCollaborator,
    inviteEmail,
    inviteStatus,
    setInviteEmail,
    setShowCollabModal,
  } = useAppContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#272c3d] dark:bg-[#14161f]">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-[#272c3d]">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-lg">groups</span>
            Share project
          </h3>
          <button onClick={() => setShowCollabModal(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#1a1e2b]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <form onSubmit={inviteCollaborator} className="space-y-2">
            <Field label="Invite a teammate (email / username)">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                />
                <Button type="submit">Invite</Button>
              </div>
            </Field>
            {inviteStatus && (
              <p className={`text-sm ${inviteStatus.includes("Failed") ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                {inviteStatus}
              </p>
            )}
          </form>

          <div className="border-t border-slate-200 pt-4 dark:border-[#272c3d]">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Project members</h4>
            <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
              {collaborators.owner && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-[#1a1e2b]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{collaborators.owner.username}</p>
                    <p className="truncate text-xs text-slate-400">{collaborators.owner.email}</p>
                  </div>
                  <Badge tone="primary">Owner</Badge>
                </div>
              )}
              {(collaborators.collaborators || (Array.isArray(collaborators) ? collaborators : [])).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-[#1a1e2b]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.username || c.email}</p>
                    <p className="truncate text-xs text-slate-400">{c.email}</p>
                  </div>
                  <Badge>Teammate</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
