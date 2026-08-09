import { useAppContext } from "../context/AppContext";
import { Badge, Button } from "./ui";

export default function MobileDrawer() {
  const {
    activeTab,
    collaboratedProjects,
    goToPathway,
    invitations,
    loadProjectDetails,
    projects,
    respondToInvitation,
    setActiveTab,
    setMobileMenuOpen,
  } = useAppContext();

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-[#272c3d] dark:bg-[#0f1119]">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={goToPathway} className="flex items-center gap-2">
            <img src="/favicon.png" className="h-6 w-6 rounded-full" alt="Crucible logo" />
            <span className="text-lg font-bold tracking-tight">Crucible.</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#1a1e2b]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <Button className="mb-6 w-full" onClick={goToPathway}>
          <span className="material-symbols-outlined text-base">add</span>
          New brainstorm
        </Button>

        {invitations.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invitations</h3>
              <Badge tone="primary">{invitations.length}</Badge>
            </div>
            {invitations.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                <p className="truncate text-sm font-medium">{inv.project_name}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { respondToInvitation(inv.id, "accept"); setMobileMenuOpen(false); }}>Accept</Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => { respondToInvitation(inv.id, "decline"); setMobileMenuOpen(false); }}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">My projects</h3>
          <div className="space-y-1">
            {projects.length === 0 && <p className="text-sm italic text-slate-400">No projects yet.</p>}
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => { loadProjectDetails(proj.id); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"
              >
                <span className="material-symbols-outlined text-base text-slate-400">folder</span>
                <span className="truncate">{proj.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Shared with you</h3>
          <div className="space-y-1">
            {collaboratedProjects.length === 0 && <p className="text-sm italic text-slate-400">Nothing shared yet.</p>}
            {collaboratedProjects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => { loadProjectDetails(proj.id); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"
              >
                <span className="material-symbols-outlined text-base text-slate-400">groups</span>
                <span className="truncate">{proj.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-slate-200 pt-4 dark:border-[#272c3d]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">System</p>
          <nav className="space-y-0.5">
            {[
              { id: "analytics", label: "Analytics", icon: "analytics" },
              { id: "config", label: "Configuration", icon: "settings" },
              { id: "logs", label: "Logs", icon: "terminal" },
              { id: "status", label: "Status", icon: "sensors" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${activeTab === item.id ? "bg-slate-100 text-slate-900 dark:bg-indigo-500/10 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"}`}
              >
                <span className="material-symbols-outlined text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
