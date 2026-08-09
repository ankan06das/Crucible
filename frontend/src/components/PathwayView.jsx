import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, PageHeader } from "./ui";

export default function PathwayView() {
  const {
    setActiveTab,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Start a brainstorm"
        subtitle="Pick a path. Crucible's panel of AI agents will challenge, research, and sharpen your idea."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col p-6 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <span className="material-symbols-outlined">tune</span>
            </span>
            <Badge tone="primary">5 agents</Badge>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Refine an existing idea</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            You already have a concept. The panel will review it, debate its weak points, and hand back a stronger version.
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Strengths, risks and blind spots</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Structured cross-examination</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />A refined concept and roadmap</li>
          </ul>
          <Button className="mt-6" onClick={() => setActiveTab("refine_form")}>Refine an idea</Button>
        </Card>

        <Card className="flex flex-col p-6 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <span className="material-symbols-outlined">lightbulb</span>
            </span>
            <Badge tone="primary">3 agents</Badge>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Generate new ideas</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Start from a topic or problem area and let the panel propose candidates, fact-check them, and converge on the strongest.
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Divergent idea proposals</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Web research fact-checking</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Auto-refined candidate list</li>
          </ul>
          <Button className="mt-6" onClick={() => setActiveTab("generate_form")}>Generate ideas</Button>
        </Card>
      </div>
    </div>
  );
}
