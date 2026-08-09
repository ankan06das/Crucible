import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Badge, Button } from "./ui";

export default function DesktopSidebar() {
  const {
    activeProject,
    activeTab,
    activeVersionIdx,
    collaboratedProjects,
    goToPathway,
    handleDeleteClick,
    invitations,
    loadProjectDetails,
    loadedResult,
    projects,
    respondToInvitation,
    selectedCandidateIdx,
    setActiveDebateStage,
    setActiveTab,
    setActiveVersionIdx,
    versionList,
  } = useAppContext();

  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedIdeas, setExpandedIdeas] = useState({});

  useEffect(() => {
    if (activeProject?.id) {
      setExpandedProjects(prev => ({ ...prev, [activeProject.id]: true }));
      if (selectedCandidateIdx !== undefined) {
        setExpandedIdeas(prev => ({ ...prev, [`${activeProject.id}-${selectedCandidateIdx}`]: true }));
      }
    }
  }, [activeProject?.id, selectedCandidateIdx]);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-[#272c3d] dark:bg-[#0f1119] md:flex">
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <Button className="w-full" onClick={goToPathway}>
          <span className="material-symbols-outlined text-base">add</span>
          New brainstorm
        </Button>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invitations</h3>
              <Badge tone="primary">{invitations.length}</Badge>
            </div>
            {invitations.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-[#272c3d] dark:bg-[#1a1e2b]">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{inv.project_name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">From: {inv.sender_name}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => respondToInvitation(inv.id, "accept")}>Accept</Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => respondToInvitation(inv.id, "decline")}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Projects */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">My projects</h3>
          <div className="space-y-1">
            {projects.length === 0 ? (
              <p className="text-sm italic text-slate-400 dark:text-slate-500">No projects yet.</p>
            ) : (
              projects.map((proj) => (
                <div key={proj.id}>
                  <div className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm ${activeProject?.id === proj.id ? "bg-slate-100 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-[#1a1e2b]"}`}>
                    <button
                      onClick={() => loadProjectDetails(proj.id, 0)}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${activeProject?.id === proj.id ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      <span
                        className="material-symbols-outlined text-sm text-slate-400 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProjects(prev => ({ ...prev, [proj.id]: !prev[proj.id] }));
                        }}
                      >
                        {expandedProjects[proj.id] ? "expand_more" : "chevron_right"}
                      </span>
                      <span className="material-symbols-outlined text-base text-slate-400">{activeProject?.id === proj.id ? "folder_open" : "folder"}</span>
                      <span className="truncate">{proj.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(proj.id, e)}
                      className="hidden text-slate-400 hover:text-rose-500 group-hover:block"
                      title="Delete project"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>

                  {/* Browsable idea list under each project folder */}
                  {(() => {
                    if (!expandedProjects[proj.id]) return null;
                    let projIdeas = [];
                    if (activeProject?.id === proj.id && loadedResult) {
                      if (Array.isArray(loadedResult.candidates)) {
                        loadedResult.candidates.forEach((cand, idx) => {
                          const title = cand?.title || "";
                          const fallbackVersions = Array.isArray(loadedResult.versions) ? loadedResult.versions : [];
                          const ideaVersions = cand.versions && cand.versions.length > 0 ? cand.versions : (idx === 0 && fallbackVersions.length > 0 ? fallbackVersions : []);
                          const hasVersions = ideaVersions.length > 0;
                          projIdeas.push({ type: "candidate", idx, label: `Idea #${idx + 1}: ${title}`, title, hasVersions });
                          
                          // If this candidate has versions and it's expanded, add its versions underneath it
                          if (hasVersions && expandedIdeas[`${proj.id}-${idx}`]) {
                            ideaVersions.forEach((v, vIdx) => {
                              const vTitle = v?.moderator?.refined_idea || "";
                              projIdeas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title: vTitle, isNested: true, parentIdx: idx });
                            });
                          }
                        });
                      } else if (versionList && versionList.length > 0) {
                        // Fallback if no candidates array but versions exist
                        versionList.forEach((v, vIdx) => {
                          const title = v?.moderator?.refined_idea || "";
                          projIdeas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title, isNested: false });
                        });
                      }
                    } else if (proj.ideas && proj.ideas.length > 0) {
                      const candidates = proj.ideas.filter(i => i.type === "candidate");
                      const globalVersions = proj.ideas.filter(i => i.type === "version");
                      
                      projIdeas = [];
                      candidates.forEach((cand, idx) => {
                        const ideaVersions = cand.versions && cand.versions.length > 0 ? cand.versions : (idx === 0 && globalVersions.length > 0 ? globalVersions : []);
                        const hasVersions = ideaVersions.length > 0;
                        projIdeas.push({ ...cand, hasVersions });
                        if (hasVersions && expandedIdeas[`${proj.id}-${idx}`]) {
                          ideaVersions.forEach((v, vIdx) => {
                            projIdeas.push({ ...v, isNested: true, parentIdx: idx });
                          });
                        }
                      });
                      if (candidates.length === 0 && globalVersions.length > 0) {
                        projIdeas = globalVersions.map(v => ({ ...v, isNested: false }));
                      }
                    }
                    if (projIdeas.length === 0) return null;
                    return (
                      <div className="ml-6 space-y-0.5 border-l border-slate-200 pl-2 dark:border-[#272c3d]">
                        {projIdeas.map((idea, iIdx) => {
                          const isCandidate = idea.type === "candidate";
                          const isActive = activeProject?.id === proj.id && (
                            isCandidate
                              ? selectedCandidateIdx === idea.idx
                              : idea.idx === Math.min(activeVersionIdx, Math.max(0, (versionList?.length || 1) - 1))
                          );
                          return (
                            <div key={`${idea.type}-${idea.idx}`} className="flex items-center group/idea">
                              {isCandidate && idea.hasVersions && (
                                <span
                                  className="material-symbols-outlined text-xs text-slate-400 cursor-pointer hover:text-slate-700 w-4 mr-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: !prev[`${proj.id}-${idea.idx}`] }));
                                  }}
                                >
                                  {expandedIdeas[`${proj.id}-${idea.idx}`] ? "expand_more" : "chevron_right"}
                                </span>
                              )}
                              {!idea.hasVersions && isCandidate && <span className="w-4 mr-0.5" />}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (proj.id === activeProject?.id) {
                                    if (isCandidate) {
                                      setActiveVersionIdx(0);
                                      setActiveDebateStage("proposals");
                                      loadProjectDetails(proj.id, idea.idx);
                                      setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: true }));
                                    } else {
                                      setActiveVersionIdx(idea.idx);
                                      setActiveDebateStage("reviews");
                                    }
                                  } else if (isCandidate) {
                                    setActiveVersionIdx(0);
                                    loadProjectDetails(proj.id, idea.idx);
                                    setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: true }));
                                  } else {
                                    loadProjectDetails(proj.id);
                                    setActiveVersionIdx(idea.idx);
                                    setActiveDebateStage("reviews");
                                  }
                                }}
                                title={idea.title}
                                className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${idea.isNested ? "ml-4 border-l border-slate-200 dark:border-[#272c3d] pl-2" : ""} ${isActive ? "font-medium text-indigo-600 dark:text-indigo-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                              >
                                <span className="material-symbols-outlined text-sm">{isCandidate ? "lightbulb" : "history"}</span>
                                <span className="truncate">{idea.label}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collaborations */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Collaborations</h3>
          <div className="space-y-1">
            {collaboratedProjects.length === 0 ? (
              <p className="text-sm italic text-slate-400 dark:text-slate-500">Nothing shared yet.</p>
            ) : (
              collaboratedProjects.map((proj) => (
                <div key={proj.id}>
                  <div className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm ${activeProject?.id === proj.id ? "bg-slate-100 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-[#1a1e2b]"}`}>
                    <button
                      onClick={() => loadProjectDetails(proj.id, 0)}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${activeProject?.id === proj.id ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      <span
                        className="material-symbols-outlined text-sm text-slate-400 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProjects(prev => ({ ...prev, [proj.id]: !prev[proj.id] }));
                        }}
                      >
                        {expandedProjects[proj.id] ? "expand_more" : "chevron_right"}
                      </span>
                      <span className="material-symbols-outlined text-base text-slate-400">{activeProject?.id === proj.id ? "folder_open" : "folder"}</span>
                      <span className="truncate">{proj.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(proj.id, e)}
                      className="hidden text-slate-400 hover:text-rose-500 group-hover:block"
                      title="Remove project"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>

                  {/* Browsable idea list under each project folder */}
                  {(() => {
                    if (!expandedProjects[proj.id]) return null;
                    let projIdeas = [];
                    if (activeProject?.id === proj.id && loadedResult) {
                      if (Array.isArray(loadedResult.candidates)) {
                        loadedResult.candidates.forEach((cand, idx) => {
                          const title = cand?.title || "";
                          const fallbackVersions = Array.isArray(loadedResult.versions) ? loadedResult.versions : [];
                          const ideaVersions = cand.versions && cand.versions.length > 0 ? cand.versions : (idx === 0 && fallbackVersions.length > 0 ? fallbackVersions : []);
                          const hasVersions = ideaVersions.length > 0;
                          projIdeas.push({ type: "candidate", idx, label: `Idea #${idx + 1}: ${title}`, title, hasVersions });
                          
                          // If this candidate has versions and it's expanded, add its versions underneath it
                          if (hasVersions && expandedIdeas[`${proj.id}-${idx}`]) {
                            ideaVersions.forEach((v, vIdx) => {
                              const vTitle = v?.moderator?.refined_idea || "";
                              projIdeas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title: vTitle, isNested: true, parentIdx: idx });
                            });
                          }
                        });
                      } else if (versionList && versionList.length > 0) {
                        // Fallback if no candidates array but versions exist
                        versionList.forEach((v, vIdx) => {
                          const title = v?.moderator?.refined_idea || "";
                          projIdeas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title, isNested: false });
                        });
                      }
                    } else if (proj.ideas && proj.ideas.length > 0) {
                      const candidates = proj.ideas.filter(i => i.type === "candidate");
                      const globalVersions = proj.ideas.filter(i => i.type === "version");
                      
                      projIdeas = [];
                      candidates.forEach((cand, idx) => {
                        const ideaVersions = cand.versions && cand.versions.length > 0 ? cand.versions : (idx === 0 && globalVersions.length > 0 ? globalVersions : []);
                        const hasVersions = ideaVersions.length > 0;
                        projIdeas.push({ ...cand, hasVersions });
                        if (hasVersions && expandedIdeas[`${proj.id}-${idx}`]) {
                          ideaVersions.forEach((v, vIdx) => {
                            projIdeas.push({ ...v, isNested: true, parentIdx: idx });
                          });
                        }
                      });
                      if (candidates.length === 0 && globalVersions.length > 0) {
                        projIdeas = globalVersions.map(v => ({ ...v, isNested: false }));
                      }
                    }
                    if (projIdeas.length === 0) return null;
                    return (
                      <div className="ml-6 space-y-0.5 border-l border-slate-200 pl-2 dark:border-[#272c3d]">
                        {projIdeas.map((idea, iIdx) => {
                          const isCandidate = idea.type === "candidate";
                          const isActive = activeProject?.id === proj.id && (
                            isCandidate
                              ? selectedCandidateIdx === idea.idx
                              : idea.idx === Math.min(activeVersionIdx, Math.max(0, (versionList?.length || 1) - 1))
                          );
                          return (
                            <div key={`${idea.type}-${idea.idx}`} className="flex items-center group/idea">
                              {isCandidate && idea.hasVersions && (
                                <span
                                  className="material-symbols-outlined text-xs text-slate-400 cursor-pointer hover:text-slate-700 w-4 mr-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: !prev[`${proj.id}-${idea.idx}`] }));
                                  }}
                                >
                                  {expandedIdeas[`${proj.id}-${idea.idx}`] ? "expand_more" : "chevron_right"}
                                </span>
                              )}
                              {!idea.hasVersions && isCandidate && <span className="w-4 mr-0.5" />}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (proj.id === activeProject?.id) {
                                    if (isCandidate) {
                                      setActiveVersionIdx(0);
                                      setActiveDebateStage("proposals");
                                      loadProjectDetails(proj.id, idea.idx);
                                      setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: true }));
                                    } else {
                                      setActiveVersionIdx(idea.idx);
                                      setActiveDebateStage("reviews");
                                    }
                                  } else if (isCandidate) {
                                    setActiveVersionIdx(0);
                                    loadProjectDetails(proj.id, idea.idx);
                                    setExpandedIdeas(prev => ({ ...prev, [`${proj.id}-${idea.idx}`]: true }));
                                  } else {
                                    loadProjectDetails(proj.id);
                                    setActiveVersionIdx(idea.idx);
                                    setActiveDebateStage("reviews");
                                  }
                                }}
                                title={idea.title}
                                className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${idea.isNested ? "ml-4 border-l border-slate-200 dark:border-[#272c3d] pl-2" : ""} ${isActive ? "font-medium text-indigo-600 dark:text-indigo-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                              >
                                <span className="material-symbols-outlined text-sm">{isCandidate ? "lightbulb" : "history"}</span>
                                <span className="truncate">{idea.label}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System group */}
      <div className="border-t border-slate-200 p-4 dark:border-[#272c3d]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">System</p>
        <nav className="space-y-0.5">
          {[
            { id: "analytics", label: "Analytics", icon: "analytics" },
            { id: "config", label: "Configuration", icon: "settings" },
            { id: "logs", label: "Logs", icon: "terminal" },
            { id: "status", label: "Status", icon: "sensors" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${activeTab === item.id ? "bg-slate-100 text-slate-900 dark:bg-indigo-500/10 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#1a1e2b] dark:hover:text-white"}`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
