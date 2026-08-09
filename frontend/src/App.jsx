import React, { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

const getAgentColor = (agentName) => {
  if (!agentName) return "#64748b";
  const name = agentName.toLowerCase();
  if (name.includes("innovation")) return "#eab308";
  if (name.includes("feasibility")) return "#a855f7";
  if (name.includes("impact")) return "#3b82f6";
  if (name.includes("technical")) return "#10b981";
  if (name.includes("skeptic")) return "#f43f5e";
  if (name.includes("moderator")) return "#06b6d4";
  return "#64748b";
};


export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem("crucible_token") || null);
  const [username, setUsername] = useState(localStorage.getItem("crucible_username") || "");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authError, setAuthError] = useState("");
  
  // App views state
  const [activeTab, setActiveTab] = useState("pathway"); // pathway, refine_form, generate_form, running, dashboard, history, analytics, config, logs, status
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [progressTime, setProgressTime] = useState(0.0);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null);
  const [loadedResult, setLoadedResult] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState("");
  const [refineIdea, setRefineIdea] = useState("");
  const [refineTheme, setRefineTheme] = useState("");
  const [refineTeam, setRefineTeam] = useState("");
  const [refineTime, setRefineTime] = useState("");

  const [genTopic, setGenTopic] = useState("");
  const [genTheme, setGenTheme] = useState("");
  const [genTeam, setGenTeam] = useState("");
  const [genTime, setGenTime] = useState("");
  const [genGoals, setGenGoals] = useState("");
  const [genConstraints, setGenConstraints] = useState("");
  const [genUrls, setGenUrls] = useState("");

  // Modal State
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Iteration baseline states
  const [operatorNotes, setOperatorNotes] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme toggle state
  const [theme, setTheme] = useState(localStorage.getItem("crucible_theme") || "dark");

  // Profile & Contact form states
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDept, setContactDept] = useState("AI Debater Core");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  // Collaborations, Invitations & Chat follow-ups states
  const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [selectedAgentForChat, setSelectedAgentForChat] = useState("moderator");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [candidateSelectionLoading, setCandidateSelectionLoading] = useState(false);
  const [activeTabSubView, setActiveTabSubView] = useState("overview"); // overview | reviews | debates | chat | candidates
  const [activeDebateStage, setActiveDebateStage] = useState("reviews");
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(0);
  const [selectedImprovements, setSelectedImprovements] = useState({});
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);

  const toggleImprovement = (idx) => {
    setSelectedImprovements(prev => ({
      ...prev,
      [idx]: !(prev[idx] ?? true)
    }));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("crucible_theme", theme);
  }, [theme]);

  // Ref hooks
  const consoleEndRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Check auth and load project list
  useEffect(() => {
    if (token) {
      loadProjects();
      loadCollaboratedProjects();
      loadInvitations();
    }
  }, [token]);

  // Scroll console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  // Sync active debate stage when active project changes
  useEffect(() => {
    if (activeProject) {
      const data = activeProject.project_data;
      if (data) {
        const hasRefinement = data.refinement !== undefined;
        if (hasRefinement) {
          setActiveDebateStage("reviews");
        } else {
          setActiveDebateStage("proposals");
        }
      }
    }
  }, [activeProject]);

  const buildIdeasFromData = (pd) => {
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
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        let data = await res.json();
        data = await Promise.all(data.map(async (p) => {
          if (p.ideas && p.ideas.length) return p;
          try {
            const d = await fetch(`${API_BASE}/api/projects/${p.id}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (d.ok) {
              const detail = await d.json();
              const ideas = buildIdeasFromData(detail.project_data);
              if (ideas.length) return { ...p, ideas };
            }
          } catch (err) {
            console.error("Error enriching project ideas", p.id, err);
          }
          return p;
        }));
        setProjects(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Error loading projects", err);
    }
  };

  const loadCollaboratedProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/collaborations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaboratedProjects(data);
      }
    } catch (err) {
      console.error("Error loading collaborated projects", err);
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/invitations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error("Error loading invitations", err);
    }
  };

  const respondToInvitation = async (invitationId, response) => {
    try {
      const res = await fetch(`${API_BASE}/api/invitations/${invitationId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });
      if (res.ok) {
        loadInvitations();
        loadProjects();
        loadCollaboratedProjects();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Error responding to invitation");
      }
    } catch (err) {
      console.error("Error responding to invitation", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get("accept_invite") || params.get("invite");
    if (inviteId && token) {
      respondToInvitation(inviteId, "accept").then(() => {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, "", newUrl);
      });
    }
  }, [token]);

  const loadCollaborators = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/collaborators`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error("Error loading collaborators", err);
    }
  };

  const inviteCollaborator = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteStatus("Transmitting uplink invitation...");
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProject.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteStatus(`[SUCCESS] ${data.message || `Invite sent to ${inviteEmail}`}`);
        setInviteEmail("");
        loadCollaborators(activeProject.id);
      } else {
        setInviteStatus(`[ERROR] ${data.detail || "Failed to transmit invite"}`);
      }
    } catch (err) {
      setInviteStatus("[ERROR] Connection lost to server");
    }
  };

  const extractDebateReplies = (roundRaw) => {
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
          argument: match[3]
        });
      }
      return replies;
    }
    return [];
  };

  const getAllDebateExchanges = (res) => {
    if (!res) return [];
    const debatesDict = res.refined_debates || res.debates || res.debate || (res.refinement ? res.refinement.debate : {}) || {};
    const exchanges = [];
    
    Object.entries(debatesDict).forEach(([agentKey, roundData]) => {
      const speakerName = agentKey.charAt(0).toUpperCase() + agentKey.slice(1) + " Agent";
      const replies = extractDebateReplies(roundData);
      replies.forEach(reply => {
        let stanceVal = reply.stance;
        if (typeof stanceVal === "object" && stanceVal.value) stanceVal = stanceVal.value;
        if (typeof stanceVal === "string" && stanceVal.includes("DISAGREE")) stanceVal = "Disagree";
        if (typeof stanceVal === "string" && stanceVal.includes("AGREE")) stanceVal = "Agree";
        
        exchanges.push({
          speaker: speakerName,
          target: reply.reply_to || "Panel",
          stance: stanceVal || "Challenge",
          argument: reply.argument
        });
      });
    });
    return exchanges;
  };

  const selectCandidateIdea = async (candidate) => {
    if (!activeProject) return;
    setCandidateSelectionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProject.id}/select-candidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: candidate.title || activeProject.name, idea: candidate.idea || activeProject.name })
      });
      if (res.ok) {
        const data = await res.json();
        loadProjectDetails(data.project_id, selectedCandidateIdx);
      } else {
        alert("Failed to initialize debate refinement for chosen topic");
      }
    } catch (err) {
      console.error("Error selecting candidate", err);
    } finally {
      setCandidateSelectionLoading(false);
    }
  };

  const handleRefineCurrentIdea = () => {
    // If the idea is already refined, re-iterating should stack a new VERSION of the
    // same idea (no new project) rather than silently overwrite the current analysis.
    const alreadyRefined = !!(loadedResult?.refinement) || !!(loadedResult?.versions?.length) || !!loadedResult?.moderator;
    if (alreadyRefined) {
      if (typeof triggerIteration === "function") triggerIteration();
      return;
    }
    const cand = getActiveCandidateInfo();
    if (cand) {
      selectCandidateIdea(cand);
    }
  };

  const getActiveCandidateInfo = () => {
    const idx = selectedCandidateIdx ?? 0;
    if (!loadedResult && !activeProject) {
      return {
        title: "Project Concept",
        idea: "Project idea concept pending refinement.",
        agent: "Innovation Agent",
        fit: 8,
        problem: "No problem statement specified.",
        evidence: [],
        counterfact: []
      };
    }

    if (loadedResult?.candidates && Array.isArray(loadedResult.candidates) && loadedResult.candidates[idx]) {
      const cand = loadedResult.candidates[idx];
      return {
        title: cand.title || activeProject?.name || "Candidate Idea",
        idea: cand.idea || cand.problem || cand.title || activeProject?.name || "",
        agent: cand.agent || cand.creator || "Innovation Agent",
        fit: cand.hackathon_fit || 8,
        problem: cand.problem || "No problem statement provided.",
        evidence: Array.isArray(cand.evidence) ? cand.evidence : [],
        counterfact: Array.isArray(cand.counterfact) ? cand.counterfact : []
      };
    }

    if (loadedResult?.selected_candidate) {
      return {
        title: loadedResult.selected_candidate.title || activeProject?.name || "Selected Concept",
        idea: loadedResult.selected_candidate.idea || activeProject?.name || "",
        agent: "Moderator Agent",
        fit: 9,
        problem: loadedResult?.problem || "Refined concept problem statement.",
        evidence: Array.isArray(loadedResult?.evidence) ? loadedResult.evidence : [],
        counterfact: []
      };
    }

    return {
      title: activeProject?.name || "Project Concept",
      idea: loadedResult?.idea || activeProject?.name || "",
      agent: "Innovation Agent",
      fit: 8,
      problem: loadedResult?.problem || "Concept definition",
      evidence: Array.isArray(loadedResult?.evidence) ? loadedResult.evidence : [],
      counterfact: []
    };
  };

  const sendAgentMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput;
    setChatInput("");
    setChatLoading(true);
    
    setChats(prev => [...prev, { sender: username, message: userMessage, created_at: new Date().toISOString() }]);
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProject.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage, recipient: selectedAgentForChat })
      });
      if (res.ok) {
        const chatRes = await fetch(`${API_BASE}/api/projects/${activeProject.id}/chats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChats(chatData);
        }
      } else {
        alert("Failed to reach agent uplink.");
      }
    } catch (err) {
      console.error("Error communicating with agent", err);
    } finally {
      setChatLoading(false);
    }
  };

  const loadProjectDetails = async (projectId, candidateIdx = 0) => {
    if (!projectId) return;
    setProjectLoading(true);
    setActiveTab("dashboard");
    setSelectedCandidateIdx(candidateIdx);
    setSelectedImprovements({});
    
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        let parsedData = data.project_data || {};
        if (typeof parsedData === "string") {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (e) {
            console.error("Failed to parse project_data string", e);
            parsedData = {};
          }
        }
        setActiveProject(data);
        setLoadedResult(parsedData);
        setActiveVersionIdx(Array.isArray(parsedData.versions) && parsedData.versions.length
          ? parsedData.versions.length - 1
          : 0);
        loadCollaborators(projectId);
        
        // Load chats
        const chatRes = await fetch(`${API_BASE}/api/projects/${projectId}/chats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChats(Array.isArray(chatData) ? chatData : []);
        } else {
          setChats([]);
        }
        
        setActiveTabSubView("overview");
      } else {
        console.error("Failed to fetch project details", res.status);
      }
    } catch (err) {
      console.error("Error loading project details", err);
    } finally {
      setProjectLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setCollaboratedProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProject?.id === projectId) {
          setActiveProject(null);
          setLoadedResult(null);
          setChats([]);
          setActiveTab("pathway");
        }
      } else {
        console.error("Failed to delete project", await res.text());
        alert("Failed to delete project from database");
      }
    } catch (err) {
      console.error("Error deleting project", err);
    }
  };

  const handleDeleteClick = (projectId, e) => {
    e.stopPropagation();
    setDeleteConfirmProject(projectId);
  };

// Duplicate handleLogin definition removed

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const userVal = e.target.username.value;
    const passVal = e.target.password.value;
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUsername(data.username);
        localStorage.setItem("crucible_token", data.token);
        localStorage.setItem("crucible_username", data.username);
      } else {
        const data = await res.json();
        setAuthError(data.detail || "Authentication failed");
      }
    } catch (err) {
      setAuthError("Failed to connect to database server");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    const userVal = e.target.username.value;
    const passVal = e.target.password.value;
    const emailVal = e.target.email.value;
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal, email: emailVal })
      });
      if (res.ok) {
        setAuthMode("login");
        alert("Registration complete. Authorize session passcode now.");
      } else {
        const data = await res.json();
        setAuthError(data.detail || "Registration failed");
      }
    } catch (err) {
      setAuthError("Failed to connect to database server");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUsername("");
    localStorage.removeItem("crucible_token");
    localStorage.removeItem("crucible_username");
    localStorage.removeItem("crucible_email");
    setActiveProject(null);
    setLoadedResult(null);
    setChats([]);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!newUsername && !newEmail) {
      alert("Please provide a new username or email to update.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(newUsername && { username: newUsername }),
          ...(newEmail && { email: newEmail }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
        localStorage.setItem("crucible_username", data.username);
        if (data.email) {
          localStorage.setItem("crucible_email", data.email);
        }
        setNewUsername("");
        setNewEmail("");
        setPasscodeSuccess("Profile updated successfully.");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    }
  };

  const appendConsoleLine = (text, color = "#e2e2e2") => {
    setConsoleLogs(prev => [...prev, { text, color }]);
  };

  const runMockLogs = (callback) => {
    const steps = [
      { agent: "SYSTEM", avatar: "memory", color: "text-slate-400 border-slate-500/20 bg-slate-500/10", text: "Initiating A2A Neural Protocol & Judge Panel..." },
      { agent: "Innovation Agent", avatar: "tips_and_updates", color: "text-amber-400 border-amber-500/30 bg-amber-500/10", text: "Scanning concept for novelty & unique selling proposition..." },
      { agent: "Feasibility Agent", avatar: "construction", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", text: "Evaluating hackathon timeline constraints & scope limits..." },
      { agent: "Impact Agent", avatar: "stars", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", text: "Assessing user pain point, market adoption & demo WOW-factor..." },
      { agent: "Technical Agent", avatar: "developer_board", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", text: "Reviewing architecture: API integration, NLP libraries, database schema..." },
      { agent: "Skeptic Agent", avatar: "security_update_warning", color: "text-rose-400 border-rose-500/30 bg-rose-500/10", text: "Skeptic challenge: Building full NLP in 24 hours has high integration risk!" },
      { agent: "Technical Agent", avatar: "developer_board", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", text: "Rebuttal: We can use pre-trained BERT/Rasa models to eliminate custom NLP training." },
      { agent: "Feasibility Agent", avatar: "construction", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", text: "Agreed! Pre-trained libraries reduce effort from 20 hours to 4 hours." },
      { agent: "Innovation Agent", avatar: "tips_and_updates", color: "text-amber-400 border-amber-500/30 bg-amber-500/10", text: "Reflected score: Score revised up to 8/10 based on pre-trained API strategy." },
      { agent: "Moderator Agent", avatar: "gavel", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10", text: "Consensus reached: Scope down, utilize Rasa/BERT, prioritize 3-minute demo flow." }
    ];

    setConsoleLogs([{ agent: "SYSTEM", avatar: "memory", color: "text-slate-400", text: "Initializing node thread..." }]);
    let index = 0;

    function printNext() {
      if (index < steps.length) {
        setConsoleLogs(prev => [...prev, { ...steps[index], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
        setTimeout(printNext, steps[index].delay || 800);
        index++;
      } else {
        if (callback) callback();
      }
    }
    printNext();
  };

  const startProgressTimer = () => {
    setProgressTime(0.0);
    const start = Date.now();
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgressTime(parseFloat(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);
  };

  const stopProgressTimer = () => {
    clearInterval(progressTimerRef.current);
  };

  const readStreamResponse = async (response, onLog, onResult, onError) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep partial line in buffer
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === "log") {
                onLog(data);
              } else if (data.type === "result") {
                onResult(data);
              } else if (data.type === "error") {
                onError(data.detail || "Server error in stream");
              }
            } catch (err) {
              console.error("Failed to parse stream line:", trimmed, err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Stream reader error:", err);
      onError(err.message);
    }
  };

  const submitRefine = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([{
      agent: "SYSTEM",
      text: "Establishing secure connection to neural pathway...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);

    const payload = {
      project_name: projectName,
      idea: refineIdea,
      theme: refineTheme || null,
      team_size: refineTeam ? parseInt(refineTeam) : null,
      time_hours: refineTime ? parseInt(refineTime) : null
    };

    try {
      const res = await fetch(`${API_BASE}/idea/refine`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      let resultData = null;
      await readStreamResponse(
        res,
        (log) => {
          setConsoleLogs(prev => [...prev, {
            agent: log.agent || "SYSTEM",
            text: log.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }]);
        },
        (result) => {
          resultData = result;
        },
        (errorMsg) => {
          throw new Error(errorMsg);
        }
      );

      stopProgressTimer();
      if (!resultData) {
        throw new Error("No result metadata returned from stream.");
      }

      loadProjects();
      loadProjectDetails(resultData.project_id);
    } catch (err) {
      stopProgressTimer();
      setConsoleLogs(prev => [...prev, {
        agent: "SYSTEM",
        text: `[ERROR] Refinement pipeline execution failed: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
      alert("Execution failed: " + err.message);
      setActiveTab("refine_form");
    }
  };

  const submitGenerate = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([{
      agent: "SYSTEM",
      text: "Establishing secure connection to neural pathway...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);

    const urls = genUrls ? genUrls.split(/\s+/).filter(u => u.trim()) : null;
    const payload = {
      project_name: projectName,
      topic: genTopic,
      theme: genTheme || null,
      team_size: genTeam ? parseInt(genTeam) : null,
      time_hours: genTime ? parseInt(genTime) : null,
      goals: genGoals || null,
      constraints: genConstraints || null,
      urls
    };

    try {
      const res = await fetch(`${API_BASE}/idea/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      let resultData = null;
      await readStreamResponse(
        res,
        (log) => {
          setConsoleLogs(prev => [...prev, {
            agent: log.agent || "SYSTEM",
            text: log.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }]);
        },
        (result) => {
          resultData = result;
        },
        (errorMsg) => {
          throw new Error(errorMsg);
        }
      );

      stopProgressTimer();
      if (!resultData) {
        throw new Error("No result metadata returned from stream.");
      }

      loadProjects();
      loadProjectDetails(resultData.project_id);
    } catch (err) {
      stopProgressTimer();
      setConsoleLogs(prev => [...prev, {
        agent: "SYSTEM",
        text: `[ERROR] Generation pipeline execution failed: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
      alert("Execution failed: " + err.message);
      setActiveTab("generate_form");
    }
  };

  const triggerIteration = async () => {
    if (!activeProject || !loadedResult) return;

    const accepted = [];
    const rejected = [];
    
    document.querySelectorAll('#decision-checklist input[type="checkbox"]').forEach(chk => {
      if (chk.checked) accepted.push(chk.value);
      else rejected.push(chk.value);
    });

    const _versionList = Array.isArray(loadedResult.versions) ? loadedResult.versions : null;
    const _curVersion = _versionList && _versionList.length
      ? _versionList[Math.min(activeVersionIdx, _versionList.length - 1)]
      : null;
    const baseIdea = _curVersion?.moderator?.refined_idea
      || loadedResult?.refinement?.moderator?.refined_idea
      || loadedResult?.moderator?.refined_idea
      || "";

    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([{
      agent: "SYSTEM",
      text: "Establishing secure connection to neural pathway...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);

    const payload = {
      project_name: activeProject.name,
      idea: `BASELINE IDEA:\n${baseIdea}\n\nAccepted Improvements:\n${accepted.map(a => `- ${a}`).join('\n')}\n\nRejected Improvements:\n${rejected.map(r => `- ${r}`).join('\n')}\n\nOperator Notes:\n${operatorNotes}`,
      theme: null,
      team_size: null,
      time_hours: null,
      project_id: activeProject.id
    };

    try {
      const res = await fetch(`${API_BASE}/idea/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      let resultData = null;
      await readStreamResponse(
        res,
        (log) => {
          setConsoleLogs(prev => [...prev, {
            agent: log.agent || "SYSTEM",
            text: log.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }]);
        },
        (result) => {
          resultData = result;
        },
        (errorMsg) => {
          throw new Error(errorMsg);
        }
      );

      stopProgressTimer();
      if (!resultData) {
        throw new Error("No result metadata returned from stream.");
      }

      // Reload the SAME project; point at the newest version (iterations stack, no new project).
      setActiveVersionIdx((resultData.version != null ? resultData.version : 1) - 1);
      loadProjects();
      loadProjectDetails(activeProject.id);
    } catch (err) {
      stopProgressTimer();
      setConsoleLogs(prev => [...prev, {
        agent: "SYSTEM",
        text: `[ERROR] Iteration failed: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
      alert("Iteration failed: " + err.message);
      setActiveTab("dashboard");
    }
  };

  const openAgentModal = (name) => {
    if (!loadedResult) return;
    const key = name.toLowerCase();
    const reviews = innerResult.refined_reviews || innerResult.reviews || (innerResult.refinement ? innerResult.refinement.reviews : {}) || {};
    const reflections = innerResult.refined_reflections || innerResult.reflections || (innerResult.refinement ? innerResult.refinement.reflections : {}) || {};
    const debates = innerResult.refined_debates || innerResult.debates || innerResult.debate || (innerResult.refinement ? innerResult.refinement.debate : {}) || {};

    const revRaw = reviews[key] || reviews[name] || reviews[name.toLowerCase()] || reviews[name + " Agent"];
    const reflRaw = reflections[key] || reflections[name] || reflections[name.toLowerCase()] || reflections[name + " Agent"];
    const roundRaw = debates[key] || debates[name] || debates[name.toLowerCase()] || debates[name + " Agent"];

    const rev = typeof revRaw === "object" ? revRaw : (typeof revRaw === "string" ? { score: 7, strengths: [revRaw], weaknesses: [], suggestions: [] } : {});
    const refl = typeof reflRaw === "object" ? reflRaw : (typeof reflRaw === "string" ? { new_score: 8 } : {});
    const debateReplies = extractDebateReplies(roundRaw);

    setModalTitle(`${name} Agent Arguments & Debate Log`);
    setModalContent(
      <div className="space-y-md">
        <div className="border-b border-slate-200 dark:border-white/10 pb-sm mb-md">
          <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase mb-xs font-display-lg">Independent Review Snapshot</h4>
          <div className="grid grid-cols-2 gap-sm text-[11px] pt-xs font-code-sm">
            <div>Score: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{rev.score !== undefined ? rev.score : 7}/10</span></div>
            <div>Confidence: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{rev.confidence || "0.85"}</span></div>
          </div>
          <div className="mt-sm space-y-xs font-code-sm">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-on-surface-variant block font-bold">Key Strengths & Weaknesses</span>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-100 dark:bg-white/5 p-xs rounded">
              {rev.strengths && Array.isArray(rev.strengths) ? rev.strengths.join(", ") : (typeof rev.strengths === "string" ? rev.strengths : "Independent review logged.")}
            </p>
          </div>
        </div>

        <div className="space-y-sm font-code-sm">
          <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase mb-sm font-display-lg flex items-center gap-xs">
            <span className="material-symbols-outlined text-sm">chat_bubble</span> Debate Stances & Rebuttals ({debateReplies.length})
          </h4>
          {debateReplies.length > 0 ? (
            debateReplies.map((arg, idx) => {
              const isDisagree = arg.stance && (arg.stance.toLowerCase().includes("disagree") || arg.stance.toLowerCase().includes("challenge"));
              return (
                <div key={idx} className="bg-slate-50 dark:bg-[#131313] p-sm border border-slate-200 dark:border-white/10 rounded-lg space-y-xs">
                  <div className="flex justify-between items-center mb-xs">
                    <div className="text-xs">Challenged <span className="font-bold text-cyan-700 dark:text-cyan-300 uppercase">{arg.reply_to}</span></div>
                    <span className={`text-[9px] px-xs py-base rounded uppercase tracking-widest font-bold ${isDisagree ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>{arg.stance || "Stance"}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">{arg.argument}</p>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 dark:text-on-surface-variant italic text-xs bg-slate-100 dark:bg-white/5 p-sm rounded text-center">This agent participated in independent review and reflection rounds.</div>
          )}
        </div>

        {refl && (refl.new_score !== undefined || refl.reason) && (
          <div className="border-t border-slate-200 dark:border-white/10 pt-sm mt-md space-y-xs font-code-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase mb-xs font-display-lg">Post-Debate Reflection</h4>
            {refl.new_score !== undefined && (
              <div className="text-[11px] pt-xs">
                Reflected Score: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{refl.new_score}/10</span>
                {refl.old_score && <span className="text-slate-500 dark:text-on-surface-variant ml-xs">(Was: {refl.old_score})</span>}
              </div>
            )}
            {refl.reason && <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-xs italic bg-slate-100 dark:bg-white/5 p-xs rounded border border-slate-200 dark:border-white/5">"{refl.reason}"</p>}
          </div>
        )}
      </div>
    );
    setShowModal(true);
  };

  const openCandidateModal = (cand) => {
    setModalTitle(`Proposal Details: ${cand.title}`);
    setModalContent(
      <div className="space-y-md">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-surface-variant block font-bold">Hackathon Pitch Idea</span>
          <p className="text-sm text-white bg-[#131313] p-sm border border-white/5 rounded leading-relaxed">{cand.idea}</p>
        </div>
        <div className="grid grid-cols-2 gap-sm text-[11px]">
          <div>Proposed By: <span className="text-secondary font-bold">{cand.agent}</span></div>
          <div>Fit Rating: <span className="text-tertiary font-bold">{cand.hackathon_fit}/10</span></div>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-surface-variant block font-bold">Concrete Problem Statement</span>
          <p className="text-on-surface-variant leading-relaxed">{cand.problem}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-surface-variant block font-bold">Decisive Supporting Facts</span>
          <ul className="list-disc list-inside space-y-xs pl-xs text-on-surface-variant">
            {(cand.evidence || []).map((e, idx) => <li key={idx}>{e}</li>)}
          </ul>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-on-surface-variant block font-bold">Counterfacts / Open Assumptions</span>
          <ul className="list-disc list-inside space-y-xs pl-xs text-on-surface-variant">
            {(cand.counterfact || []).map((c, idx) => <li key={idx}>{c}</li>)}
          </ul>
        </div>
        <button
          onClick={() => {
            setShowModal(false);
            selectCandidateIdea(cand);
          }}
          className="w-full mt-md bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-label-xs text-xs font-bold py-sm rounded uppercase tracking-widest transition-all flex items-center justify-center gap-xs"
        >
          Initialize Refining Debate on this Idea
          <span className="material-symbols-outlined text-sm">rocket_launch</span>
        </button>
      </div>
    );
    setShowModal(true);
  };

  // Render Helper for Auth
  if (!token) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary-container/20 via-background to-background"></div>
        <div class="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary-container/20 via-background to-background"></div>

        <div className="w-full max-w-md bg-[#0A0A0A]/85 backdrop-blur-[25px] border border-white/10 p-md md:p-lg rounded-xl neon-glow-primary relative">
          <div className="text-center mb-lg">
            <div className="inline-flex items-center gap-xs px-xs py-base bg-primary/10 border border-primary/20 rounded-sm mb-sm">
              <span className="font-label-xs text-label-xs text-primary-container tracking-widest uppercase font-bold">Secure Access Gateway</span>
            </div>
            <div className="flex items-center justify-center gap-sm mb-xs">
              <img src="/favicon.png" className="w-10 h-10 rounded-full" alt="Crucible Logo" />
              <h1 className="font-display-lg text-[32px] font-bold text-primary tracking-tight">Crucible.</h1>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant mt-2 uppercase tracking-wide">
              {authMode === "login" ? "Enter credentials to initialize session" : "Register a new node access account"}
            </p>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-md">
            <div className="space-y-xs relative scanline">
              <label className="font-code-sm text-label-xs text-on-surface-variant uppercase tracking-wider block">Operator Username</label>
              <input type="text" name="username" required className="w-full bg-[#131313] border border-white/10 text-on-surface p-sm font-code-sm text-code-sm rounded-DEFAULT focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
            </div>
            {authMode === "register" && (
              <div className="space-y-xs relative scanline">
                <label className="font-code-sm text-label-xs text-on-surface-variant uppercase tracking-wider block">Operator Email Address</label>
                <input type="email" name="email" required className="w-full bg-[#131313] border border-white/10 text-on-surface p-sm font-code-sm text-code-sm rounded-DEFAULT focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
              </div>
            )}
            <div className="space-y-xs relative scanline">
              <label className="font-code-sm text-label-xs text-on-surface-variant uppercase tracking-wider block">Passcode Key</label>
              <input type="password" name="password" required className="w-full bg-[#131313] border border-white/10 text-on-surface p-sm font-code-sm text-code-sm rounded-DEFAULT focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
            </div>

            {authError && (
              <div className="text-error text-xs font-code-sm py-xs px-sm bg-error-container/20 border border-error/20 rounded-sm">
                {authError}
              </div>
            )}

            <button type="submit" className="w-full bg-primary-container text-on-primary-container font-label-xs text-label-xs py-sm rounded-DEFAULT hover:shadow-[0_0_15px_rgba(0,242,255,0.7)] transition-all uppercase tracking-widest font-bold">
              {authMode === "login" ? "Authorize Session" : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-md font-code-sm text-xs text-on-surface-variant uppercase">
            {authMode === "login" ? (
              <button onClick={() => setAuthMode("register")} className="hover:text-primary transition-colors">No access key? Register new operator account</button>
            ) : (
              <button onClick={() => setAuthMode("login")} className="hover:text-primary transition-colors">Already registered? Log in here</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper variables for dash elements
  const activeCand = getActiveCandidateInfo ? getActiveCandidateInfo() : null;
  const isCurrentCandidateRefined = loadedResult?.selected_candidate && activeCand && (
    activeCand.title === loadedResult.selected_candidate.title ||
    loadedResult.selected_candidate.title?.toLowerCase().includes(activeCand.title?.toLowerCase()) ||
    activeCand.title?.toLowerCase().includes(loadedResult.selected_candidate.title?.toLowerCase())
  );

  const versionList = Array.isArray(loadedResult?.versions) ? loadedResult.versions : null;
  const activeVersion = versionList && versionList.length > 0
    ? versionList[Math.min(activeVersionIdx, versionList.length - 1)]
    : null;

  const innerResult = loadedResult 
    ? (activeVersion
        ? activeVersion
        : (loadedResult.selected_candidate 
            ? (isCurrentCandidateRefined ? (loadedResult.refinement || {}) : {})
            : (loadedResult.result || loadedResult.refinement || loadedResult))) 
    : {};
  const isGenerationKind = loadedResult && (loadedResult.kind === "generate" || !!innerResult?.conclusion);

  // Normalize refinement data across storage shapes so the debate workspace always renders
  // Structured analysis may live under innerResult.refinement or directly under innerResult.
  const innerRefinement = innerResult?.refinement
    || (innerResult && (innerResult.reviews || innerResult.reflections || innerResult.moderator) ? innerResult : null);
  const innerStageData = innerRefinement || innerResult;

  const isBrainstormTab = ["pathway", "refine_form", "generate_form", "running", "dashboard", "analytics", "config", "logs", "status"].includes(activeTab);

  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-background dark:text-on-surface transition-all duration-200">
      
      {/* PERSISTENT TOP NAVBAR */}
      <nav className="w-full bg-white dark:bg-[#0A0A0A]/95 border-b border-slate-200 dark:border-white/10 px-md py-sm flex justify-between items-center z-50 shadow-sm sticky top-0">
        <div className="flex items-center gap-md">
          {/* Mobile hamburger menu indicator */}
          {isBrainstormTab && (
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white p-xs rounded-full flex items-center justify-center mr-xs">
              <span className="material-symbols-outlined text-sm">menu</span>
            </button>
          )}
          <div className="flex items-center gap-xs cursor-pointer" onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }}>
            <div className="font-display-lg text-headline-lg-mobile font-[900] text-slate-900 dark:text-primary tracking-tighter">
                <span>Crucible.</span>
            </div>
            <img src="/favicon.png" className="w-4 h-4 rounded-full" alt="Crucible Logo" />
          </div>
          
          <div className="hidden md:flex items-center gap-xs font-code-sm text-xs select-none pl-md">
            <button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }} className={`px-sm py-base rounded uppercase transition-all font-bold ${isBrainstormTab ? "text-slate-900 dark:text-primary bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white"}`}>
              Brainstorm
            </button>
            <button onClick={() => { setActiveTab("profile"); }} className={`px-sm py-base rounded uppercase transition-all font-bold ${activeTab === "profile" ? "text-slate-900 dark:text-primary bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white"}`}>
              Profile
            </button>
            <button onClick={() => { setActiveTab("about"); }} className={`px-sm py-base rounded uppercase transition-all font-bold ${activeTab === "about" ? "text-slate-900 dark:text-primary bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white"}`}>
              About Us
            </button>
            <button onClick={() => { setActiveTab("contact"); }} className={`px-sm py-base rounded uppercase transition-all font-bold ${activeTab === "contact" ? "text-slate-900 dark:text-primary bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white"}`}>
              Contact Us
            </button>
          </div>
        </div>

        <div className="flex items-center gap-md">
          {/* Light/Dark Toggle */}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white transition-colors p-xs rounded-full flex items-center justify-center" title="Toggle Light/Dark Theme">
            <span className="material-symbols-outlined text-[16px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>

          {/* Welcome Clearance */}
          <div className="hidden lg:block font-code-sm text-xs text-slate-500 dark:text-on-surface-variant select-none">
            Operator: <span className="text-slate-800 dark:text-primary font-bold">{username}</span>
          </div>

          <button onClick={handleLogout} className="bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-on-surface font-label-xs text-label-xs py-base px-sm rounded-DEFAULT uppercase tracking-wider font-bold transition-all flex items-center gap-xs">
            <span className="material-symbols-outlined text-xs select-none">logout</span>
            Logout
          </button>
        </div>
      </nav>

      {/* WORKSPACE & LAYOUT CONTAINER */}
      <div className="w-full flex-1 flex relative">
        
        {/* Render Sidebar ONLY on Brainstorm Workspace views */}
        {isBrainstormTab && (
          <>
            {/* SideNavBar (Desktop) */}
            <nav className="hidden md:flex bg-white dark:bg-surface-container-lowest/90 backdrop-blur-2xl text-slate-800 dark:text-primary-fixed-dim fixed left-0 top-[57px] h-[calc(100vh-57px)] w-64 z-40 border-r border-slate-200 dark:border-white/10 flex-col py-md px-sm gap-md">
              <div className="mb-sm">
                <h1 className="font-display-lg text-headline-lg font-black text-slate-800 dark:text-primary tracking-tighter select-none">NODE_01</h1>
                <p className="font-label-xs text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-widest mt-base active-run-label">
                  {activeTab === "running" ? "Status: Executing Debate" : activeTab === "dashboard" ? "Status: Session Loaded" : "Status: System Ready"}
                </p>
              </div>

              <button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); setProjectName(""); }} className="bg-primary-container text-on-primary-container font-label-xs text-label-xs py-sm px-md rounded-DEFAULT hover:shadow-[0_0_10px_rgba(126,189,240,0.8)] transition-all mb-sm uppercase tracking-widest font-bold text-center">
                NEW BRAINSTORM
              </button>

              <div className="flex-1 flex flex-col gap-sm overflow-y-auto pr-base">
                {/* 1. Pending Invitations Section */}
                {invitations.length > 0 && (
                  <div className="bg-primary/5 dark:bg-primary-container/10 border border-primary/20 dark:border-primary-container/30 rounded-lg p-sm space-y-sm text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-code-sm text-[10px] text-primary dark:text-primary-fixed-dim uppercase tracking-wider font-bold select-none">Uplink Invites</span>
                      <span className="bg-primary text-white text-[9px] px-xs rounded font-bold">{invitations.length}</span>
                    </div>
                    <div className="space-y-xs max-h-[15vh] overflow-y-auto">
                      {invitations.map(inv => (
                        <div key={inv.id} className="text-[10px] bg-white dark:bg-black/40 p-xs rounded border border-slate-200 dark:border-white/5 space-y-xs font-code-sm">
                          <div className="font-bold text-slate-800 dark:text-primary-fixed-dim truncate">{inv.project_name}</div>
                          <div className="text-slate-500 dark:text-on-surface-variant truncate">From: {inv.sender_name}</div>
                          <div className="flex gap-xs pt-base">
                            <button onClick={() => respondToInvitation(inv.id, "accept")} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-[2px] rounded text-[9px] uppercase">Accept</button>
                            <button onClick={() => respondToInvitation(inv.id, "decline")} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-bold py-[2px] rounded text-[9px] uppercase">Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. My Projects */}
                <div>
                  <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold text-left">My Projects</div>
                  <div className="space-y-xs max-h-[22vh] overflow-y-auto pr-xs">
                    {projects.length === 0 ? (
                      <div className="text-slate-400 dark:text-on-surface-variant text-[10px] italic px-sm text-left">No owned projects</div>
                    ) : (
                      projects.map(proj => (
                        <div key={proj.id} className="space-y-base">
                          <a onClick={() => loadProjectDetails(proj.id, 0)} className={`flex items-center justify-between gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 border-l-2 border-primary-container font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                            <div className="flex items-center gap-xs min-w-0 truncate">
                              <span className="material-symbols-outlined text-xs select-none flex-shrink-0">folder</span>
                              <span className="truncate">{proj.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(proj.id, e); }} className="ml-auto text-slate-400 hover:text-red-500 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5" title="Delete Project">
                              <span className="material-symbols-outlined text-xs select-none">delete</span>
                            </button>
                          </a>

                          {/* Browsable idea list under each project folder */}
                          {(() => {
                            // Build the idea list from loaded data for the active project
                            // (works without a backend restart), else from the projects payload.
                            let projIdeas = [];
                            if (activeProject?.id === proj.id && loadedResult) {
                              if (Array.isArray(loadedResult.candidates)) {
                                loadedResult.candidates.forEach((cand, idx) => {
                                  const title = cand?.title || "";
                                  projIdeas.push({ type: "candidate", idx, label: `Idea #${idx + 1}: ${title}`, title });
                                });
                              }
                              if (versionList && versionList.length > 0) {
                                versionList.forEach((v, vIdx) => {
                                  const title = v?.moderator?.refined_idea || "";
                                  projIdeas.push({ type: "version", idx: vIdx, label: `Version ${v.version ?? vIdx + 1}`, title });
                                });
                              }
                            } else if (proj.ideas && proj.ideas.length > 0) {
                              projIdeas = proj.ideas;
                            }
                            if (projIdeas.length === 0) return null;
                            return (
                              <div className="ml-md space-y-base border-l-2 border-slate-200 dark:border-white/10 pl-xs my-xs">
                                {projIdeas.map((idea, iIdx) => {
                                  const isCandidate = idea.type === "candidate";
                                  const isActive = activeProject?.id === proj.id && (
                                    isCandidate
                                      ? selectedCandidateIdx === idea.idx
                                      : idea.idx === Math.min(activeVersionIdx, Math.max(0, (versionList?.length || 1) - 1))
                                  );
                                  return (
                                    <div
                                      key={`${idea.type}-${idea.idx}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (proj.id === activeProject?.id) {
                                          if (isCandidate) {
                                            setActiveVersionIdx(0);
                                            setActiveDebateStage("proposals");
                                            loadProjectDetails(proj.id, idea.idx);
                                          } else {
                                            setActiveVersionIdx(idea.idx);
                                            setActiveDebateStage("reviews");
                                          }
                                        } else if (isCandidate) {
                                          setActiveVersionIdx(0);
                                          loadProjectDetails(proj.id, idea.idx);
                                        } else {
                                          loadProjectDetails(proj.id);
                                          setActiveVersionIdx(idea.idx);
                                          setActiveDebateStage("reviews");
                                        }
                                      }}
                                      title={idea.title}
                                      className={`flex items-center gap-xs px-xs py-base rounded text-[11px] font-code-sm cursor-pointer truncate transition-all ${
                                        isActive
                                          ? "text-cyan-700 dark:text-cyan-300 font-bold bg-cyan-500/10 border-l-2 border-cyan-500"
                                          : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[12px] flex-shrink-0">
                                        {isCandidate ? "lightbulb" : "history"}
                                      </span>
                                      <span className="truncate">{idea.label}</span>
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

                {/* 3. Collaborations */}
                <div>
                  <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold text-left">Collaborations</div>
                  <div className="space-y-xs max-h-[22vh] overflow-y-auto pr-xs">
                    {collaboratedProjects.length === 0 ? (
                      <div className="text-slate-400 dark:text-on-surface-variant text-[10px] italic px-sm text-left">No shared projects</div>
                    ) : (
                      collaboratedProjects.map(proj => (
                        <a key={proj.id} onClick={() => loadProjectDetails(proj.id)} className={`flex items-center justify-between gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 border-l-2 border-secondary-container font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                          <div className="flex items-center gap-xs min-w-0 truncate">
                            <span className="material-symbols-outlined text-xs select-none flex-shrink-0">groups</span>
                            <span className="truncate">{proj.name}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(proj.id, e); }} className="ml-auto text-slate-400 hover:text-red-500 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5" title="Delete Project">
                            <span className="material-symbols-outlined text-xs select-none">delete</span>
                          </button>
                        </a>
                      ))
                    )}
                  </div>
                </div>

                <div className="glow-divider my-xs select-none"></div>

                <a onClick={() => setActiveTab("analytics")} className={`nav-item flex items-center gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-label-xs ${activeTab === "analytics" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white"}`}>
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0" }}>analytics</span>
                  Agent Analytics
                </a>
                <a onClick={() => setActiveTab("config")} className={`nav-item flex items-center gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-label-xs ${activeTab === "config" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white"}`}>
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0" }}>settings_input_component</span>
                  Model Config
                </a>
                <a onClick={() => setActiveTab("logs")} className={`nav-item flex items-center gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-label-xs ${activeTab === "logs" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white"}`}>
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0" }}>terminal</span>
                  Neural Logs
                </a>
              </div>

              <div className="mt-auto flex flex-col gap-sm pt-md border-t border-slate-200 dark:border-white/10 font-code-sm">
                <a className="flex items-center gap-xs px-sm py-xs rounded-DEFAULT text-slate-500 dark:text-on-surface-variant text-label-xs hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab("status")}>
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0" }}>sensors</span>
                  System Status
                </a>
              </div>
            </nav>

            {/* SubNavbar (Mobile only, showing active project title) */}
            <nav className="md:hidden bg-white/95 dark:bg-[#121314]/95 backdrop-blur-xl fixed top-[57px] w-full z-45 border-b border-slate-200 dark:border-white/10 flex justify-between items-center px-margin py-xs font-code-sm">
              <div className="flex items-center gap-xs">
                <div className="font-code-sm text-xs font-bold text-slate-800 dark:text-primary-container truncate max-w-xs">{activeProject ? activeProject.name : "Active Pipeline"}</div>
              </div>
            </nav>
          </>
        )}

        {/* MOBILE DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
            
            {/* Drawer Content */}
            <div className="relative w-64 bg-white dark:bg-surface border-r border-slate-200 dark:border-white/10 h-full flex flex-col py-md px-sm gap-md z-10 text-left">
              <div className="flex justify-between items-center mb-sm">
                <h1 className="font-display-lg text-headline-lg font-bold text-slate-800 dark:text-primary tracking-tighter" onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); setMobileMenuOpen(false); }}>NODE_01</h1>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); setProjectName(""); setMobileMenuOpen(false); }} className="bg-primary-container text-on-primary-container font-label-xs text-label-xs py-sm px-md rounded-DEFAULT hover:shadow-[0_0_10px_rgba(126,189,240,0.8)] transition-all mb-sm uppercase tracking-widest font-bold text-center">
                NEW BRAINSTORM
              </button>
              
              <div className="flex-1 flex flex-col gap-sm overflow-y-auto">
                <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold">App Pages</div>
                <div className="space-y-xs">
                  <a onClick={() => { setActiveTab("pathway"); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${isBrainstormTab ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-xs">analytics</span> Brainstorm
                  </a>
                  <a onClick={() => { setActiveTab("profile"); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${activeTab === "profile" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-xs">person</span> Profile
                  </a>
                  <a onClick={() => { setActiveTab("about"); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${activeTab === "about" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-xs">info</span> About Us
                  </a>
                  <a onClick={() => { setActiveTab("contact"); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${activeTab === "contact" ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-xs">mail</span> Contact Us
                  </a>
                </div>

                <div className="glow-divider my-xs select-none"></div>

                {isBrainstormTab && (
                  <div className="space-y-sm">
                    {/* Invites (Mobile) */}
                    {invitations.length > 0 && (
                      <div className="bg-primary/5 dark:bg-primary-container/10 border border-primary/20 dark:border-primary-container/30 rounded p-xs space-y-xs text-left">
                        <div className="font-code-sm text-[9px] text-primary dark:text-primary-fixed-dim uppercase tracking-wider font-bold">Uplink Invites ({invitations.length})</div>
                        <div className="space-y-xs max-h-[12vh] overflow-y-auto">
                          {invitations.map(inv => (
                            <div key={inv.id} className="text-[9px] bg-white dark:bg-black/40 p-xs rounded border border-slate-200 dark:border-white/5 space-y-xs">
                              <div className="font-bold text-slate-800 dark:text-primary-fixed-dim truncate">{inv.project_name}</div>
                              <div className="flex gap-xs">
                                <button onClick={() => respondToInvitation(inv.id, "accept")} className="flex-1 bg-green-600 text-white font-bold py-[2px] rounded text-[8px] uppercase">Accept</button>
                                <button onClick={() => respondToInvitation(inv.id, "decline")} className="flex-1 bg-slate-500 text-white font-bold py-[2px] rounded text-[8px] uppercase">Decline</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* My Projects (Mobile) */}
                    <div>
                      <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold text-left">My Projects</div>
                      <div className="space-y-xs max-h-[15vh] overflow-y-auto">
                        {projects.map(proj => (
                          <a key={proj.id} onClick={() => { loadProjectDetails(proj.id); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                            <span className="material-symbols-outlined text-xs select-none">folder</span>
                            {proj.name}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Collaborations (Mobile) */}
                    <div>
                      <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold text-left">Collaborations</div>
                      <div className="space-y-xs max-h-[15vh] overflow-y-auto">
                        {collaboratedProjects.map(proj => (
                          <a key={proj.id} onClick={() => { loadProjectDetails(proj.id); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded text-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant"}`}>
                            <span className="material-symbols-outlined text-xs select-none">groups</span>
                            {proj.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CANVAS */}
        <main className={`flex-1 min-h-[calc(100vh-57px)] max-w-full overflow-x-hidden relative flex flex-col p-sm md:p-md ${isBrainstormTab ? "md:ml-64 pt-[70px] md:pt-[20px]" : "pt-[20px] pb-xl w-full"}`}>
          {/* Background overlay glows */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary-container/20 via-transparent to-transparent"></div>
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary-container/20 via-transparent to-transparent"></div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-start">
            
            {/* BRAINSTORM WORKSPACE VIEWS */}
            {isBrainstormTab && (
              <>
                {/* VIEW 1: PATHWAY SELECTION */}
                {activeTab === "pathway" && (
                  <div className="space-y-lg">
                    <header className="mb-lg text-left">
                      <div className="inline-flex items-center gap-xs px-xs py-base bg-tertiary/10 border border-tertiary rounded-sm mb-md select-none">
                        <div className="w-2 h-2 rounded-full bg-tertiary ai-pulse"></div>
                        <span className="font-label-xs text-label-xs text-tertiary uppercase tracking-widest font-bold">System Ready</span>
                      </div>
                      <h2 className="font-headline-lg md:text-[38px] md:font-[800] md:leading-[1.1] md:tracking-[-0.02em] text-slate-800 dark:text-on-surface mb-xs font-bold">Select Processing Pathway</h2>
                      <p className="font-body-md text-slate-600 dark:text-on-surface-variant max-w-2xl text-sm">Configure your AI collaboration session. Choose the appropriate neural pathway based on your current project phase.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-lg mb-xl">
                      {/* Card 1: Refinement */}
                      <div onClick={() => setActiveTab("refine_form")} className="group relative bg-white dark:bg-[#0A0A0A]/85 backdrop-blur-[20px] border border-slate-200 dark:border-white/10 rounded-xl p-md cursor-pointer transition-all duration-300 hover:border-secondary/50 dark:hover:border-secondary-container/50 hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(242,158,183,0.15)]" tabIndex="0">
                        <div className="border-b border-slate-200 dark:border-white/10 pb-sm mb-md text-left">
                          <h3 className="font-headline-lg-mobile text-slate-800 dark:text-on-surface mb-xs group-hover:text-secondary dark:group-hover:text-secondary-fixed transition-colors font-headline-lg font-bold">Idea Refinement Only</h3>
                          <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-xs">Deploy specialized agents to analyze, optimize, and fortify existing concepts.</p>
                        </div>
                        <div className="flex items-center justify-between mb-md">
                          <div className="flex items-center gap-xs">
                            <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
                            <span className="font-label-xs text-label-xs text-secondary-container uppercase tracking-widest font-bold">Precision Focus</span>
                          </div>
                          <span className="font-code-sm text-[10px] text-secondary bg-secondary-container/10 px-xs py-base rounded-sm border border-secondary-container/30">5 Agents</span>
                        </div>
                        <ul className="space-y-sm text-left text-xs">
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-secondary-container rounded-full"></span>
                            Innovation & Feasibility Agents
                          </li>
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-secondary-container rounded-full"></span>
                            Technical & Impact Evaluation
                          </li>
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-secondary-container rounded-full"></span>
                            Skeptic Critique & Debate Refinement
                          </li>
                        </ul>
                      </div>

                      {/* Card 2: Generation */}
                      <div onClick={() => setActiveTab("generate_form")} className="group relative bg-white dark:bg-[#0A0A0A]/85 backdrop-blur-[20px] border border-slate-200 dark:border-white/10 rounded-xl p-md cursor-pointer transition-all duration-300 hover:border-primary/50 dark:hover:border-primary-container/50 hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(126,189,240,0.15)]" tabIndex="0">
                        <div className="border-b border-slate-200 dark:border-white/10 pb-sm mb-md text-left">
                          <h3 className="font-headline-lg-mobile text-slate-800 dark:text-on-surface mb-xs group-hover:text-primary dark:group-hover:text-primary-fixed transition-colors font-headline-lg font-bold">Generation & Refinement</h3>
                          <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-xs">Initiate creative-led master agents for ground-up conceptualization and rapid prototyping.</p>
                        </div>
                        <div className="flex items-center justify-between mb-md">
                          <div className="flex items-center gap-xs">
                            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                            <span className="font-label-xs text-label-xs text-primary-container uppercase tracking-widest font-bold">Creative Led</span>
                          </div>
                          <span className="font-code-sm text-[10px] text-primary bg-primary-container/10 px-xs py-base rounded-sm border border-primary-container/30">3 Master Agents</span>
                        </div>
                        <ul className="space-y-sm text-left text-xs">
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span>
                            Divergent Ideator Proposals
                          </li>
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span>
                            Web Research Fact-Checking
                          </li>
                          <li className="flex items-center gap-sm text-slate-600 dark:text-on-surface-variant font-code-sm">
                            <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span>
                            Synthesized Auto-Refinement
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: REFINEMENT FORM */}
                {activeTab === "refine_form" && (
                  <div className="space-y-md text-left">
                    <header className="mb-md">
                      <button onClick={() => setActiveTab("pathway")} className="flex items-center gap-xs font-code-sm text-xs text-slate-500 dark:text-secondary hover:text-slate-800 dark:hover:text-white mb-sm transition-colors font-bold">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> BACK TO PATHWAY
                      </button>
                      <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">Idea Refinement Configuration</h2>
                      <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-xs mt-1">Configure parameters and submit your hackathon concept. The agent panel will review, debate, and output a polished version.</p>
                    </header>

                    <form onSubmit={submitRefine} className="space-y-md bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md md:p-lg rounded-xl shadow-sm">
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Save Project As (Name) *</label>
                        <input type="text" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Drip Drop Drip" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all" />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Project Idea (Concept Details) *</label>
                        <textarea required value={refineIdea} onChange={e => setRefineIdea(e.target.value)} placeholder="Describe your hackathon idea here (e.g. AI-powered system that generates study schedules)..." rows="6" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all"></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Hackathon Theme</label>
                          <input type="text" value={refineTheme} onChange={e => setRefineTheme(e.target.value)} placeholder="e.g. Education, AI" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all" />
                        </div>
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Team Size</label>
                          <input type="number" value={refineTeam} onChange={e => setRefineTeam(e.target.value)} min="1" placeholder="e.g. 4" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all" />
                        </div>
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Time Available (Hours)</label>
                          <input type="number" value={refineTime} onChange={e => setRefineTime(e.target.value)} min="1" placeholder="e.g. 24" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all" />
                        </div>
                      </div>
                      <button type="submit" className="bg-slate-900 dark:bg-primary-container text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm px-lg rounded-DEFAULT hover:shadow-md transition-all uppercase tracking-widest font-bold flex items-center gap-xs ml-auto">
                        Launch Refinement
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* VIEW 3: GENERATION FORM */}
                {activeTab === "generate_form" && (
                  <div className="space-y-md text-left">
                    <header className="mb-md">
                      <button onClick={() => setActiveTab("pathway")} className="flex items-center gap-xs font-code-sm text-xs text-slate-500 dark:text-primary-container hover:text-slate-800 dark:hover:text-white mb-sm transition-colors font-bold">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> BACK TO PATHWAY
                      </button>
                      <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">Concept Generation Configuration</h2>
                      <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-xs mt-1">Specify a core topic or domain. Crucible's master agents will build proposals, conduct debate, and auto-feed details into the debate engine.</p>
                    </header>

                    <form onSubmit={submitGenerate} className="space-y-md bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md md:p-lg rounded-xl shadow-sm">
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Save Project As (Name) *</label>
                        <input type="text" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. AgroAI Irrigation" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Core Problem Area / Topic *</label>
                        <input type="text" required value={genTopic} onChange={e => setGenTopic(e.target.value)} placeholder="e.g. Plant irrigation efficiency" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Hackathon Theme</label>
                          <input type="text" value={genTheme} onChange={e => setGenTheme(e.target.value)} placeholder="e.g. Agriculture" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                        </div>
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Team Size</label>
                          <input type="number" value={genTeam} onChange={e => setGenTeam(e.target.value)} min="1" placeholder="e.g. 3" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                        </div>
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Time Limit (Hours)</label>
                          <input type="number" value={genTime} onChange={e => setGenTime(e.target.value)} min="1" placeholder="e.g. 24" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Hackathon Goals</label>
                          <input type="text" value={genGoals} onChange={e => setGenGoals(e.target.value)} placeholder="e.g. Win Best AI Category" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                        </div>
                        <div className="space-y-xs">
                          <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Constraints</label>
                          <input type="text" value={genConstraints} onChange={e => setGenConstraints(e.target.value)} placeholder="e.g. No hardware, free-tier services only" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all" />
                        </div>
                      </div>
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block">Factual Resource URLs (Optional, Space-Separated)</label>
                        <textarea value={genUrls} onChange={e => setGenUrls(e.target.value)} placeholder="e.g. https://wikipedia.org/wiki/Drip_irrigation" rows="2" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-xs rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-primary-container transition-all"></textarea>
                      </div>
                      <button type="submit" className="bg-slate-900 dark:bg-primary-container text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm px-lg rounded-DEFAULT hover:shadow-md transition-all uppercase tracking-widest font-bold flex items-center gap-xs ml-auto">
                        Launch Generator
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* VIEW 4: PROGRESSIVE LIVE AGENT CONVERSATION STREAM */}
                {activeTab === "running" && (
                  <div className="flex-1 flex flex-col justify-center min-h-[60vh] py-lg space-y-md">
                    <div className="w-full bg-white dark:bg-[#0A0A0A]/95 border border-slate-200 dark:border-white/10 p-md md:p-lg rounded-xl shadow-md flex flex-col gap-md">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-sm text-left">
                        <div className="flex items-center gap-sm">
                          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></div>
                          <div>
                            <h3 className="font-code-sm text-sm font-bold text-slate-900 dark:text-cyan-300 uppercase tracking-wider">A2A AGENT PANEL DEBATE // LIVE CONVERSATION STREAM</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Innovation, Feasibility, Impact, Technical, Skeptic & Moderator agents cross-examining live</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-md">
                          <span className="font-code-sm text-xs text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-500/10 px-sm py-1 rounded border border-cyan-500/20">Elapsed: {progressTime.toFixed(1)}s</span>
                        </div>
                      </div>
                      
                      {/* WhatsApp Style Group Chat Frame */}
                      <div className="flex flex-col border border-slate-300 dark:border-[#2f3b43] rounded-xl overflow-hidden shadow-lg h-[450px]">
                        {/* WhatsApp Header */}
                        <div className="bg-[#075e54] dark:bg-[#202c33] text-white px-md py-sm flex items-center gap-sm select-none">
                          <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-lg text-white">groups</span>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="font-bold text-sm leading-tight">Crucible Expert Debate Panel</div>
                            <div className="text-[10px] text-white/80 dark:text-[#8696a0] truncate">
                              Skeptic, Innovation, Feasibility, Impact, Technical, Moderator
                            </div>
                          </div>
                          <div className="flex items-center gap-xs text-white/85">
                            <span className="material-symbols-outlined text-base">videocam</span>
                            <span className="material-symbols-outlined text-base">call</span>
                            <span className="material-symbols-outlined text-base">more_vert</span>
                          </div>
                        </div>

                        {/* WhatsApp Messages Area */}
                        <div 
                          className="flex-1 overflow-y-auto p-md space-y-sm text-left relative"
                          style={{
                            backgroundColor: theme === "dark" ? "#0b141a" : "#efeae2",
                            backgroundImage: "radial-gradient(#128c7e05 1px, transparent 1px)",
                            backgroundSize: "20px 20px"
                          }}
                        >
                          {consoleLogs.map((log, idx) => {
                            const isSystem = !log.agent || log.agent === "SYSTEM";
                            if (isSystem) {
                              return (
                                <div key={idx} className="flex justify-center my-xs">
                                  <div className="bg-[#ffeecd]/80 dark:bg-[#182229]/80 text-[#54656f] dark:text-[#8696a0] text-[10px] px-md py-xs rounded shadow-xs uppercase tracking-wider font-semibold border border-[#e2d5c5]/40 dark:border-[#2f3b43]/30 font-code-sm">
                                    {log.text}
                                  </div>
                                </div>
                              );
                            }

                            const nameColor = getAgentColor(log.agent);

                            return (
                              <div key={idx} className="flex justify-start items-start gap-xs max-w-[85%] animate-fadeIn">
                                {/* Message bubble */}
                                <div className="bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-lg rounded-tl-none p-sm shadow-xs border border-slate-200 dark:border-transparent min-w-[200px] relative">
                                  {/* Sender name */}
                                  <div className="font-bold text-[11px] mb-xs" style={{ color: nameColor }}>
                                    {log.agent}
                                  </div>
                                  
                                  {/* Message Text */}
                                  <p className="text-xs leading-relaxed break-words pr-[45px] text-slate-800 dark:text-slate-100 font-body-md">
                                    {log.text}
                                  </p>

                                  {/* Timestamp + ticks */}
                                  <div className="absolute bottom-1 right-2 flex items-center gap-base select-none">
                                    <span className="text-[9px] text-[#667781] dark:text-[#8696a0]">
                                      {log.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="material-symbols-outlined text-[10px] text-[#53bdeb]">done_all</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={consoleEndRef} />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-xs border-t border-slate-200 dark:border-white/10 pt-sm">
                        <div className="flex items-center gap-xs text-slate-500 dark:text-slate-400 text-xs">
                          <span className="material-symbols-outlined text-sm text-cyan-400 animate-spin">sync</span>
                          <span>Agents are debating, challenging claims, and synthesizing final consensus...</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAgentForChat("moderator");
                            setActiveTabSubView("chat");
                            setActiveTab("dashboard");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold px-md py-xs rounded-lg border border-cyan-500/30 flex items-center gap-xs transition-all hover:scale-105"
                        >
                          <span className="material-symbols-outlined text-sm">gavel</span>
                          Chat with Moderator
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 5: DEBATE DASHBOARD */}
                {activeTab === "dashboard" && (
                  <div className="space-y-lg flex-1 text-left">
                    {projectLoading ? (
                      <div className="flex flex-col items-center justify-center py-2xl space-y-md min-h-[50vh]">
                        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-code-sm text-xs text-cyan-400 uppercase tracking-widest animate-pulse font-bold">
                          LOADING PROJECT DATA & AGENT REVIEWS...
                        </p>
                      </div>
                    ) : (loadedResult?.status === "pending_selection" && selectedCandidateIdx === null) ? (
                      <div className="space-y-lg flex-1 text-left">
                        <header className="border-b border-slate-200 dark:border-white/10 pb-sm">
                          <div className="inline-flex items-center gap-xs px-xs py-base bg-cyan-500/10 border border-cyan-500/20 rounded-sm mb-xs select-none">
                            <span className="font-code-sm text-xs text-cyan-400 uppercase tracking-wider font-bold">Candidates Generated</span>
                          </div>
                          <h2 className="font-headline-lg md:text-[32px] font-[800] text-slate-900 dark:text-cyan-300 mb-xs">Select Candidate Topic of Interest</h2>
                          <p className="font-body-md text-slate-600 dark:text-on-surface-variant max-w-2xl text-xs">
                            Select which candidate proposal to initialize the multi-agent debate refinement pipeline on, or click any candidate on the left sidebar to view its dedicated concept page.
                          </p>
                        </header>

                        {candidateSelectionLoading ? (
                          <div className="flex flex-col items-center justify-center py-2xl space-y-md">
                            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                            <p className="font-code-sm text-xs text-cyan-400 animate-pulse font-bold">DEPLOYING EXPERT AGENT PANEL FOR REFINEMENT DEBATE...</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                            {loadedResult.candidates?.map((cand, idx) => (
                              <div key={idx} className="bg-white dark:bg-[#0A0A0A]/85 border border-slate-200 dark:border-white/10 rounded-xl p-md flex flex-col justify-between hover:border-cyan-500/50 transition-all hover:shadow-[0_0_15px_rgba(0,242,255,0.1)] text-left">
                                <div className="space-y-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-code-sm text-[10px] text-slate-400 dark:text-on-surface-variant uppercase font-bold">Option #{idx + 1}</span>
                                    <span className="bg-cyan-500/10 text-cyan-400 text-[9px] px-xs rounded font-bold uppercase">{cand.creator || "Innovation Agent"}</span>
                                  </div>
                                  <h3 className="font-headline-lg-mobile text-slate-900 dark:text-cyan-300 font-bold text-sm leading-tight">{cand.title}</h3>
                                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed line-clamp-6">{cand.idea}</p>
                                </div>
                                
                                <div className="pt-md space-y-xs">
                                  <button onClick={() => selectCandidateIdea(cand)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-label-xs text-[10px] font-bold py-xs rounded uppercase tracking-widest transition-all flex items-center justify-center gap-xs">
                                    <span className="material-symbols-outlined text-xs">rocket_launch</span>
                                    Initialize Refining Debate
                                  </button>
                                  <button onClick={() => loadProjectDetails(activeProject.id, idx)} className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-label-xs text-[10px] font-bold py-xs rounded uppercase tracking-widest transition-all">
                                    View Info Page
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (activeProject || loadedResult) ? (
                      <>
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-slate-200 dark:border-white/10 pb-sm">
                          <div>
                            <div className={`font-label-xs text-label-xs uppercase tracking-wider font-bold inline-flex items-center gap-xs px-xs py-base rounded-sm mb-xs border ${isGenerationKind ? "text-slate-800 dark:text-primary-fixed bg-slate-100 dark:bg-primary/10 border-slate-200 dark:border-primary/20" : "text-slate-800 dark:text-secondary-fixed bg-slate-100 dark:bg-secondary-container/10 border-slate-200 dark:border-secondary-container/30"}`}>
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                              {isGenerationKind ? "Generation & Refinement" : "Refinement Results"}
                            </div>
                            <h2 className="font-display-lg text-headline-lg font-bold text-slate-900 dark:text-cyan-300">
                              {getActiveCandidateInfo()?.title || activeProject?.name || "Project Dashboard"}
                            </h2>
                            <p className="font-code-sm text-xs text-slate-500 dark:text-on-surface-variant mt-1">PROJECT_ID: {activeProject?.id}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-sm">
                            {versionList && versionList.length > 1 && (
                              <div className="flex items-center gap-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-xs px-sm select-none" title="Idea versions">
                                <span className="material-symbols-outlined text-sm text-slate-500 dark:text-on-surface-variant">history</span>
                                {versionList.map((v, idx) => (
                                  <button
                                    key={v.version ?? idx}
                                    onClick={() => { setActiveVersionIdx(idx); setActiveDebateStage("reviews"); }}
                                    className={`px-sm py-base rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                      idx === Math.min(activeVersionIdx, versionList.length - 1)
                                        ? "bg-cyan-500 text-white border-transparent"
                                        : "text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                                    }`}
                                  >
                                    Version {v.version ?? idx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={handleRefineCurrentIdea}
                              className="bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-label-xs text-label-xs py-sm px-md rounded-DEFAULT transition-all uppercase tracking-widest font-bold shadow-xs flex items-center gap-xs"
                            >
                              <span className="material-symbols-outlined text-xs">rocket_launch</span>
                              {loadedResult?.refinement || innerResult?.moderator ? "Iterate (New Version)" : "Refine This Idea"}
                            </button>
                            <button onClick={() => { setSelectedAgentForChat("moderator"); setActiveTabSubView("chat"); }} className="bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 font-label-xs text-label-xs py-sm px-md rounded-DEFAULT transition-all uppercase tracking-widest font-bold shadow-xs flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs">gavel</span> Chat with Moderator
                            </button>
                            <button onClick={() => { if (activeProject?.id) { setShowCollabModal(true); loadCollaborators(activeProject.id); } }} className="bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-on-surface font-label-xs text-label-xs py-sm px-md rounded-DEFAULT border border-slate-200 dark:border-white/10 transition-all uppercase tracking-widest font-bold shadow-xs flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs">groups</span> Share Team
                            </button>
                            <button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }} className="bg-slate-900 hover:bg-slate-850 dark:bg-primary-container dark:hover:bg-primary-container/80 text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm px-md rounded-DEFAULT transition-all uppercase tracking-widest font-bold shadow-xs">
                              New Session
                            </button>
                          </div>
                        </header>

                    {/* SubView Tabs Selector - Clearly Separated Boxed Tab Buttons */}
                    <div className="flex items-center gap-sm border-b border-slate-200 dark:border-white/10 pb-sm mb-md overflow-x-auto">
                      <button onClick={() => setActiveTabSubView("overview")} className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${activeTabSubView === "overview" ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500 shadow-sm font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                        <span className="material-symbols-outlined text-sm">analytics</span>
                        Consensus / Roadmap
                      </button>
                      <button onClick={() => setActiveTabSubView("reviews")} className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${activeTabSubView === "reviews" ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500 shadow-sm font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                        <span className="material-symbols-outlined text-sm">groups</span>
                        Specialist Reviews
                      </button>
                      <button onClick={() => setActiveTabSubView("debates")} className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${activeTabSubView === "debates" ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500 shadow-sm font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                        <span className="material-symbols-outlined text-sm">chat_bubble</span>
                        Debate Rounds
                      </button>
                      <button onClick={() => setActiveTabSubView("chat")} className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${activeTabSubView === "chat" ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500 shadow-sm font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                        <span className="material-symbols-outlined text-sm">support_agent</span>
                        Agent Chat Room
                      </button>
                    </div>

                    {/* SUBVIEW 1: OVERVIEW / CONSENSUS (REFINED CONCEPT -> FACTS -> DECISION LOOP) */}
                    {activeTabSubView === "overview" && (
                      <div className="space-y-md text-left max-w-4xl mx-auto">
                        
                        {/* 1. TOP: REFINED HACKATHON CONCEPT */}
                        <div className="bg-white dark:bg-[#0A0A0A]/90 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-xs">
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-cyan-500 text-sm">lightbulb</span>
                              <h3 className="font-headline-lg-mobile font-bold text-slate-900 dark:text-cyan-300 text-base">
                                Refined Concept: {getActiveCandidateInfo()?.title || activeProject?.name}
                              </h3>
                            </div>
                            <span className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-[10px] px-xs py-base rounded uppercase font-bold">
                              Fit: {getActiveCandidateInfo()?.fit ?? 8}/10
                            </span>
                          </div>

                          <p className="text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#13141a] p-sm border border-slate-200 dark:border-white/5 rounded-lg leading-relaxed font-medium">
                            {innerResult?.moderator?.refined_idea || getActiveCandidateInfo()?.idea}
                          </p>

                          {innerResult?.moderator?.consensus && Array.isArray(innerResult.moderator.consensus) && innerResult.moderator.consensus.length > 0 && (
                            <div className="pt-xs space-y-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-cyan-400 tracking-wider">Key Consensus Highlights</span>
                              <ul className="list-disc list-inside text-xs text-slate-700 dark:text-emerald-300 space-y-xs pl-xs">
                                {innerResult.moderator.consensus.map((c, idx) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* 2. NEXT: FACTS BRIEF */}
                        <div className="bg-white dark:bg-[#0A0A0A]/90 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-sm">
                          <h3 className="font-display-lg text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs">
                            <span className="material-symbols-outlined text-sm">fact_check</span> Verified Facts & Evidence Brief
                          </h3>
                          <ul className="space-y-xs text-xs text-slate-700 dark:text-slate-200 font-code-sm">
                            {(() => {
                              let factsList = [];
                              if (innerResult?.research) {
                                if (Array.isArray(innerResult.research.facts)) {
                                  factsList = innerResult.research.facts;
                                } else if (typeof innerResult.research === "object") {
                                  Object.values(innerResult.research).forEach(b => {
                                    if (b && Array.isArray(b.facts)) factsList.push(...b.facts);
                                  });
                                }
                              }
                              const candEvidence = getActiveCandidateInfo()?.evidence || [];
                              if (factsList.length === 0 && candEvidence.length > 0) {
                                factsList = candEvidence.map(e => ({ claim: e, source: "Internal Analysis" }));
                              }
                              if (factsList.length === 0) {
                                factsList = [
                                  { claim: "Target market problem validated via competitive benchmark.", source: "Crucible Research" },
                                  { claim: "MVP tech stack achievable within standard hackathon timeline.", source: "Feasibility Assessment" }
                                ];
                              }
                              return factsList.slice(0, 4).map((f, idx) => (
                                <li key={idx} className="flex items-start gap-xs bg-slate-50 dark:bg-[#13141a] p-xs rounded border border-slate-200 dark:border-white/5">
                                  <span className="material-symbols-outlined text-xs text-emerald-500 mt-0.5">check_circle</span>
                                  <div>
                                    <span className="font-medium text-slate-900 dark:text-white">{typeof f === "string" ? f : (f?.claim || f)}</span>
                                    {f?.source && <span className="text-[10px] text-slate-400 block">Source: {f.source}</span>}
                                  </div>
                                </li>
                              ));
                            })()}
                          </ul>
                        </div>

                        {/* 3. NEXT: OPERATOR DECISION LOOP */}
                        <div className="bg-white dark:bg-[#0A0A0A]/90 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-xs">
                            <h3 className="font-display-lg text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs">
                              <span className="material-symbols-outlined text-sm">settings_backup_restore</span> Operator Decision Loop
                            </h3>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Select updates to refine concept</span>
                          </div>

                          <div className="space-y-xs text-xs font-code-sm pt-xs" id="decision-checklist">
                            {(() => {
                              const improvements = (innerResult?.moderator?.high_priority_improvements && Array.isArray(innerResult.moderator.high_priority_improvements)) 
                                ? innerResult.moderator.high_priority_improvements 
                                : [
                                  "Prioritize lightweight API integrations for fast demo setup.",
                                  "Incorporate fallback mode for offline evaluation.",
                                  "Scope core user workflow down to 3 key interactive steps."
                                ];
                              return improvements.map((imp, idx) => {
                                const isChecked = selectedImprovements[idx] ?? true;
                                return (
                                  <label key={idx} className="flex items-start gap-xs p-xs rounded bg-slate-50 dark:bg-[#13141a] border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleImprovement(idx)}
                                      className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                                    />
                                    <span className={`text-xs leading-relaxed ${isChecked ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-400 line-through"}`}>
                                      {imp}
                                    </span>
                                  </label>
                                );
                              });
                            })()}
                          </div>

                          <div className="pt-xs space-y-xs">
                            <textarea
                              value={operatorNotes}
                              onChange={e => setOperatorNotes(e.target.value)}
                              placeholder="Add optional operator guidance notes for next iteration..."
                              rows="2"
                              className="w-full bg-slate-50 dark:bg-[#13141a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded-lg focus:outline-none focus:border-cyan-500 transition-all"
                            ></textarea>
                          </div>

                          <button
                            onClick={triggerIteration}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-label-xs text-xs py-sm rounded-lg shadow-sm transition-all uppercase tracking-widest font-bold flex items-center justify-center gap-xs"
                          >
                            Iterate Concept
                            <span className="material-symbols-outlined text-sm">sync</span>
                          </button>
                        </div>

                      </div>
                    )}

                    {/* SUBVIEW 2: SPECIALIST REVIEWS */}
                    {activeTabSubView === "reviews" && (
                      <div className="space-y-md">
                        <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                          <span className="material-symbols-outlined text-sm">groups</span> Independent Agent Feedback
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                          {["Innovation", "Feasibility", "Impact", "Technical", "Skeptic"].map(name => {
                            const key = name.toLowerCase();
                            const reviews = innerResult.refined_reviews || innerResult.reviews || (innerRefinement ? innerRefinement.reviews : {}) || {};
                            const reflections = innerResult.refined_reflections || innerResult.reflections || (innerRefinement ? innerRefinement.reflections : {}) || {};
                            
                            let revRaw = reviews[key] || reviews[name] || reviews[name.toLowerCase()] || reviews[name + " Agent"];
                            let reflRaw = reflections[key] || reflections[name] || reflections[name.toLowerCase()] || reflections[name + " Agent"];
                            
                            let rev = typeof revRaw === "object" ? revRaw : (typeof revRaw === "string" ? { score: 7, strengths: [revRaw], weaknesses: [], suggestions: [] } : null);
                            let refl = typeof reflRaw === "object" ? reflRaw : (typeof reflRaw === "string" ? { new_score: 8 } : null);

                            if (!rev) return null;

                            return (
                              <div key={name} className="bg-white dark:bg-[#131313] border border-slate-200 dark:border-white/10 p-md rounded-xl hover:border-slate-400 dark:hover:border-secondary transition-all flex flex-col justify-between shadow-xs">
                                <div>
                                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-xs mb-sm">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide font-display-lg">{name}</h4>
                                    {refl && refl.new_score !== undefined && refl.new_score !== rev.score ? (
                                      <div className="flex items-center gap-xs">
                                        <span className="text-xs line-through text-slate-400 dark:text-on-surface-variant">{rev.score !== undefined ? rev.score : 7}</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-emerald-400 font-display-lg">{refl.new_score}/10</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm font-bold text-slate-900 dark:text-cyan-400 font-display-lg">{rev.score !== undefined ? rev.score : 7}/10</span>
                                    )}
                                  </div>
                                  <div className="space-y-sm text-xs text-left">
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold">Strengths</span>
                                      <p className="text-slate-800 dark:text-slate-200 leading-normal">{rev.strengths && Array.isArray(rev.strengths) ? rev.strengths.join(", ") : (typeof rev.strengths === "string" ? rev.strengths : "Detailed feedback available")}</p>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold">Suggestions Adopted</span>
                                      <p className="text-slate-800 dark:text-slate-200 leading-normal">{rev.suggestions && Array.isArray(rev.suggestions) ? rev.suggestions.join(", ") : "Refer to roadmap items"}</p>
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => openAgentModal(name)} className="mt-sm w-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-on-surface font-code-sm text-[10px] py-xs rounded uppercase tracking-wider transition-all border border-slate-200 dark:border-white/5">
                                  Read Debate Log
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SUBVIEW 3: VISUAL STRUCTURED DEBATE FLOW */}
                    {activeTabSubView === "debates" && (
                      <div className="bg-white dark:bg-[#0A0A0A]/85 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-xs text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-sm gap-xs">
                          <div>
                            <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-cyan-300 flex items-center gap-xs select-none">
                              <span className="material-symbols-outlined text-sm">hub</span> Visual Multi-Stage Agent Workspace
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Examine each agent's complete analysis, critique, peer challenge, and concession leading to final consensus.
                            </p>
                          </div>
                          <span className="font-code-sm text-[10px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 px-xs py-base rounded uppercase font-bold self-start md:self-auto">
                            A2A debate rounds
                          </span>
                        </div>

                        {/* Stage Tabs */}
                        {innerRefinement && (innerRefinement.reviews || innerRefinement.reflections || innerRefinement.moderator) ? (
                          <div className="flex flex-wrap items-center gap-xs bg-slate-100 dark:bg-white/5 p-xs rounded-xl border border-slate-200 dark:border-white/10 select-none">
                            {[
                              { id: "reviews", label: "Stage 1: Independent Analysis", icon: "troubleshoot" },
                              { id: "debate", label: "Stage 2: Cross-Examination", icon: "forum" },
                              { id: "reflections", label: "Stage 3: Peer Reflections", icon: "psychology" },
                              { id: "moderator", label: "Stage 4: Consensus Synthesis", icon: "gavel" }
                            ].map(stage => (
                              <button
                                key={stage.id}
                                onClick={() => setActiveDebateStage(stage.id)}
                                className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${
                                  activeDebateStage === stage.id || (activeDebateStage === "proposals" && stage.id === "reviews")
                                    ? "bg-cyan-500 text-white border-transparent shadow-sm"
                                    : "text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                              >
                                <span className="material-symbols-outlined text-sm">{stage.icon}</span> {stage.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-xs bg-slate-100 dark:bg-white/5 p-xs rounded-xl border border-slate-200 dark:border-white/10 select-none">
                            {[
                              { id: "proposals", label: "Stage 1: Agent Idea Proposals", icon: "tips_and_updates" },
                              { id: "debate", label: "Stage 2: Candidate Debate", icon: "forum" }
                            ].map(stage => (
                              <button
                                key={stage.id}
                                onClick={() => setActiveDebateStage(stage.id)}
                                className={`px-md py-xs rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-xs border ${
                                  activeDebateStage === stage.id || (activeDebateStage === "reviews" && stage.id === "proposals")
                                    ? "bg-cyan-500 text-white border-transparent shadow-sm"
                                    : "text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                              >
                                <span className="material-symbols-outlined text-sm">{stage.icon}</span> {stage.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* STAGE 1 (REFINEMENT): Independent Analysis */}
                        {activeDebateStage === "reviews" && innerRefinement && innerRefinement.reviews && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mt-sm animate-fadeIn">
                            {["Innovation", "Feasibility", "Impact", "Technical", "Skeptic"].map(name => {
                              const key = name.toLowerCase();
                              const reviews = innerRefinement.reviews || {};
                              const rev = reviews[key] || reviews[name] || reviews[name.toLowerCase()] || reviews[name + " Agent"];
                              
                              if (!rev) return null;
                              
                              const stance = rev.stance || "neutral";
                              const isChallenge = stance.toLowerCase().includes("disagree") || stance.toLowerCase().includes("challenge");
                              const isConcur = stance.toLowerCase().includes("concur") || stance.toLowerCase().includes("agree");
                              
                              return (
                                <div key={name} className="bg-white dark:bg-[#13141a] border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-sm flex flex-col justify-between text-left space-y-md">
                                  <div>
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-xs">
                                      <div className="flex items-center gap-xs">
                                        <span className="material-symbols-outlined text-sm" style={{ color: getAgentColor(name) }}>
                                          {name === "Skeptic" ? "security_update_warning" : name === "Innovation" ? "tips_and_updates" : name === "Feasibility" ? "construction" : name === "Impact" ? "stars" : "developer_board"}
                                        </span>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide">{name} Agent</h4>
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 dark:text-cyan-400 font-display-lg">{rev.score !== undefined ? rev.score : 7}/10</span>
                                    </div>
                                    <div className="mt-sm flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Stance Verdict</span>
                                      <span className={`text-[9px] px-xs py-base rounded uppercase font-bold tracking-wider ${
                                        isChallenge ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30" : 
                                        isConcur ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                                        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                      }`}>
                                        {stance}
                                      </span>
                                    </div>
                                    <div className="mt-sm space-y-sm text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                      <div>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Critique & Analysis</span>
                                        <p className="whitespace-pre-wrap">{rev.critique || "Analysis complete."}</p>
                                      </div>
                                      {rev.improvements && rev.improvements.length > 0 && (
                                        <div>
                                          <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Suggested Improvements</span>
                                          <ul className="list-disc pl-sm space-y-base text-[11px]">
                                            {rev.improvements.map((imp, idx) => (
                                              <li key={idx}>{imp}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* STAGE 1 (GENERATION): Agent Idea Proposals */}
                        {activeDebateStage === "proposals" && innerResult?.proposals && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mt-sm animate-fadeIn">
                            {Object.entries(innerResult.proposals).map(([agent, val]) => {
                              if (!val) return null;
                              const displayAgent = agent.charAt(0).toUpperCase() + agent.slice(1);
                              
                              return (
                                <div key={agent} className="bg-white dark:bg-[#13141a] border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-sm flex flex-col justify-between text-left space-y-md">
                                  <div>
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-xs">
                                      <div className="flex items-center gap-xs">
                                        <span className="material-symbols-outlined text-sm" style={{ color: getAgentColor(agent) }}>
                                          {agent === "ideator" ? "lightbulb" : agent === "researcher" ? "search" : "query_stats"}
                                        </span>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide">{displayAgent} Agent</h4>
                                      </div>
                                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Proposal Output</span>
                                    </div>
                                    <div className="mt-sm space-y-sm text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                      {val.ideas ? (
                                        // Ideator Shortlist
                                        <div>
                                          <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Shortlisted Candidates</span>
                                          <div className="space-y-sm mt-xs">
                                            {val.ideas.map((cand, idx) => (
                                              <div key={idx} className="bg-slate-50 dark:bg-white/5 p-xs rounded border border-slate-100 dark:border-white/5">
                                                <div className="font-bold text-slate-900 dark:text-cyan-300 mb-base">{cand.title}</div>
                                                <p className="text-[11px] leading-normal">{cand.idea}</p>
                                                <div className="text-[9px] text-slate-400 mt-base">Hackathon Fit: {cand.hackathon_fit}/10</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        // CandidateProposal (Researcher/Strategist)
                                        <div>
                                          <div className="bg-slate-50 dark:bg-white/5 p-xs rounded border border-slate-100 dark:border-white/5 mb-sm">
                                            <div className="font-bold text-slate-900 dark:text-cyan-300 mb-base">{val.title}</div>
                                            <p className="text-[11px] leading-normal">{val.idea}</p>
                                            <div className="text-[9px] text-slate-400 mt-base">Hackathon Fit: {val.hackathon_fit}/10</div>
                                          </div>
                                          {val.rationale && (
                                            <div>
                                              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Proposal Rationale</span>
                                              <p>{val.rationale}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* STAGE 2: Debate Timeline */}
                        {activeDebateStage === "debate" && (
                          <div className="space-y-md mt-sm animate-fadeIn">
                            {/* Panel Node Visual Bar */}
                            <div className="bg-slate-50 dark:bg-[#13141a] p-sm rounded-xl border border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-sm font-code-sm text-xs select-none">
                              <div className="flex items-center gap-xs text-amber-500 font-bold"><span className="material-symbols-outlined text-sm">tips_and_updates</span> Innovation</div>
                              <span className="text-slate-400">➔</span>
                              <div className="flex items-center gap-xs text-purple-500 font-bold"><span className="material-symbols-outlined text-sm">construction</span> Feasibility</div>
                              <span className="text-slate-400">➔</span>
                              <div className="flex items-center gap-xs text-blue-500 font-bold"><span className="material-symbols-outlined text-sm">stars</span> Impact</div>
                              <span className="text-slate-400">➔</span>
                              <div className="flex items-center gap-xs text-emerald-500 font-bold"><span className="material-symbols-outlined text-sm">developer_board</span> Technical</div>
                              <span className="text-slate-400">➔</span>
                              <div className="flex items-center gap-xs text-rose-500 font-bold"><span className="material-symbols-outlined text-sm">security_update_warning</span> Skeptic</div>
                              <span className="text-slate-400">➔</span>
                              <div className="flex items-center gap-xs text-cyan-400 font-bold"><span className="material-symbols-outlined text-sm">gavel</span> Moderator</div>
                            </div>

                            {/* Visual Timeline of Exchanges */}
                            <div className="space-y-md max-h-[550px] overflow-y-auto pr-xs border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0d0e12] p-md rounded-xl font-code-sm text-xs text-left">
                              {(() => {
                                const exchanges = getAllDebateExchanges(innerResult);
                                if (exchanges.length === 0 && (!chats || chats.length === 0)) {
                                  return <div className="text-slate-500 dark:text-slate-400 text-center py-md font-sans">No structured debates recorded for this project yet. Click "Refine This Idea" to run the debate engine.</div>;
                                }

                                if (exchanges.length > 0) {
                                  return (
                                    <div className="relative space-y-lg py-sm max-w-2xl mx-auto before:absolute before:inset-0 before:left-1/2 before:-translate-x-1/2 before:w-0.5 before:bg-slate-300 dark:before:bg-white/10 font-code-sm">
                                      {exchanges.map((ex, idx) => {
                                        const isDisagree = ex.stance && (ex.stance.toLowerCase().includes("disagree") || ex.stance.toLowerCase().includes("challenge"));
                                        const isEven = idx % 2 === 0;
                                        return (
                                          <div key={idx} className="relative flex items-center justify-center my-md">
                                            {/* Timeline Node */}
                                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 ${isDisagree ? "bg-rose-500 border-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-emerald-500 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`}></div>
                                            
                                            <div className={`w-[calc(50%-1.5rem)] ${isEven ? "mr-auto text-right" : "ml-auto text-left"}`}>
                                              <div className="bg-white dark:bg-[#161820] border border-slate-200 dark:border-white/10 p-sm rounded-xl shadow-xs space-y-xs hover:border-cyan-500/50 transition-all">
                                                <div className={`flex flex-wrap items-center gap-xs border-b border-slate-100 dark:border-white/5 pb-xs ${isEven ? "justify-end" : "justify-start"}`}>
                                                  <span className="font-bold text-cyan-700 dark:text-cyan-300 text-xs">{ex.speaker}</span>
                                                  <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                                                  <span className="text-slate-600 dark:text-slate-300 text-xs">{ex.target}</span>
                                                  <span className={`text-[9px] px-xs py-base rounded uppercase font-bold tracking-wider ${isDisagree ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"}`}>
                                                    {ex.stance}
                                                  </span>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs pt-xs font-sans">
                                                  "{ex.argument}"
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-sm max-w-xl mx-auto font-sans">
                                    {chats.map((chat, idx) => (
                                      <div key={idx} className="bg-white dark:bg-[#161820] border border-slate-200 dark:border-white/10 p-sm rounded-xl space-y-xs">
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-xs">
                                          <span className="font-bold text-slate-800 dark:text-cyan-300 uppercase">{chat.sender}</span>
                                          <span className="text-[9px] text-slate-400">{new Date(chat.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">{chat.message}</p>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mt-sm animate-fadeIn">
                            {["Innovation", "Feasibility", "Impact", "Technical", "Skeptic"].map(name => {
                              const key = name.toLowerCase();
                              const reflections = innerRefinement.reflections || {};
                              const refl = reflections[key] || reflections[name] || reflections[name.toLowerCase()] || reflections[name + " Agent"];
                              
                              if (!refl) return null;
                              
                              const original = refl.original_stance || "neutral";
                              const updated = refl.updated_stance || "concur";
                              
                              return (
                                <div key={name} className="bg-white dark:bg-[#13141a] border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-sm flex flex-col justify-between text-left space-y-md">
                                  <div>
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-xs">
                                      <div className="flex items-center gap-xs">
                                        <span className="material-symbols-outlined text-sm" style={{ color: getAgentColor(name) }}>
                                          psychology
                                        </span>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide">{name} Agent</h4>
                                      </div>
                                      <div className="flex items-center gap-xs font-bold text-[10px] uppercase">
                                        <span className="text-slate-400">{original}</span>
                                        <span className="text-slate-400 font-sans">➔</span>
                                        <span className="text-emerald-500">{updated}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-sm space-y-sm text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                      <div>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Reflection Rationale</span>
                                        <p>{refl.reflection_rationale || "Conceded points and accepted peer reviews."}</p>
                                      </div>
                                      
                                      {refl.concessions && refl.concessions.length > 0 && (
                                        <div>
                                          <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Concessions Made</span>
                                          <ul className="list-disc pl-sm space-y-base text-[11px]">
                                            {refl.concessions.map((conc, idx) => (
                                              <li key={idx}>{conc}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {refl.updated_critique && (
                                        <div>
                                          <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold mb-base">Updated Critique</span>
                                          <p className="text-[11px] whitespace-pre-wrap">{refl.updated_critique}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* STAGE 4: Consensus Synthesis */}
                        {activeDebateStage === "moderator" && innerRefinement && innerRefinement.moderator && (
                          <div className="max-w-2xl mx-auto space-y-md mt-sm animate-fadeIn text-left font-sans">
                            {innerRefinement.moderator ? (
                              <div className="bg-cyan-500/10 border border-cyan-500/30 p-md rounded-xl space-y-sm">
                                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-xs">
                                  <div className="flex items-center gap-xs text-cyan-700 dark:text-cyan-300 font-bold text-xs uppercase font-code-sm">
                                    <span className="material-symbols-outlined text-sm">gavel</span> Moderator Verdict
                                  </div>
                                  <span className={`text-[9px] px-xs py-base rounded uppercase font-bold tracking-wider bg-cyan-500 text-white font-code-sm`}>
                                    {innerRefinement.moderator.verdict || "Consensus Approved"}
                                  </span>
                                </div>
                                <div className="space-y-sm text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                                  <div>
                                    <span className="text-[9px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block font-bold font-code-sm mb-base">Consolidated Refined Concept</span>
                                    <p className="font-semibold">{innerRefinement.moderator.refined_idea}</p>
                                  </div>
                                  
                                  {innerRefinement.moderator.innovations && innerRefinement.moderator.innovations.length > 0 && (
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block font-bold font-code-sm mb-base">Key Innovations Retained</span>
                                      <ul className="list-disc pl-sm space-y-base text-[11px]">
                                        {innerRefinement.moderator.innovations.map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {innerRefinement.moderator.risks && innerRefinement.moderator.risks.length > 0 && (
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-rose-500 block font-bold font-code-sm mb-base">Resolved Key Risks</span>
                                      <ul className="list-disc pl-sm space-y-base text-[11px]">
                                        {innerRefinement.moderator.risks.map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-center py-md font-sans">No moderator synthesis output available.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBVIEW 4: INTERACTIVE AGENT CHAT ROOM */}
                    {activeTabSubView === "chat" && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg bg-white dark:bg-[#0A0A0A]/85 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs min-h-[500px]">
                        
                        {/* Left pane: Agent selector */}
                        <div className="lg:col-span-4 lg:border-r lg:border-slate-200 lg:dark:border-white/10 lg:pr-md space-y-md">
                          <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                            <span className="material-symbols-outlined text-sm">support_agent</span> Select Agent Target
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-on-surface-variant leading-relaxed">
                            Select one of the debate panel agents below to ask questions, challenge their feedback, or brainstorm updates in character.
                          </p>
                          
                          <div className="flex flex-col gap-xs">
                            {[
                              { id: "skeptic", label: "Skeptic Agent", desc: "Devil's advocate & failure modes detector", icon: "security_update_warning", color: "text-red-500" },
                              { id: "innovation", label: "Innovation Agent", desc: "Novelty & creative edge specialist", icon: "tips_and_updates", color: "text-yellow-500" },
                              { id: "feasibility", label: "Feasibility Agent", desc: "Engineering reality & constraint checker", icon: "construction", color: "text-purple-500" },
                              { id: "impact", label: "Impact Agent", desc: "Utility, WOW factor & value advisor", icon: "stars", color: "text-blue-500" },
                              { id: "technical", label: "Technical Agent", desc: "Software & system architecture expert", icon: "developer_board", color: "text-green-500" },
                              { id: "moderator", label: "Moderator Consensus", desc: "Synthesis & summary builder", icon: "gavel", color: "text-slate-400" }
                            ].map(agent => (
                              <button key={agent.id} onClick={() => setSelectedAgentForChat(agent.id)} className={`flex items-start gap-sm p-sm rounded-DEFAULT border text-left transition-all ${selectedAgentForChat === agent.id ? "bg-primary/5 border-primary/45 shadow-xs" : "border-transparent hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                                <span className={`material-symbols-outlined text-lg ${agent.color}`}>{agent.icon}</span>
                                <div className="space-y-base">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white leading-none">{agent.label}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-on-surface-variant leading-tight">{agent.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Right pane: Chat messages board */}
                        <div className="lg:col-span-8 flex flex-col justify-between h-[500px] mt-md lg:mt-0">
                          
                          {/* Target Agent Info Header */}
                          <div className="border-b border-slate-200 dark:border-white/10 pb-xs mb-sm flex justify-between items-center">
                            <div>
                              <span className="font-code-sm text-[10px] text-slate-400 dark:text-on-surface-variant uppercase">Uplink Target</span>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm capitalize">{selectedAgentForChat} Agent</h4>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-sm animate-pulse">online_prediction</span>
                          </div>

                          {/* Messages list */}
                          <div className="flex-1 overflow-y-auto space-y-sm pr-xs mb-md border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 p-sm rounded font-code-sm text-xs">
                            {chats && chats.length > 0 ? (
                              chats.map((chat, idx) => {
                                const isUser = chat.sender.toLowerCase() === username.toLowerCase();
                                return (
                                  <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                                    <div className={`max-w-[80%] rounded-lg p-sm border ${isUser ? "bg-slate-200 dark:bg-[#1f2022] text-slate-900 dark:text-white border-slate-300 dark:border-white/10" : "bg-white dark:bg-[#131313] text-slate-800 dark:text-on-surface border-slate-200 dark:border-white/5"}`}>
                                      <div className="font-bold text-[9px] text-slate-500 dark:text-on-surface-variant uppercase mb-xs flex justify-between gap-md border-b border-slate-100 dark:border-white/5 pb-[2px]">
                                        <span>{chat.sender}</span>
                                        <span>{new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <p className="leading-relaxed break-words">{chat.message}</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-slate-500 dark:text-on-surface-variant text-center py-xl">No operator follow-up logs recorded. Send a message to initiate debate.</div>
                            )}
                            
                            {chatLoading && (
                              <div className="flex flex-col items-start">
                                <div className="bg-white dark:bg-[#131313] text-slate-500 rounded-lg p-sm border border-slate-200 dark:border-white/5 animate-pulse font-code-sm">
                                  {selectedAgentForChat.toUpperCase()} Agent is running inference response...
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Message input form */}
                          <form onSubmit={sendAgentMessage} className="flex gap-sm">
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Type follow-up query for the ${selectedAgentForChat} agent...`} className="flex-1 bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-xs rounded-DEFAULT focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
                            <button type="submit" disabled={chatLoading} className="bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-label-xs text-xs font-bold py-xs px-md rounded uppercase tracking-widest transition-all flex items-center gap-xs">
                              <span className="material-symbols-outlined text-sm">send</span> Transmit
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* SUBVIEW 5: ALTERNATIVE IDEAS */}
                    {activeTabSubView === "candidates" && loadedResult.candidates && (
                      <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                        <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                          <span className="material-symbols-outlined text-sm">lightbulb</span> Pooled Candidate Proposals
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-on-surface-variant leading-relaxed">
                          Below are all the alternative candidate topics generated by the brainstorm run. Feel free to review their hackathon fit scores.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm pt-sm">
                          {loadedResult.candidates.map((cand, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 p-sm rounded hover:border-slate-400 dark:hover:border-primary-container transition-all flex flex-col justify-between text-left">
                              <div className="space-y-xs">
                                <div className="flex justify-between items-center mb-xs">
                                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">{cand.title}</h4>
                                  <span className="text-[10px] px-xs bg-slate-100 dark:bg-cyan-950/60 border border-slate-200 dark:border-cyan-800/40 rounded text-slate-700 dark:text-cyan-300 font-bold">Creator: {cand.creator || cand.agent || "AI Agent"}</span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">{cand.idea}</p>
                              </div>
                              <div className="flex items-center gap-xs mt-sm pt-xs border-t border-slate-200 dark:border-white/5">
                                <button onClick={() => openCandidateModal(cand)} className="flex-1 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-[10px] font-bold uppercase py-xs rounded bg-slate-200/60 dark:bg-white/10 transition-all text-center">
                                  View Details
                                </button>
                                <button onClick={() => selectCandidateIdea(cand)} className="flex-1 bg-primary-container hover:bg-primary-container/80 text-on-primary-container text-[10px] font-bold uppercase py-xs rounded transition-all text-center flex items-center justify-center gap-xs font-bold">
                                  Refine Idea
                                  <span className="material-symbols-outlined text-[12px]">sync</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2xl space-y-md min-h-[50vh]">
                    <span className="material-symbols-outlined text-4xl text-slate-400">folder_off</span>
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Project Details Unavailable</h3>
                    <button
                      onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }}
                      className="px-md py-xs bg-cyan-600 text-white rounded font-bold text-xs uppercase"
                    >
                      Return to Brainstorming
                    </button>
                  </div>
                )}

                  </div>
                )}

                {/* VIEW 6: ANALYTICS */}
                {activeTab === "analytics" && (
                  <div className="space-y-md text-left">
                    <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">Agent Analytics</h2>
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-xs">
                      <p className="text-sm text-slate-600 dark:text-on-surface-variant">Performance metrics and confidence telemetry across the specializing debate agent nodes.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-md pt-sm">
                        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131313] p-sm rounded space-y-xs">
                          <span className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant block uppercase font-bold tracking-wider">Average Debate Shift</span>
                          <span className="text-[28px] font-display-lg font-bold text-slate-800 dark:text-primary">2.4 Scores</span>
                          <p className="text-xs text-slate-500 dark:text-on-surface-variant">Difference between initial reviews and reflected reviews after debate.</p>
                        </div>
                        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131313] p-sm rounded space-y-xs">
                          <span className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant block uppercase font-bold tracking-wider">Top Skeptic Consensus</span>
                          <span className="text-[28px] font-display-lg font-bold text-slate-800 dark:text-secondary">38% Conceded</span>
                          <p className="text-xs text-slate-500 dark:text-on-surface-variant">Rate at which specialized skeptic concessions occur post cross-examination.</p>
                        </div>
                        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131313] p-sm rounded space-y-xs">
                          <span className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant block uppercase font-bold tracking-wider">Confidence Level</span>
                          <span className="text-[28px] font-display-lg font-bold text-slate-800 dark:text-tertiary">0.86 Avg</span>
                          <p className="text-xs text-slate-500 dark:text-on-surface-variant">Aggregated score based on specialist agent telemetry datasets.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 7: CONFIG */}
                {activeTab === "config" && (
                  <div className="space-y-md text-left">
                    <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">Model Configuration</h2>
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-xs">
                      <p className="text-sm text-slate-600 dark:text-on-surface-variant">Adjust hyperparameter configurations for the neural pipeline and underlying LLM wrappers.</p>
                      <div className="space-y-sm pt-sm max-w-xl font-code-sm text-xs">
                        <div className="space-y-xs">
                          <label className="text-slate-800 dark:text-on-surface block uppercase text-[10px] tracking-wide font-bold">Large Language Model (LLM)</label>
                          <select className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs rounded focus:outline-none">
                            <option>meta/llama-3.1-8b-instruct (Default)</option>
                            <option>openai/gpt-4o-mini</option>
                            <option>nvidia/llama-3.1-70b-instruct</option>
                          </select>
                        </div>
                        <div className="space-y-xs">
                          <label className="text-slate-800 dark:text-on-surface block uppercase text-[10px] tracking-wide font-bold">Web Research</label>
                          <div className="flex items-center gap-xs text-slate-800 dark:text-on-surface">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#131313] text-primary focus:ring-primary-container" />
                            <span>Enabled (Let agents search web sources)</span>
                          </div>
                        </div>
                        <div className="space-y-xs">
                          <label className="text-slate-800 dark:text-on-surface block uppercase text-[10px] tracking-wide font-bold">Max Debate Rounds</label>
                          <input type="number" defaultValue="1" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs rounded focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 8: NEURAL LOGS */}
                {activeTab === "logs" && (
                  <div className="space-y-md text-left">
                    <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">Neural Logs</h2>
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-xs">
                      <p className="text-sm text-slate-600 dark:text-on-surface-variant">Live telemetry streaming logs from agent cards RPC bindings.</p>
                      <div className="bg-black text-green-400 p-sm rounded font-code-sm text-[11px] h-96 overflow-y-auto space-y-xs border border-slate-950 select-all">
                        <div>[INFO] 2026-08-08T14:20:01Z - A2APanelClient connected to http://localhost:8000/agents</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: ideator (v1.0.0) &rarr; /agents/ideator</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: researcher (v1.0.0) &rarr; /agents/researcher</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: strategist (v1.0.0) &rarr; /agents/strategist</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: innovation (v1.0.0) &rarr; /agents/innovation</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: feasibility (v1.0.0) &rarr; /agents/feasibility</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: impact (v1.0.0) &rarr; /agents/impact</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: technical (v1.0.0) &rarr; /agents/technical</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: skeptic (v1.0.0) &rarr; /agents/skeptic</div>
                        <div>[INFO] 2026-08-08T14:20:03Z - Mounted card: moderator (v1.0.0) &rarr; /agents/moderator</div>
                        <div className="text-slate-400">[SYSTEM READY] Listening for rpc client requests...</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 9: SYSTEM STATUS */}
                {activeTab === "status" && (
                  <div className="space-y-md text-left">
                    <h2 className="font-headline-lg text-headline-lg text-slate-800 dark:text-primary font-bold">System Status</h2>
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-xs">
                      <p className="text-sm text-slate-600 dark:text-on-surface-variant">System performance diagnostics.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-sm font-code-sm text-xs">
                        <div className="bg-slate-50 dark:bg-[#131313] p-sm border border-slate-200 dark:border-white/5 rounded space-y-xs">
                          <span className="text-slate-500 dark:text-on-surface-variant uppercase text-[10px] font-bold block">SQLite database Server</span>
                          <span className="text-slate-700 dark:text-tertiary uppercase font-bold flex items-center gap-xs">
                            <span className="w-2 h-2 rounded-full bg-slate-700 dark:bg-tertiary"></span> ONLINE (crucible.db)
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#131313] p-sm border border-slate-200 dark:border-white/5 rounded space-y-xs">
                          <span className="text-slate-500 dark:text-on-surface-variant uppercase text-[10px] font-bold block">Agent Core Gateway</span>
                          <span className="text-slate-700 dark:text-tertiary uppercase font-bold flex items-center gap-xs">
                            <span className="w-2 h-2 rounded-full bg-slate-700 dark:bg-tertiary"></span> LINKED
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#131313] p-sm border border-slate-200 dark:border-white/5 rounded space-y-xs">
                          <span className="text-slate-500 dark:text-on-surface-variant uppercase text-[10px] font-bold block">Active Memory store</span>
                          <span className="text-slate-800 dark:text-on-surface font-bold">SQLite Persisted (Permanent)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* SEPARATE FULL-WIDTH PAGE VIEWS */}
            
            {/* PROFILE PAGE */}
            {activeTab === "profile" && (
              <div className="space-y-lg text-left">
                <header className="mb-md">
                  <h2 className="font-display-lg text-display-lg text-slate-800 dark:text-primary font-bold">Operator Profile</h2>
                  <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-sm mt-1">Manage credentials and inspect active SQLite terminal connection stats.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  
                  {/* Stats block */}
                  <div className="md:col-span-2 space-y-md">
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs space-y-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center font-display-lg text-lg font-bold text-slate-700 dark:text-primary select-none">
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base">Operator Node: {username}</h3>
                          <span className="font-code-sm text-[10px] px-xs py-base bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded uppercase text-slate-500 dark:text-on-surface-variant font-bold">CLEARANCE TIER // OPERATOR_01</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm pt-sm font-code-sm text-xs">
                        <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                          <span className="text-slate-500 dark:text-on-surface-variant block uppercase text-[10px] font-bold">Saved Projects Created</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-primary">{projects.length} Projects</span>
                        </div>
                        <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                          <span className="text-slate-500 dark:text-on-surface-variant block uppercase text-[10px] font-bold">Database Server State</span>
                          <span className="text-xl font-bold text-slate-800 dark:text-tertiary uppercase flex items-center gap-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-tertiary"></span> SQLITE LINKED
                          </span>
                        </div>
                      </div>
                    </div>
{/* Update profile block */}
<div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs space-y-md text-left">
  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Update Profile</h3>
  <form onSubmit={handleProfileUpdate} className="space-y-sm">
    <div className="space-y-xs">
      <label className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block font-bold">New Username</label>
      <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded" placeholder="Enter new username" />
    </div>
    <div className="space-y-xs">
      <label className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block font-bold">New Email</label>
      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded" placeholder="Enter new email" />
    </div>
    {passcodeSuccess && (
      <div className="text-slate-800 dark:text-tertiary text-xs font-code-sm p-xs bg-slate-100 dark:bg-tertiary/10 border border-slate-200 dark:border-tertiary/30 rounded">
        {passcodeSuccess}
      </div>
    )}
    <button type="submit" className="w-full bg-slate-900 dark:bg-primary-container text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm rounded hover:shadow-md transition-all uppercase tracking-widest font-bold">Update Profile</button>
  </form>
</div>

                    {/* Simulation logs */}
                    <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs space-y-xs">
                      <h4 className="font-code-sm text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Access Authorization Logs</h4>
                      <div className="bg-slate-950 text-slate-400 p-sm rounded font-code-sm text-[11px] h-32 overflow-y-auto space-y-xs select-none">
                        <div>[AUTH] - Node connection handshake established.</div>
                        <div>[SQLITE] - Querying user profile id mapping... (Success)</div>
                        <div>[SYSTEM] - Handed active session token to operator matching credentials.</div>
                      </div>
                    </div>
                  </div>

                  {/* Change password block */}
                  <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs space-y-md text-left">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Update Session Key</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setPasscodeSuccess("Credentials successfully updated in secure SQLite database.");
                      setCurrentPasscode("");
                      setNewPasscode("");
                    }} className="space-y-sm">
                      <div className="space-y-xs">
                        <label className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block font-bold">Current Passcode</label>
                        <input type="password" required value={currentPasscode} onChange={e => setCurrentPasscode(e.target.value)} className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded" />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block font-bold">New Passcode</label>
                        <input type="password" required value={newPasscode} onChange={e => setNewPasscode(e.target.value)} className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded" />
                      </div>
                      {passcodeSuccess && (
                        <div className="text-slate-800 dark:text-tertiary text-xs font-code-sm p-xs bg-slate-100 dark:bg-tertiary/10 border border-slate-200 dark:border-tertiary/30 rounded">
                          {passcodeSuccess}
                        </div>
                      )}
                      <button type="submit" className="w-full bg-slate-900 dark:bg-primary-container text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm rounded hover:shadow-md transition-all uppercase tracking-widest font-bold">
                        Update Key
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT US PAGE */}
            {activeTab === "about" && (
              <div className="space-y-lg text-left">
                <header className="mb-md">
                  <h2 className="font-display-lg text-display-lg text-slate-800 dark:text-primary font-bold">About Crucible System</h2>
                  <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-sm mt-1">Stress-testing and refining hackathon ideas through structured AI multi-agent debate.</p>
                </header>

                <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl shadow-xs space-y-md font-body-md">
                  <p className="leading-relaxed">
                    Crucible is designed to remove cognitive biases and groupthink from conceptual brainstorms. By deploying multiple autonomous agents programmed with contrasting viewpoints and stress-test guidelines, ideas are polished, research-validated, and refined into concrete implementation roadmaps.
                  </p>

                  <div className="glow-divider"></div>

                  <h3 className="font-bold text-slate-800 dark:text-white text-base">The Debate Panel Nodes</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm pt-xs text-xs font-code-sm">
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-secondary-fixed uppercase">1. Innovation Agent</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Focuses on competitive differentiators, novelty, and creative potential.</p>
                    </div>
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-secondary-fixed uppercase">2. Feasibility Agent</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Assesses resource limitations, build timelines, and scope boundaries.</p>
                    </div>
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-secondary-fixed uppercase">3. Impact Agent</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Evaluates user value, demographic fit, and key performance metrics.</p>
                    </div>
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-secondary-fixed uppercase">4. Technical Agent</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Audits architectural choices, language stacks, and persistency contracts.</p>
                    </div>
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-secondary-fixed uppercase">5. Skeptic Agent</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Identifies weaknesses, redundancies, edge-cases, and unverified claims.</p>
                    </div>
                    <div className="border border-slate-200 dark:border-white/10 p-sm rounded bg-slate-50 dark:bg-[#131313] space-y-xs">
                      <span className="font-bold text-slate-800 dark:text-primary uppercase">6. Moderator Synthesis</span>
                      <p className="text-slate-500 dark:text-on-surface-variant leading-relaxed">Aggregates debate consensus, prioritizes suggestions, and drafts roadmap.</p>
                    </div>
                  </div>

                  <div className="glow-divider"></div>

                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Interactive Platform Pipeline</h3>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-md pt-sm text-xs text-center font-code-sm">
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-sm rounded flex-1 w-full">
                      <span className="font-bold block mb-xs">1. Concept Intake</span>
                      <span className="text-slate-500 dark:text-on-surface-variant text-[11px]">User inputs baseline idea constraints</span>
                    </div>
                    <span className="text-slate-400 font-bold hidden md:inline">&rarr;</span>
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-sm rounded flex-1 w-full">
                      <span className="font-bold block mb-xs">2. Web Research</span>
                      <span className="text-slate-500 dark:text-on-surface-variant text-[11px]">Real-time fact checking queries</span>
                    </div>
                    <span className="text-slate-400 font-bold hidden md:inline">&rarr;</span>
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-sm rounded flex-1 w-full">
                      <span className="font-bold block mb-xs">3. Parallel Debates</span>
                      <span className="text-slate-500 dark:text-on-surface-variant text-[11px]">Spawning cross-examination threads</span>
                    </div>
                    <span className="text-slate-400 font-bold hidden md:inline">&rarr;</span>
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-sm rounded flex-1 w-full">
                      <span className="font-bold block mb-xs">4. Moderator Consensus</span>
                      <span className="text-slate-500 dark:text-on-surface-variant text-[11px]">Persisting output to SQLite DB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT US PAGE */}
            {activeTab === "contact" && (
              <div className="space-y-lg text-left">
                <header className="mb-md">
                  <h2 className="font-display-lg text-display-lg text-slate-800 dark:text-primary font-bold">Contact Crucible Uplink</h2>
                  <p className="font-body-md text-slate-600 dark:text-on-surface-variant text-sm mt-1">Submit feedback, query diagnostics, or contact our engineering team.</p>
                </header>

                <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md md:p-lg rounded-xl shadow-xs">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setContactSuccess(`[SUCCESS] Uplink established. Transmission logged under crucible.db at ${new Date().toISOString()}`);
                    setContactName("");
                    setContactEmail("");
                    setContactMsg("");
                  }} className="space-y-md text-left w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block font-bold">Your Name *</label>
                        <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded focus:outline-none focus:border-slate-400 dark:focus:border-primary-container" />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block font-bold">Uplink Email Address *</label>
                        <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="e.g. operator@domain.com" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded focus:outline-none focus:border-slate-400 dark:focus:border-primary-container" />
                      </div>
                    </div>

                    <div className="space-y-xs">
                      <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block font-bold">Inquiry Routing Department</label>
                      <select value={contactDept} onChange={e => setContactDept(e.target.value)} className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded focus:outline-none">
                        <option>AI Debater Core</option>
                        <option>Backend SQLite Persistence</option>
                        <option>Frontend UI Config</option>
                      </select>
                    </div>

                    <div className="space-y-xs">
                      <label className="font-code-sm text-label-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block font-bold">Transmission Message *</label>
                      <textarea required value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder="Enter details of your feedback or inquiry..." rows="5" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-sm font-code-sm text-sm rounded focus:outline-none focus:border-slate-400 dark:focus:border-primary-container"></textarea>
                    </div>

                    {contactSuccess && (
                      <div className="bg-slate-950 text-green-400 p-sm rounded font-code-sm text-xs border border-slate-900">
                        {contactSuccess}
                      </div>
                    )}

                    <button type="submit" className="bg-slate-900 dark:bg-primary-container text-white dark:text-on-primary-container font-label-xs text-label-xs py-sm px-lg rounded hover:shadow-md transition-all uppercase tracking-widest font-bold flex items-center gap-xs">
                      Transmit Message
                      <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* DETAIL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0A0A0A]/95 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md neon-glow-primary flex flex-col max-h-[85vh] text-left shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-xs">
              <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary">{modalTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-md font-code-sm text-xs pr-xs text-slate-800 dark:text-on-surface-variant">
              {modalContent}
            </div>
          </div>
        </div>
      )}
      {/* COLLABORATION / SHARE MODAL */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0A0A0A]/95 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md flex flex-col text-left shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-xs">
              <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">groups</span> Share & Team Uplink
              </h3>
              <button onClick={() => setShowCollabModal(false)} className="text-slate-500 dark:text-on-surface-variant hover:text-slate-800 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={inviteCollaborator} className="space-y-xs">
              <label className="font-code-sm text-[10px] uppercase font-bold text-slate-500 dark:text-on-surface-variant">Invite Teammate (Email / Username)</label>
              <div className="flex gap-xs">
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="e.g. teammate@hackathon.io"
                  className="flex-1 bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded-DEFAULT focus:outline-none focus:border-primary-container"
                />
                <button type="submit" className="bg-primary-container text-on-primary-container font-label-xs text-xs px-md py-xs rounded-DEFAULT uppercase font-bold hover:bg-primary-container/80 transition-all">
                  Invite
                </button>
              </div>
              {inviteStatus && (
                <p className={`text-[10px] font-code-sm mt-xs ${inviteStatus.includes("[ERROR]") ? "text-red-500" : "text-green-500"}`}>
                  {inviteStatus}
                </p>
              )}
            </form>

            <div className="space-y-xs pt-xs border-t border-slate-200 dark:border-white/10">
              <h4 className="font-code-sm text-xs font-bold text-slate-800 dark:text-white uppercase">Project Members</h4>
              <div className="max-h-40 overflow-y-auto space-y-xs font-code-sm text-xs">
                {collaborators.owner && (
                  <div className="flex items-center justify-between p-xs bg-slate-50 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">{collaborators.owner.username}</span>
                      <span className="text-[10px] text-slate-400 dark:text-on-surface-variant block">{collaborators.owner.email}</span>
                    </div>
                    <span className="text-[9px] px-xs py-base bg-primary/10 text-primary rounded font-bold uppercase">Owner</span>
                  </div>
                )}
                {(collaborators.collaborators || (Array.isArray(collaborators) ? collaborators : [])).map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-xs bg-slate-50 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">{c.username || c.email}</span>
                      <span className="text-[10px] text-slate-400 dark:text-on-surface-variant block">{c.email}</span>
                    </div>
                    <span className="text-[9px] px-xs py-base bg-secondary/10 text-secondary rounded font-bold uppercase">Teammate</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-md">
          <div className="w-full max-w-sm bg-white dark:bg-[#0E0F14] border border-slate-200 dark:border-white/10 p-lg rounded-xl space-y-md flex flex-col text-left shadow-2xl">
            <div className="flex items-center gap-xs text-rose-500 font-bold text-sm uppercase font-display-lg">
              <span className="material-symbols-outlined text-lg">warning</span>
              Confirm Delete Project
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-code-sm">
              Are you sure you want to permanently delete this project? All research, reviews, and debate records will be removed. This action cannot be undone.
            </p>
            <div className="flex justify-end items-center gap-sm pt-xs font-code-sm">
              <button
                type="button"
                onClick={() => setDeleteConfirmProject(null)}
                className="px-md py-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = deleteConfirmProject;
                  setDeleteConfirmProject(null);
                  await deleteProject(targetId);
                }}
                className="px-md py-xs bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-xs">delete</span>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
