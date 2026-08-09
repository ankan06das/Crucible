import { useAppContext } from "../context/AppContext";
import { AgentAvatar, Badge, Button, Card, PageHeader } from "./ui";
import { AGENT_BY_ID, agentIdFromName } from "../constants/agents";

export default function RunningView() {
  const {
    consoleEndRef,
    consoleLogs,
    openModeratorChat,
    progressTime,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader title="Debate in progress" subtitle="Agents are reviewing, challenging, and refining in real time.">
        <Badge tone="primary">Elapsed: {progressTime.toFixed(1)}s</Badge>
      </PageHeader>
      <Card className="flex flex-col p-6 dark-glow">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500 dark:shadow-[0_0_10px_0_rgba(99,102,241,0.9)]" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live activity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Innovation, Feasibility, Impact, Technical, Skeptic and Moderator agents at work.</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#1a1e2b]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${Math.min(95, 20 + progressTime * 1.5)}%` }}
          />
        </div>

        <div className="mt-5 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {consoleLogs.map((log, idx) => {
            const isSystem = !log.agent || log.agent === "SYSTEM";
            if (isSystem) {
              return (
                <div key={idx} className="flex justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-[#1a1e2b] dark:text-slate-400">
                    {log.text}
                  </span>
                </div>
              );
            }
            const meta = AGENT_BY_ID[agentIdFromName(log.agent)] || AGENT_BY_ID.moderator;
            return (
              <div key={idx} className="flex animate-fade-in items-start gap-3">
                <AgentAvatar agent={meta} size="sm" />
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>{log.agent}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {log.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{log.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={consoleEndRef} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-[#272c3d]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Agents are debating, challenging claims, and synthesizing the final consensus…</p>
          <Button variant="secondary" onClick={openModeratorChat} className="dark:border-cyan-500/40 dark:text-cyan-300 dark:hover:border-cyan-400/60">
            <span className="material-symbols-outlined text-base text-cyan-500">gavel</span>
            Chat with Moderator
          </Button>
        </div>
      </Card>
    </div>
  );
}
