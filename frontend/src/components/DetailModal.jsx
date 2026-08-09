import { useAppContext } from "../context/AppContext";

export default function DetailModal() {
  const {
    modalContent,
    modalTitle,
    setShowModal,
  } = useAppContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#272c3d] dark:bg-[#14161f]">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-[#272c3d]">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{modalTitle}</h3>
          <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#1a1e2b]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-slate-700 dark:text-slate-300">{modalContent}</div>
      </div>
    </div>
  );
}
