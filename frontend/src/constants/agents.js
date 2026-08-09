export const AGENTS = [
  { id: "innovation", label: "Innovation", name: "Innovation Agent", role: "Novelty and creative edge", icon: "tips_and_updates", color: "#f59e0b" },
  { id: "feasibility", label: "Feasibility", name: "Feasibility Agent", role: "Engineering reality and constraints", icon: "construction", color: "#a855f7" },
  { id: "impact", label: "Impact", name: "Impact Agent", role: "User value and wow factor", icon: "stars", color: "#3b82f6" },
  { id: "technical", label: "Technical", name: "Technical Agent", role: "Architecture and system design", icon: "developer_board", color: "#10b981" },
  { id: "skeptic", label: "Skeptic", name: "Skeptic Agent", role: "Devil's advocate and failure modes", icon: "security_update_warning", color: "#f43f5e" },
  { id: "moderator", label: "Moderator", name: "Moderator", role: "Consensus synthesis", icon: "gavel", color: "#06b6d4" },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

export const JUDGE_AGENTS = AGENTS.filter((a) => a.id !== "moderator");

export const AGENT_STYLE = {
  innovation: { avatar: "tips_and_updates", color: "#f59e0b" },
  feasibility: { avatar: "construction", color: "#a855f7" },
  impact: { avatar: "stars", color: "#3b82f6" },
  technical: { avatar: "developer_board", color: "#10b981" },
  skeptic: { avatar: "security_update_warning", color: "#f43f5e" },
  moderator: { avatar: "gavel", color: "#06b6d4" },
};

export const agentIdFromName = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("innovation")) return "innovation";
  if (n.includes("feasibility")) return "feasibility";
  if (n.includes("impact")) return "impact";
  if (n.includes("technical")) return "technical";
  if (n.includes("skeptic")) return "skeptic";
  return "moderator";
};

export const agentDisplayName = (key) => `${key.charAt(0).toUpperCase()}${key.slice(1)} Agent`;
