import { Card, Field, PageHeader, inputCls } from "./ui";

export default function ConfigView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuration" subtitle="Adjust model and pipeline settings." />
      <Card className="max-w-xl p-6">
        <div className="space-y-5">
          <Field label="Large language model">
            <select className={inputCls}>
              <option>meta/llama-3.1-8b-instruct (Default)</option>
              <option>openai/gpt-4o-mini</option>
              <option>nvidia/llama-3.1-70b-instruct</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Web research (let agents search web sources)
          </label>
          <Field label="Max debate rounds">
            <input className={inputCls} type="number" defaultValue="1" />
          </Field>
        </div>
      </Card>
    </div>
  );
}
