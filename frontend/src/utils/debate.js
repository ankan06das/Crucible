export function extractDebateReplies(roundRaw) {
  if (!roundRaw) return [];
  if (typeof roundRaw === "object") {
    if (Array.isArray(roundRaw.root)) return roundRaw.root;
    if (Array.isArray(roundRaw.arguments)) return roundRaw.arguments;
    if (Array.isArray(roundRaw)) return roundRaw;
  }
  if (typeof roundRaw === "string") {
    const replies = [];
    const regex = /DebateReply\(reply_to=['"]([^'"]+)['"],\s*stance=([^,]+),\s*argument=['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = regex.exec(roundRaw)) !== null) {
      let stanceStr = match[2];
      if (stanceStr.includes("DISAGREE") || stanceStr.includes("Disagree")) stanceStr = "Disagree";
      else if (stanceStr.includes("AGREE") || stanceStr.includes("Agree")) stanceStr = "Agree";
      else stanceStr = "Neutral";

      replies.push({
        reply_to: match[1],
        stance: stanceStr,
        argument: match[3],
      });
    }
    return replies;
  }
  return [];
}

export function getAllDebateExchanges(res) {
  if (!res) return [];
  const debatesDict =
    res.refined_debates || res.debates || res.debate || (res.refinement ? res.refinement.debate : {}) || {};
  const exchanges = [];

  Object.entries(debatesDict).forEach(([agentKey, roundData]) => {
    const speakerName = agentKey.charAt(0).toUpperCase() + agentKey.slice(1) + " Agent";
    const replies = extractDebateReplies(roundData);
    replies.forEach((reply) => {
      let stanceVal = reply.stance;
      if (typeof stanceVal === "object" && stanceVal.value) stanceVal = stanceVal.value;
      if (typeof stanceVal === "string" && stanceVal.includes("DISAGREE")) stanceVal = "Disagree";
      if (typeof stanceVal === "string" && stanceVal.includes("AGREE")) stanceVal = "Agree";

      exchanges.push({
        speaker: speakerName,
        target: reply.reply_to || "Panel",
        stance: stanceVal || "Challenge",
        argument: reply.argument,
      });
    });
  });
  return exchanges;
}

export function buildIdeasFromData(pd) {
  if (!pd || typeof pd !== "object") return [];
  const ideas = [];
  if (Array.isArray(pd.candidates)) {
    pd.candidates.forEach((cand, idx) => {
      const title = cand?.title || "";
      ideas.push({ type: "candidate", idx, label: `Idea #${idx + 1}: ${title}`, title });
    });
  }
  if (Array.isArray(pd.versions)) {
    pd.versions.forEach((v, vIdx) => {
      const title = v?.moderator?.refined_idea || "";
      ideas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title });
    });
  }
  if (ideas.length === 0 && pd.refinement && typeof pd.refinement === "object") {
    const title = pd.refinement.moderator?.refined_idea || "";
    ideas.push({ type: "version", idx: 0, label: "Version 1", title });
  }
  return ideas;
}
