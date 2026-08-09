import { useAppContext } from "../context/AppContext";
import { Button, Card, Field, PageHeader, inputCls } from "./ui";

export default function GenerateFormView() {
  const {
    genConstraints,
    genGoals,
    genTeam,
    genTheme,
    genTime,
    genTopic,
    genUrls,
    projectName,
    setActiveTab,
    setGenConstraints,
    setGenGoals,
    setGenTeam,
    setGenTheme,
    setGenTime,
    setGenTopic,
    setGenUrls,
    setProjectName,
    submitGenerate,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <button onClick={() => setActiveTab("pathway")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>
      <PageHeader
        title="Generate new ideas"
        subtitle="Give us a topic or problem area. The panel will build proposals, fact-check them, and converge on the strongest candidates."
      />
      <Card className="p-6">
        <form onSubmit={submitGenerate} className="space-y-5">
          <Field label="Project name" required hint="This is saved to your project list.">
            <input className={inputCls} type="text" required value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. AgroAI Irrigation" />
          </Field>
          <Field label="Core problem area / topic" required>
            <input className={inputCls} type="text" required value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="e.g. Plant irrigation efficiency" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Hackathon theme">
              <input className={inputCls} type="text" value={genTheme} onChange={(e) => setGenTheme(e.target.value)} placeholder="e.g. Agriculture" />
            </Field>
            <Field label="Team size">
              <input className={inputCls} type="number" min="1" value={genTeam} onChange={(e) => setGenTeam(e.target.value)} placeholder="e.g. 3" />
            </Field>
            <Field label="Time limit (hours)">
              <input className={inputCls} type="number" min="1" value={genTime} onChange={(e) => setGenTime(e.target.value)} placeholder="e.g. 24" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Hackathon goals">
              <input className={inputCls} type="text" value={genGoals} onChange={(e) => setGenGoals(e.target.value)} placeholder="e.g. Win Best AI Category" />
            </Field>
            <Field label="Constraints">
              <input className={inputCls} type="text" value={genConstraints} onChange={(e) => setGenConstraints(e.target.value)} placeholder="e.g. No hardware, free-tier services only" />
            </Field>
          </div>
          <Field label="Factual resource URLs" hint="Optional, space-separated.">
            <textarea className={inputCls} rows={2} value={genUrls} onChange={(e) => setGenUrls(e.target.value)} placeholder="e.g. https://wikipedia.org/wiki/Drip_irrigation" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit">
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              Generate ideas
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
