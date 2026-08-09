import { PageHeader, StatTile } from "./ui";

export default function StatusView() {
  return (
    <div className="space-y-6">
      <PageHeader title="System status" subtitle="System performance diagnostics." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Database server" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Online</span>} caption="SQLite (crucible.db)" />
        <StatTile label="Agent gateway" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Linked</span>} caption="Agent core gateway" />
        <StatTile label="Active memory store" value="Persisted" caption="SQLite persistence (permanent)" />
      </div>
    </div>
  );
}
