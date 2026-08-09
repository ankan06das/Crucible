import { useAppContext } from "../context/AppContext";
import { Button, Card } from "./ui";

export default function DeleteConfirmModal() {
  const {
    deleteConfirmProject,
    deleteProject,
    setDeleteConfirmProject,
  } = useAppContext();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-sm p-6">
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-rose-600 dark:text-rose-400">
          <span className="material-symbols-outlined text-lg">warning</span>
          Delete project?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This will permanently remove the project, including all research, reviews, and debate records. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteConfirmProject(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              const targetId = deleteConfirmProject;
              setDeleteConfirmProject(null);
              await deleteProject(targetId);
            }}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Delete permanently
          </Button>
        </div>
      </Card>
    </div>
  );
}
