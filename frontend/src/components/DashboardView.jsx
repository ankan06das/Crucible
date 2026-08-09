import { useAppContext } from "../context/AppContext";
import { AgentAvatar, Badge, Button, Card, PageHeader, SectionLabel, inputCls } from "./ui";
import { AGENTS, AGENT_BY_ID, JUDGE_AGENTS, agentIdFromName } from "../constants/agents";
import { getAllDebateExchanges } from "../utils/debate";

export default function DashboardView() {
  const {
    activeDebateStage,
    activeProject,
    activeTabSubView,
    activeVersionIdx,
    candidateSelectionLoading,
    chatInput,
    chatLoading,
    chats,
    getActiveCandidateInfo,
    handleRefineCurrentIdea,
    innerRefinement,
    innerResult,
    isGenerationKind,
    loadCollaborators,
    loadProjectDetails,
    loadedResult,
    openAgentModal,
    openCandidateModal,
    openModeratorChat,
    operatorNotes,
    projectLoading,
    selectCandidateIdea,
    selectedAgentForChat,
    selectedCandidateIdx,
    selectedImprovements,
    sendAgentMessage,
    setActiveDebateStage,
    setActiveProject,
    setActiveTab,
    setActiveTabSubView,
    setActiveVersionIdx,
    setChatInput,
    setLoadedResult,
    setOperatorNotes,
    setSelectedAgentForChat,
    setShowCollabModal,
    toggleImprovement,
    triggerIteration,
    username,
    versionList,
  } = useAppContext();

  return (
    <div className="space-y-6">
      {projectLoading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading project data…</p>
        </div>
      ) : (loadedResult?.status === "pending_selection" && selectedCandidateIdx === null) ? (
        <div className="space-y-6">
          <PageHeader
            title="Choose an idea"
            subtitle="Pick the candidate you want the refinement panel to start from."
          />
          {candidateSelectionLoading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Preparing the panel…</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loadedResult.candidates?.map((cand, idx) => (
                <Card key={idx} className="flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">Option {idx + 1}</span>
                    <Badge tone="primary">{cand.creator || "Innovation Agent"}</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">{cand.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-5 dark:text-slate-400">{cand.idea}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => selectCandidateIdea(cand)}>
                      <span className="material-symbols-outlined text-base">rocket_launch</span>
                      Run refinement
                    </Button>
                    <Button variant="secondary" onClick={() => loadProjectDetails(activeProject.id, idx)}>
                      View concept page
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (activeProject || loadedResult) ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-[#272c3d]">
            <div>
              <Badge tone={isGenerationKind ? "primary" : "neutral"} className="mb-2">
                {isGenerationKind ? "Generation & refinement" : "Refinement results"}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {getActiveCandidateInfo()?.title || activeProject?.name || "Project dashboard"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">Project ID: {activeProject?.id}</p>
              
              {versionList && versionList.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-[#272c3d] w-max max-w-full">
                  <button
                    onClick={() => { setActiveVersionIdx(0); setActiveDebateStage("reviews"); }}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${activeVersionIdx === 0 ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"}`}
                  >
                    Original
                  </button>
                  {versionList.map((v, idx) => (
                    <button
                      key={v.version ?? idx}
                      onClick={() => { setActiveVersionIdx(idx + 1); setActiveDebateStage("reviews"); }}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${activeVersionIdx === idx + 1 ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"}`}
                    >
                      Version {v.version ?? idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleRefineCurrentIdea}>
                <span className="material-symbols-outlined text-base">rocket_launch</span>
                {loadedResult?.refinement || innerResult?.moderator ? "Iterate" : "Refine"}
              </Button>
              <Button variant="secondary" onClick={openModeratorChat}>
                <span className="material-symbols-outlined text-base">gavel</span>
                Chat with Moderator
              </Button>
              <Button variant="secondary" onClick={() => { if (activeProject?.id) { setShowCollabModal(true); loadCollaborators(activeProject.id); } }}>
                <span className="material-symbols-outlined text-base">groups</span>
                Share
              </Button>
              <Button variant="ghost" onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }}>
                New session
              </Button>
            </div>
          </header>

          {/* SubView Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-[#272c3d]">
            {[
              { id: "overview", label: "Overview", icon: "analytics" },
              { id: "reviews", label: "Reviews", icon: "groups" },
              { id: "debates", label: "Debate", icon: "forum" },
              { id: "chat", label: "Chat", icon: "support_agent" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTabSubView(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${activeTabSubView === t.id ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300" : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* SUBVIEW 1: OVERVIEW */}
          {activeTabSubView === "overview" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                      <span className="material-symbols-outlined text-base text-indigo-500">lightbulb</span>
                      Refined concept
                    </h2>
                    <Badge tone="primary">Fit: {getActiveCandidateInfo()?.fit ?? 8}/10</Badge>
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-800 dark:bg-[#1a1e2b] dark:text-slate-100">
                    {innerResult?.moderator?.refined_idea || getActiveCandidateInfo()?.idea}
                  </p>
                  {innerResult?.moderator?.consensus && Array.isArray(innerResult.moderator.consensus) && innerResult.moderator.consensus.length > 0 && (
                    <div className="mt-4">
                      <SectionLabel>Key consensus highlights</SectionLabel>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {innerResult.moderator.consensus.map((c, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-base text-emerald-500">check</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined text-base text-indigo-500">fact_check</span>
                    Verified facts & evidence
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {(() => {
                      let factsList = [];
                      if (innerResult?.research) {
                        if (Array.isArray(innerResult.research.facts)) {
                          factsList = innerResult.research.facts;
                        } else if (typeof innerResult.research === "object") {
                          Object.values(innerResult.research).forEach((b) => {
                            if (b && Array.isArray(b.facts)) factsList.push(...b.facts);
                          });
                        }
                      }
                      const candEvidence = getActiveCandidateInfo()?.evidence || [];
                      if (factsList.length === 0 && candEvidence.length > 0) {
                        factsList = candEvidence.map((e) => ({ claim: e, source: "Internal Analysis" }));
                      }
                      if (factsList.length === 0) {
                        factsList = [
                          { claim: "Target market problem validated via competitive benchmark.", source: "Crucible Research" },
                          { claim: "MVP tech stack achievable within standard hackathon timeline.", source: "Feasibility Assessment" },
                        ];
                      }
                      return factsList.slice(0, 4).map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-[#1a1e2b]">
                          <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                          <div>
                            <span className="text-sm text-slate-800 dark:text-slate-100">{typeof f === "string" ? f : (f?.claim || f)}</span>
                            {f?.source && <span className="block text-xs text-slate-400">Source: {f.source}</span>}
                          </div>
                        </li>
                      ));
                    })()}
                  </ul>
                </Card>
              </div>

              <Card className="h-fit p-5">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined text-base text-indigo-500">settings_backup_restore</span>
                    Decision loop
                  </h2>
                  <SectionLabel>Choose what to carry forward</SectionLabel>
                </div>
                <div className="mt-3 space-y-2" id="decision-checklist">
                  {(() => {
                    const improvements = (innerResult?.moderator?.high_priority_improvements && Array.isArray(innerResult.moderator.high_priority_improvements))
                      ? innerResult.moderator.high_priority_improvements
                      : [
                        "Prioritize lightweight API integrations for fast demo setup.",
                        "Incorporate fallback mode for offline evaluation.",
                        "Scope core user workflow down to 3 key interactive steps.",
                      ];
                    return improvements.map((imp, idx) => {
                      const isChecked = selectedImprovements[idx] ?? true;
                      return (
                        <label
                          key={idx}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-indigo-300 dark:border-[#272c3d] dark:bg-[#1a1e2b] dark:hover:border-indigo-600"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            value={imp}
                            onChange={() => toggleImprovement(idx)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`text-sm leading-relaxed ${isChecked ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through"}`}>
                            {imp}
                          </span>
                        </label>
                      );
                    });
                  })()}
                </div>
                <textarea
                  className={`${inputCls} mt-3`}
                  rows={2}
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  placeholder="Optional guidance notes for the next iteration..."
                />
                <Button className="mt-3 w-full" onClick={triggerIteration}>
                  <span className="material-symbols-outlined text-base">sync</span>
                  Iterate concept
                </Button>
              </Card>
            </div>
          )}

          {/* SUBVIEW 2: SPECIALIST REVIEWS */}
          {activeTabSubView === "reviews" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Independent agent feedback</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {JUDGE_AGENTS.map((agent) => {
                  const key = agent.id;
                  const name = agent.label;
                  const reviews = innerResult.refined_reviews || innerResult.reviews || (innerRefinement ? innerRefinement.reviews : {}) || {};
                  const reflections = innerResult.refined_reflections || innerResult.reflections || (innerRefinement ? innerRefinement.reflections : {}) || {};

                  let revRaw = reviews[key] || reviews[name] || reviews[name.toLowerCase()] || reviews[name + " Agent"];
                  let reflRaw = reflections[key] || reflections[name] || reflections[name.toLowerCase()] || reflections[name + " Agent"];

                  let rev = typeof revRaw === "object" ? revRaw : (typeof revRaw === "string" ? { score: 7, strengths: [revRaw], weaknesses: [], suggestions: [] } : null);
                  let refl = typeof reflRaw === "object" ? reflRaw : (typeof reflRaw === "string" ? { new_score: 8 } : null);

                  if (!rev) return null;

                  return (
                    <Card key={agent.id} className="flex flex-col p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AgentAvatar agent={agent} size="sm" />
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
                        </div>
                        {refl && refl.new_score !== undefined && refl.new_score !== rev.score ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 line-through">{rev.score !== undefined ? rev.score : 7}</span>
                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{refl.new_score}/10</span>
                          </div>
                        ) : (
                          <span className="text-base font-bold text-slate-900 dark:text-white">{rev.score !== undefined ? rev.score : 7}/10</span>
                        )}
                      </div>
                      <div className="mt-3 flex-1 space-y-3 text-sm">
                        <div>
                          <SectionLabel>Strengths</SectionLabel>
                          <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                            {rev.strengths && Array.isArray(rev.strengths) ? rev.strengths.join(", ") : (typeof rev.strengths === "string" ? rev.strengths : "Detailed feedback available")}
                          </p>
                        </div>
                        <div>
                          <SectionLabel>Suggestions adopted</SectionLabel>
                          <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                            {rev.suggestions && Array.isArray(rev.suggestions) ? rev.suggestions.join(", ") : "Refer to roadmap items"}
                          </p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => openAgentModal(agent.name)}>
                        View debate log
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBVIEW 3: DEBATE ROUNDS */}
          {activeTabSubView === "debates" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Debate rounds</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Each agent's analysis, critiques, peer challenges, and concessions on the way to consensus.</p>
                </div>
                <Badge tone="primary">A2A debate rounds</Badge>
              </div>

              {/* Stage Tabs */}
              {innerRefinement && (innerRefinement.reviews || innerRefinement.reflections || innerRefinement.moderator) ? (
                <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1 dark:border-[#272c3d]">
                  {[
                    { id: "reviews", label: "Independent analysis", icon: "troubleshoot" },
                    { id: "debate", label: "Cross-examination", icon: "forum" },
                    { id: "reflections", label: "Peer reflections", icon: "psychology" },
                    { id: "moderator", label: "Consensus synthesis", icon: "gavel" },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => setActiveDebateStage(stage.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${activeDebateStage === stage.id || (activeDebateStage === "proposals" && stage.id === "reviews") ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"}`}
                    >
                      <span className="material-symbols-outlined text-sm">{stage.icon}</span>
                      {stage.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1 dark:border-[#272c3d]">
                  {[
                    { id: "proposals", label: "Idea proposals", icon: "tips_and_updates" },
                    { id: "debate", label: "Candidate debate", icon: "forum" },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => setActiveDebateStage(stage.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${activeDebateStage === stage.id || (activeDebateStage === "reviews" && stage.id === "proposals") ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#1a1e2b]"}`}
                    >
                      <span className="material-symbols-outlined text-sm">{stage.icon}</span>
                      {stage.label}
                    </button>
                  ))}
                </div>
              )}

              {/* STAGE 1 (REFINEMENT): Independent Analysis */}
              {activeDebateStage === "reviews" && innerRefinement && innerRefinement.reviews && (
                <div className="grid animate-fade-in gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {JUDGE_AGENTS.map((agent) => {
                    const key = agent.id;
                    const name = agent.label;
                    const reviews = innerRefinement.reviews || {};
                    const rev = reviews[key] || reviews[name] || reviews[name.toLowerCase()] || reviews[name + " Agent"];

                    if (!rev) return null;

                    const stance = rev.stance || "neutral";
                    const isChallenge = stance.toLowerCase().includes("disagree") || stance.toLowerCase().includes("challenge");
                    const isConcur = stance.toLowerCase().includes("concur") || stance.toLowerCase().includes("agree");

                    return (
                      <Card key={agent.id} className="flex flex-col p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AgentAvatar agent={agent} size="sm" />
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
                          </div>
                          <span className="text-base font-bold text-slate-900 dark:text-white">{rev.score !== undefined ? rev.score : 7}/10</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <SectionLabel>Stance verdict</SectionLabel>
                          <Badge tone={isChallenge ? "danger" : isConcur ? "success" : "warning"}>{stance}</Badge>
                        </div>
                        <div className="mt-3 flex-1 space-y-3 text-sm">
                          <div>
                            <SectionLabel>Critique & analysis</SectionLabel>
                            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">{rev.critique || "Analysis complete."}</p>
                          </div>
                          {rev.improvements && rev.improvements.length > 0 && (
                            <div>
                              <SectionLabel>Suggested improvements</SectionLabel>
                              <ul className="mt-1 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
                                {rev.improvements.map((imp, idx) => (
                                  <li key={idx}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* STAGE 1 (GENERATION): Agent Idea Proposals */}
              {activeDebateStage === "proposals" && innerResult?.proposals && (
                <div className="grid animate-fade-in gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(innerResult.proposals).map(([agentKey, val]) => {
                    if (!val) return null;
                    const displayAgent = agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
                    const meta = AGENT_BY_ID[agentKey] || AGENT_BY_ID.moderator;
                    return (
                      <Card key={agentKey} className="flex flex-col p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AgentAvatar agent={meta} size="sm" />
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{displayAgent} Agent</h3>
                          </div>
                          <SectionLabel>Proposal</SectionLabel>
                        </div>
                        <div className="mt-3 flex-1 space-y-3 text-sm">
                          {val.ideas ? (
                            <div>
                              <SectionLabel>Shortlisted candidates</SectionLabel>
                              <div className="mt-2 space-y-2">
                                {val.ideas.map((cand, idx) => (
                                  <div key={idx} className="rounded-lg bg-slate-50 p-3 dark:bg-[#1a1e2b]">
                                    <div className="font-medium text-slate-900 dark:text-white">{cand.title}</div>
                                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">{cand.idea}</p>
                                    <div className="mt-1 text-xs text-slate-400">Hackathon fit: {cand.hackathon_fit}/10</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#1a1e2b]">
                                <div className="font-medium text-slate-900 dark:text-white">{val.title}</div>
                                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{val.idea}</p>
                                <div className="mt-1 text-xs text-slate-400">Hackathon fit: {val.hackathon_fit}/10</div>
                              </div>
                              {val.rationale && (
                                <div className="mt-3">
                                  <SectionLabel>Proposal rationale</SectionLabel>
                                  <p className="mt-1 text-slate-600 dark:text-slate-300">{val.rationale}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* STAGE 2: Debate Timeline */}
              {activeDebateStage === "debate" && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                    {JUDGE_AGENTS.concat(AGENT_BY_ID.moderator).map((a, idx) => (
                      <span key={a.id} className="flex items-center gap-1">
                        {idx > 0 && <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>}
                        <span className="inline-flex items-center gap-1" style={{ color: a.color }}>
                          <span className="material-symbols-outlined text-sm">{a.icon}</span>
                          {a.label}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="max-h-[550px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-4 dark:border-[#272c3d]">
                    {(() => {
                      const exchanges = getAllDebateExchanges(innerResult);
                      if (exchanges.length === 0 && (!chats || chats.length === 0)) {
                        return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No structured debates recorded yet. Run the debate engine to get started.</p>;
                      }
                      if (exchanges.length > 0) {
                        return exchanges.map((ex, idx) => {
                          const isDisagree = ex.stance && (ex.stance.toLowerCase().includes("disagree") || ex.stance.toLowerCase().includes("challenge"));
                          const meta = AGENT_BY_ID[agentIdFromName(ex.speaker)] || AGENT_BY_ID.moderator;
                          return (
                            <div key={idx} className="flex animate-fade-in items-start gap-3">
                              <AgentAvatar agent={meta} size="sm" />
                <div
                  className="min-w-0 flex-1 rounded-lg border border-l-2 border-slate-200 bg-white px-3 py-2 dark:border-[#272c3d] dark:bg-[#1a1e2b]"
                  style={{ borderLeftColor: meta.color, background: meta.color + "16" }}
                >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{ex.speaker}</span>
                                  <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                                  <span className="text-xs text-slate-600 dark:text-slate-300">{ex.target}</span>
                                  <Badge tone={isDisagree ? "danger" : "success"}>{ex.stance}</Badge>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">"{ex.argument}"</p>
                              </div>
                            </div>
                          );
                        });
                      }
                      return (
                        <div className="space-y-2">
                          {chats.map((chat, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">{chat.sender}</span>
                                <span className="text-[10px] text-slate-400">{new Date(chat.created_at).toLocaleTimeString()}</span>
                              </div>
                              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{chat.message}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* STAGE 3: Peer Reflections */}
              {activeDebateStage === "reflections" && innerRefinement && innerRefinement.reflections && (
                <div className="grid animate-fade-in gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {JUDGE_AGENTS.map((agent) => {
                    const key = agent.id;
                    const name = agent.label;
                    const reflections = innerRefinement.reflections || {};
                    const refl = reflections[key] || reflections[name] || reflections[name.toLowerCase()] || reflections[name + " Agent"];

                    if (!refl) return null;

                    const oldScore = refl.old_score !== undefined ? refl.old_score : (refl.score || 0);
                    const newScore = refl.new_score !== undefined ? refl.new_score : (refl.score || 0);

                    return (
                      <Card key={agent.id} className="flex flex-col p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AgentAvatar agent={agent} size="sm" />
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <span className="text-slate-400">Score: {oldScore}</span>
                            <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{newScore}/10</span>
                          </div>
                        </div>
                        <div className="mt-3 flex-1 space-y-3 text-sm">
                          <div>
                            <SectionLabel>Reflection rationale</SectionLabel>
                            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">{refl.reason || refl.reflection_rationale || "Conceded points and accepted peer reviews."}</p>
                          </div>
                          {refl.updated_suggestions && refl.updated_suggestions.length > 0 && (
                            <div>
                              <SectionLabel>Updated suggestions</SectionLabel>
                              <ul className="mt-1 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
                                {refl.updated_suggestions.map((sugg, idx) => (
                                  <li key={idx}>{sugg}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* STAGE 4: Consensus Synthesis */}
              {activeDebateStage === "moderator" && innerRefinement && innerRefinement.moderator && (
                <div className="animate-fade-in">
                  <Card className="mx-auto max-w-2xl border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-500/5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        <span className="material-symbols-outlined text-base">gavel</span>
                        Moderator verdict
                      </h3>
                      <Badge tone="primary">{innerRefinement.moderator.verdict || "Consensus approved"}</Badge>
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <SectionLabel>Consolidated refined concept</SectionLabel>
                        <p className="mt-1 font-medium leading-relaxed text-slate-900 dark:text-white">{innerRefinement.moderator.refined_idea}</p>
                      </div>
                      {innerRefinement.moderator.innovations && innerRefinement.moderator.innovations.length > 0 && (
                        <div>
                          <SectionLabel>Key innovations retained</SectionLabel>
                          <ul className="mt-1 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
                            {innerRefinement.moderator.innovations.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {innerRefinement.moderator.risks && innerRefinement.moderator.risks.length > 0 && (
                        <div>
                          <SectionLabel>Resolved key risks</SectionLabel>
                          <ul className="mt-1 list-inside list-disc space-y-1 text-rose-600 dark:text-rose-300">
                            {innerRefinement.moderator.risks.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW 4: INTERACTIVE AGENT CHAT ROOM */}
          {activeTabSubView === "chat" && (
            <Card className="p-5">
              <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Choose an agent</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Ask a question or challenge their feedback in character.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {AGENTS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAgentForChat(a.id)}
                        className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left ${selectedAgentForChat === a.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-[#1a1e2b]"}`}
                      >
                        <AgentAvatar agent={a} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{a.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{a.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex h-[480px] flex-col">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#272c3d]">
                    <div>
                      <SectionLabel>Chatting with</SectionLabel>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{AGENT_BY_ID[selectedAgentForChat]?.name}</div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">online_prediction</span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto py-3 pr-1">
                    {chats && chats.length > 0 ? (
                      chats.map((chat, idx) => {
                        const isUser = chat.sender.toLowerCase() === username.toLowerCase();
                        let agentStyle = {};
                        if (!isUser) {
                          const meta = AGENT_BY_ID[agentIdFromName(chat.sender)] || AGENT_BY_ID.moderator;
                          if (meta && meta.color) {
                            agentStyle = { borderLeftColor: meta.color, borderLeftWidth: '4px', background: meta.color + "10" };
                          }
                        }
                        return (
                          <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div 
                              className={`max-w-[80%] rounded-lg border px-3 py-2 ${isUser ? "border-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "border-slate-200 bg-white dark:border-[#272c3d] dark:bg-[#1a1e2b]"}`}
                              style={agentStyle}
                            >
                              <div className={`mb-1 flex justify-between gap-4 text-[10px] ${isUser ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
                                <span className="font-medium" style={!isUser && agentStyle.borderLeftColor ? {color: agentStyle.borderLeftColor} : {}}>{chat.sender}</span>
                                <span>{new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{chat.message}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No messages yet. Send a message to start the conversation.</p>
                    )}
                    {chatLoading && !chats.some((c) => c.streaming) && (
                      <div className="flex">
                        <div className="animate-pulse rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-[#272c3d] dark:bg-[#1a1e2b] dark:text-slate-400">
                          {AGENT_BY_ID[selectedAgentForChat]?.name} is thinking…
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendAgentMessage} className="flex gap-2 border-t border-slate-200 pt-3 dark:border-[#272c3d]">
                    <input
                      className={inputCls}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message the ${(AGENT_BY_ID[selectedAgentForChat]?.name || "").toLowerCase()}…`}
                    />
                    <Button type="submit" disabled={chatLoading}>
                      <span className="material-symbols-outlined text-base">send</span>
                      Send
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          )}

          {/* SUBVIEW 5: ALTERNATIVE IDEAS */}
          {activeTabSubView === "candidates" && loadedResult.candidates && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pooled candidate proposals</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Alternative candidates generated by this brainstorm run.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {loadedResult.candidates.map((cand, idx) => (
                  <Card key={idx} className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{cand.title}</h3>
                      <Badge tone="primary">Creator: {cand.creator || cand.agent || "AI Agent"}</Badge>
                    </div>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">{cand.idea}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => openCandidateModal(cand)}>View details</Button>
                      <Button className="flex-1" onClick={() => selectCandidateIdea(cand)}>
                        <span className="material-symbols-outlined text-base">sync</span>
                        Refine idea
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">folder_off</span>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project details unavailable</h3>
          <Button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }}>Back to brainstorming</Button>
        </div>
      )}
    </div>
  );
}
