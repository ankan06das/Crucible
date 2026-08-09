import { AgentAvatar, Card, PageHeader } from "./ui";
import { AGENTS } from "../constants/agents";

export default function AboutView() {
  return (
    <div className="space-y-6">
      <PageHeader title="About Crucible" subtitle="Stress-testing and refining hackathon ideas through structured AI multi-agent debate." />
      <Card className="space-y-6 p-6">
        <p className="max-w-3xl leading-relaxed text-slate-700 dark:text-slate-300">
          Crucible removes cognitive biases and groupthink from brainstorming. Multiple agents with contrasting viewpoints stress-test your idea, research-validate claims, and refine the concept into a concrete implementation roadmap.
        </p>

        <div className="border-t border-slate-200 pt-5 dark:border-[#272c3d]">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">The debate panel</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                <AgentAvatar agent={a} />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{a.name}</h4>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{a.role}.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-[#272c3d]">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">How it works</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {[
              { step: "1", title: "Concept intake", desc: "You input the baseline idea and constraints." },
              { step: "2", title: "Web research", desc: "Agents fact-check claims against real sources." },
              { step: "3", title: "Parallel debates", desc: "Contrasting viewpoints cross-examine the idea." },
              { step: "4", title: "Consensus", desc: "The moderator synthesizes the strongest version." },
            ].map((s, idx) => (
              <div key={s.step} className="relative rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-semibold text-white">{s.step}</span>
                <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{s.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
                {idx < 3 && (
                  <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 material-symbols-outlined text-base text-slate-300 dark:text-slate-600 md:block">arrow_forward</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
