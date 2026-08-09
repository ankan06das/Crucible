import { Card, PageHeader } from "./ui";

export default function LogsView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Logs" subtitle="Recent activity from the agent runtime." />
      <Card className="p-0">
        <div className="h-96 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-green-400">
          <div>[INFO] 2026-08-08T14:20:01Z - Agent panel client connected to http://localhost:8000/agents</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: ideator (v1.0.0) &rarr; /agents/ideator</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: researcher (v1.0.0) &rarr; /agents/researcher</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: strategist (v1.0.0) &rarr; /agents/strategist</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: innovation (v1.0.0) &rarr; /agents/innovation</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: feasibility (v1.0.0) &rarr; /agents/feasibility</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: impact (v1.0.0) &rarr; /agents/impact</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: technical (v1.0.0) &rarr; /agents/technical</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: skeptic (v1.0.0) &rarr; /agents/skeptic</div>
          <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: moderator (v1.0.0) &rarr; /agents/moderator</div>
          <div className="text-slate-400">[SYSTEM READY] Listening for client requests...</div>
        </div>
      </Card>
    </div>
  );
}
