import { useAppContext } from "../context/AppContext";

export default function Notice() {
  const { notice, setNotice } = useAppContext();
  if (!notice) return null;

  const isError = notice.type === "error";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${
          isError
            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-[#2a1520]/95 dark:text-rose-300"
            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-[#10271c]/95 dark:text-emerald-300"
        }`}
        role="status"
      >
        <span className={`material-symbols-outlined text-lg ${isError ? "text-rose-500" : "text-emerald-500"}`}>
          {isError ? "error" : "check_circle"}
        </span>
        <span className="flex-1">{notice.text}</span>
        <button
          onClick={() => setNotice(null)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
