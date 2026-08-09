import { useAppContext } from "../context/AppContext";
import { Button, Card, Field, PageHeader, inputCls } from "./ui";

export default function RefineFormView() {
  const {
    projectName,
    refineIdea,
    refineTeam,
    refineTheme,
    refineTime,
    setActiveTab,
    setProjectName,
    setRefineIdea,
    setRefineTeam,
    setRefineTheme,
    setRefineTime,
    submitRefine,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <button onClick={() => setActiveTab("pathway")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>
      <PageHeader
        title="Refine an idea"
        subtitle="Tell us what you're building. The panel will stress-test it and return a sharper version."
      />
      <Card className="p-6">
        <form onSubmit={submitRefine} className="space-y-5">
          <Field label="Project name" required hint="This is saved to your project list.">
            <input className={inputCls} type="text" required value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Drip Drop Drip" />
          </Field>
          <Field label="Your idea" required>
            <textarea className={inputCls} rows={6} required value={refineIdea} onChange={(e) => setRefineIdea(e.target.value)} placeholder="Describe the concept you want to refine..." />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Hackathon theme">
              <input className={inputCls} type="text" value={refineTheme} onChange={(e) => setRefineTheme(e.target.value)} placeholder="e.g. Education, AI" />
            </Field>
            <Field label="Team size">
              <input className={inputCls} type="number" min="1" value={refineTeam} onChange={(e) => setRefineTeam(e.target.value)} placeholder="e.g. 4" />
            </Field>
            <Field label="Time available (hours)">
              <input className={inputCls} type="number" min="1" value={refineTime} onChange={(e) => setRefineTime(e.target.value)} placeholder="e.g. 24" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit">
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              Run the debate panel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
