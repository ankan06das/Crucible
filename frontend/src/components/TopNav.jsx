import { useAppContext } from "../context/AppContext";

export default function TopNav() {
  const {
    activeTab,
    goToPathway,
    handleLogout,
    isBrainstormTab,
    setActiveTab,
    setMobileMenuOpen,
    setTheme,
    setUserMenuOpen,
    theme,
    userMenuOpen,
    username,
  } = useAppContext();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 dark:border-[#272c3d] bg-white/90 backdrop-blur dark:bg-[#0e1018]/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          {isBrainstormTab && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#1a1e2b] md:hidden"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          )}
          <button onClick={goToPathway} className="flex items-center gap-2">
            <img src="/favicon.png" className="h-6 w-6 rounded-full" alt="Crucible logo" />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-fuchsia-400">Crucible.</span>
          </button>
          <span className="hidden h-5 w-px bg-slate-200 dark:bg-[#272c3d] md:block" />
          <button
            onClick={goToPathway}
            className={`hidden rounded-md px-2.5 py-1.5 text-sm font-medium md:inline-flex ${
              isBrainstormTab
                ? "bg-slate-100 text-slate-900 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Brainstorm
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#1a1e2b]"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined text-lg">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-[#1a1e2b]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-semibold text-white ring-2 ring-indigo-500/30 dark:ring-violet-400/30">
                {(username || "?").charAt(0).toUpperCase()}
              </span>
              <span className="hidden font-medium text-slate-700 dark:text-slate-200 sm:block">{username}</span>
              <span className="material-symbols-outlined text-base text-slate-400">expand_more</span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                  {[
                    { id: "profile", label: "Profile", icon: "person" },
                    { id: "about", label: "About", icon: "info" },
                    { id: "contact", label: "Contact", icon: "mail" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setUserMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${activeTab === item.id ? "bg-slate-100 text-slate-900 dark:bg-[#252b3d] dark:text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252b3d]"}`}
                    >
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-slate-200 dark:bg-[#272c3d]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
