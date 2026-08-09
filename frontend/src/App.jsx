import React, { useState, useEffect, useRef } from "react";

import { AGENT_STYLE, agentDisplayName } from "./constants/agents";
import { FLOW_STEPS } from "./constants/nav";
import { parseSSEChunk } from "./utils/sse";
import { buildIdeasFromData, extractDebateReplies } from "./utils/debate";
import { Badge, Button, SectionLabel, Stepper } from "./components/ui";
import { AppContext } from "./context/AppContext";
import AuthScreen from "./components/AuthScreen";
import TopNav from "./components/TopNav";
import DesktopSidebar from "./components/DesktopSidebar";
import MobileDrawer from "./components/MobileDrawer";
import PathwayView from "./components/PathwayView";
import RefineFormView from "./components/RefineFormView";
import GenerateFormView from "./components/GenerateFormView";
import RunningView from "./components/RunningView";
import DashboardView from "./components/DashboardView";
import AnalyticsView from "./components/AnalyticsView";
import ConfigView from "./components/ConfigView";
import LogsView from "./components/LogsView";
import StatusView from "./components/StatusView";
import ProfileView from "./components/ProfileView";
import AboutView from "./components/AboutView";
import ContactView from "./components/ContactView";
import DetailModal from "./components/DetailModal";
import CollabModal from "./components/CollabModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import Notice from "./components/Notice";

const API_BASE = "http://localhost:8000";

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem("crucible_token") || null);
  const [username, setUsername] = useState(localStorage.getItem("crucible_username") || "");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authError, setAuthError] = useState("");

  // App views state
  const [activeTab, setActiveTab] = useState("pathway"); // pathway, refine_form, generate_form, running, dashboard, analytics, config, logs, status, profile, about, contact
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Theme toggle state
  const [theme, setTheme] = useState(localStorage.getItem("crucible_theme") || "dark");

  // Profile & Contact form states
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDept, setContactDept] = useState("Product feedback");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  // Collaborations, Invitations & Chat follow-ups states
  const [collaboratedProjects, setCollaboratedProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [notice, setNotice] = useState(null);
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
  const noticeTimerRef = useRef(null);

  const showNotice = (type, text) => {
    clearTimeout(noticeTimerRef.current);
    setNotice({ type, text });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000);
  };

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
        showNotice("error", errData.detail || "Error responding to invitation");
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
    setInviteStatus("Sending invitation...");
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
        setInviteStatus(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        loadCollaborators(activeProject.id);
      } else {
        setInviteStatus(`Failed to send invite: ${data.detail || "unknown error"}`);
      }
    } catch (err) {
      setInviteStatus("Failed to send invite: connection lost");
    }
  };

  const selectCandidateIdea = async (candidate) => {
    if (!activeProject) return;
    setCandidateSelectionLoading(false);
    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([]);
    appendConsoleLine("Running the refinement debate...");

    await streamPipeline(
      `${API_BASE}/api/projects/${activeProject.id}/select-candidate`,
      { title: candidate.title || activeProject.name, idea: candidate.idea || activeProject.name },
      {
        onEvent: handlePipelineEvent,
        onError: (err) => {
          stopProgressTimer();
          appendConsoleLine(`[ERROR] Failed to start refinement: ${err.message}`, "#ffb4ab");
          showNotice("error", "Failed to start the refinement debate: " + err.message);
          setActiveTab("dashboard");
        }
      }
    );
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

    const agentDisplay = `${selectedAgentForChat.charAt(0).toUpperCase()}${selectedAgentForChat.slice(1)} Agent`;
    setChats(prev => [...prev, { sender: username, message: userMessage, created_at: new Date().toISOString() }]);
    setChats(prev => [...prev, { sender: agentDisplay, message: "", created_at: new Date().toISOString(), streaming: true }]);

    const updateLastChat = (updater) => {
      setChats(prev => {
        const next = [...prev];
        next[next.length - 1] = updater(next[next.length - 1]);
        return next;
      });
    };

    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProject.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ message: userMessage, recipient: selectedAgentForChat })
      });
      if (!res.ok || !res.body) throw new Error("Failed to reach the agent.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop();
        for (const frame of frames) {
          const parsed = parseSSEChunk(frame);
          if (!parsed) continue;
          const { event, data } = parsed;
          if (event === "token") {
            updateLastChat(prev => ({ ...prev, message: (prev.message || "") + data.text }));
          } else if (event === "agent_done") {
            updateLastChat(prev => ({ ...prev, message: data.message, streaming: false }));
          } else if (event === "error") {
            updateLastChat(prev => ({ ...prev, message: `[ERROR] ${data.message}`, streaming: false }));
          }
        }
      }
    } catch (err) {
      updateLastChat(prev => ({ ...prev, message: `[ERROR] ${err.message}`, streaming: false }));
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
        showNotice("error", "Failed to delete project from database");
      }
    } catch (err) {
      console.error("Error deleting project", err);
    }
  };

  const handleDeleteClick = (projectId, e) => {
    e.stopPropagation();
    setDeleteConfirmProject(projectId);
  };

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
        showNotice("success", "Registration complete. Sign in with your new account.");
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
      showNotice("error", "Please provide a new username or email to update.");
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
        showNotice("error", err.detail || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      showNotice("error", "Error updating profile");
    }
  };

  const appendConsoleLine = (text, color = "#94a3b8") => {
    setConsoleLogs(prev => [...prev, { text, color }]);
  };

  const addAgentLog = (agent, text, style = AGENT_STYLE.moderator) => {
    setConsoleLogs(prev => [...prev, {
      agent,
      avatar: style.avatar,
      color: style.color,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);
  };

  const streamPipeline = async (url, payload, { onEvent, onError } = {}) => {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      if (onError) onError(err);
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      if (onError) onError(new Error(`Server error ${res.status}: ${text}`));
      return;
    }
    if (!res.body) {
      if (onError) onError(new Error("Streaming not supported by the browser"));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop();
        for (const frame of frames) {
          const parsed = parseSSEChunk(frame);
          if (parsed && onEvent) onEvent(parsed.event, parsed.data);
        }
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  const handlePipelineEvent = (event, data) => {
    if (event === "phase_start") {
      appendConsoleLine(data.title || data.phase);
      return;
    }
    if (event === "agent_done") {
      const phase = data.phase || "";
      const agent = data.agent || "agent";
      const style = AGENT_STYLE[agent] || AGENT_STYLE.moderator;
      const display = agentDisplayName(agent);

      if (phase === "debate") {
        const replies = extractDebateReplies(data.data);
        if (replies.length === 0) {
          addAgentLog(display, "Debate round complete — no direct challenges raised.", style);
        }
        replies.forEach(r => {
          const stance = (r.stance || "").toLowerCase().includes("disagree")
            ? "DISAGREES with"
            : "responds to";
          addAgentLog(display, `${stance} ${r.reply_to}: ${r.argument}`, style);
        });
        return;
      }

      if (phase === "review" || phase === "reflection") {
        const d = data.data || {};
        const score = d.score !== undefined ? d.score : (d.new_score !== undefined ? d.new_score : null);
        const strengths = Array.isArray(d.strengths) ? d.strengths : (Array.isArray(d.pros) ? d.pros : []);
        const label = phase === "review" ? "Independent review complete" : "Reflection complete";
        const scoreTxt = score !== null ? ` | Score ${score}/10` : "";
        addAgentLog(display, `${label}${scoreTxt}${strengths[0] ? " — " + strengths[0] : ""}`, style);
        return;
      }

      if (phase === "proposal") {
        const d = data.data || {};
        const title = d.title || d.idea || "";
        const fit = d.hackathon_fit !== undefined ? ` (fit ${d.hackathon_fit}/10)` : "";
        addAgentLog(display, `Proposed idea: ${title}${fit}`, style);
        return;
      }

      if (phase === "moderator") {
        const d = data.data || {};
        const consensus = Array.isArray(d.consensus)
          ? d.consensus.join("; ")
          : (d.synthesized_consensus || d.refined_idea || "");
        addAgentLog(display, `Moderator synthesis complete — ${consensus || "consensus reached."}`, style);
        return;
      }

      if (phase === "research") {
        addAgentLog(display, "Web research complete.", style);
        return;
      }

      addAgentLog(display, `${phase} phase complete.`, style);
      return;
    }
    if (event === "complete") {
      stopProgressTimer();
      loadProjects();
      if (data.version != null) {
        setActiveVersionIdx(data.version - 1);
      }
      loadProjectDetails(data.project_id);
      return;
    }
    if (event === "error") {
      stopProgressTimer();
      appendConsoleLine(`[ERROR] ${data.message}`, "#f43f5e");
      return;
    }
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

  const submitRefine = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      showNotice("error", "Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([]);
    appendConsoleLine("Starting the debate panel...");

    const payload = {
      project_name: projectName,
      idea: refineIdea,
      theme: refineTheme || null,
      team_size: refineTeam ? parseInt(refineTeam) : null,
      time_hours: refineTime ? parseInt(refineTime) : null
    };

    await streamPipeline(`${API_BASE}/idea/refine`, payload, {
      onEvent: handlePipelineEvent,
      onError: (err) => {
        stopProgressTimer();
        appendConsoleLine(`[ERROR] Refinement pipeline execution failed: ${err.message}`, "#f43f5e");
        showNotice("error", "Execution failed: " + err.message);
        setActiveTab("refine_form");
      }
    });
  };

  const submitGenerate = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      showNotice("error", "Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();
    setConsoleLogs([]);
    appendConsoleLine("Starting the debate panel...");

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

    await streamPipeline(`${API_BASE}/idea/generate`, payload, {
      onEvent: handlePipelineEvent,
      onError: (err) => {
        stopProgressTimer();
        appendConsoleLine(`[ERROR] Generation pipeline execution failed: ${err.message}`, "#f43f5e");
        showNotice("error", "Execution failed: " + err.message);
        setActiveTab("generate_form");
      }
    });
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
    setConsoleLogs([]);
    appendConsoleLine("Starting the debate panel...");

    const payload = {
      project_name: activeProject.name,
      idea: `BASELINE IDEA:\n${baseIdea}\n\nAccepted Improvements:\n${accepted.map(a => `- ${a}`).join('\n')}\n\nRejected Improvements:\n${rejected.map(r => `- ${r}`).join('\n')}\n\nOperator Notes:\n${operatorNotes}`,
      theme: null,
      team_size: null,
      time_hours: null,
      project_id: activeProject.id
    };

    await streamPipeline(`${API_BASE}/idea/refine`, payload, {
      onEvent: handlePipelineEvent,
      onError: (err) => {
        stopProgressTimer();
        appendConsoleLine(`[ERROR] Iteration failed: ${err.message}`, "#f43f5e");
        showNotice("error", "Iteration failed: " + err.message);
        setActiveTab("dashboard");
      }
    });
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

    setModalTitle(`${name} Agent — Arguments & Debate Log`);
    setModalContent(
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Independent review snapshot</h4>
            <Badge tone="primary">Confidence: {rev.confidence || "0.85"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Score: <span className="font-semibold text-slate-900 dark:text-white">{rev.score !== undefined ? rev.score : 7}/10</span>
          </p>
          <div className="mt-3">
            <SectionLabel>Key strengths & weaknesses</SectionLabel>
            <p className="mt-1 rounded-lg bg-slate-50 dark:bg-[#1a1e2b] p-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {rev.strengths && Array.isArray(rev.strengths) ? rev.strengths.join(", ") : (typeof rev.strengths === "string" ? rev.strengths : "Independent review logged.")}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-[#272c3d] pt-5">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            Debate stances & rebuttals ({debateReplies.length})
          </h4>
          {debateReplies.length > 0 ? (
            <div className="mt-3 space-y-2">
              {debateReplies.map((arg, idx) => {
                const isDisagree = arg.stance && (arg.stance.toLowerCase().includes("disagree") || arg.stance.toLowerCase().includes("challenge"));
                return (
                  <div key={idx} className="rounded-lg border border-slate-200 dark:border-[#272c3d] bg-slate-50 dark:bg-[#1a1e2b] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Challenged <span className="font-medium text-slate-900 dark:text-white">{arg.reply_to}</span>
                      </p>
                      <Badge tone={isDisagree ? "danger" : "success"}>{arg.stance || "Stance"}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{arg.argument}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">This agent participated in the independent review and reflection rounds.</p>
          )}
        </div>

        {refl && (refl.new_score !== undefined || refl.reason) && (
          <div className="border-t border-slate-200 dark:border-[#272c3d] pt-5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Post-debate reflection</h4>
            {refl.new_score !== undefined && (
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                Reflected score: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{refl.new_score}/10</span>
                {refl.old_score && <span className="ml-1.5 text-slate-400">(was {refl.old_score})</span>}
              </p>
            )}
            {refl.reason && (
              <p className="mt-2 rounded-lg bg-slate-50 dark:bg-[#1a1e2b] p-3 text-sm italic leading-relaxed text-slate-600 dark:text-slate-300">"{refl.reason}"</p>
            )}
          </div>
        )}
      </div>
    );
    setShowModal(true);
  };

  const openCandidateModal = (cand) => {
    setModalTitle(`Proposal details: ${cand.title}`);
    setModalContent(
      <div className="space-y-6">
        <div>
          <SectionLabel>Hackathon pitch idea</SectionLabel>
          <p className="mt-1 rounded-lg bg-slate-50 dark:bg-[#1a1e2b] p-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{cand.idea}</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <SectionLabel>Proposed by</SectionLabel>
            <p className="mt-0.5 font-medium text-slate-900 dark:text-white">{cand.agent}</p>
          </div>
          <div>
            <SectionLabel>Fit rating</SectionLabel>
            <p className="mt-0.5 font-medium text-slate-900 dark:text-white">{cand.hackathon_fit}/10</p>
          </div>
        </div>
        <div>
          <SectionLabel>Concrete problem statement</SectionLabel>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{cand.problem}</p>
        </div>
        <div>
          <SectionLabel>Decisive supporting facts</SectionLabel>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {(cand.evidence || []).map((e, idx) => <li key={idx}>{e}</li>)}
          </ul>
        </div>
        <div>
          <SectionLabel>Counterfacts / open assumptions</SectionLabel>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {(cand.counterfact || []).map((c, idx) => <li key={idx}>{c}</li>)}
          </ul>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            setShowModal(false);
            selectCandidateIdea(cand);
          }}
        >
          <span className="material-symbols-outlined text-base">rocket_launch</span>
          Run the refinement debate on this idea
        </Button>
      </div>
    );
    setShowModal(true);
  };


  const activeCand = getActiveCandidateInfo();
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

  const isBrainstormTab = ["pathway", "refine_form", "generate_form", "running", "dashboard", "analytics", "config", "logs", "status"].includes(activeTab);

  const goToPathway = () => {
    setActiveTab("pathway");
    setActiveProject(null);
    setLoadedResult(null);
    setProjectName("");
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const openModeratorChat = () => {
    setSelectedAgentForChat("moderator");
    setActiveTabSubView("chat");
    setActiveTab("dashboard");
  };

  const flowStep = activeTab === "pathway" ? 0
    : activeTab === "refine_form" || activeTab === "generate_form" ? 1
    : activeTab === "running" ? 2
    : activeTab === "dashboard" ? 3
    : -1;

  const ctx = {
    // auth & app state
    token, setToken,
    username, setUsername,
    newUsername, setNewUsername,
    newEmail, setNewEmail,
    authMode, setAuthMode,
    authError, setAuthError,
    activeTab, setActiveTab,
    projects, setProjects,
    activeProject, setActiveProject,
    chats, setChats,
    consoleLogs, setConsoleLogs,
    progressTime, setProgressTime,
    deleteConfirmProject, setDeleteConfirmProject,
    loadedResult, setLoadedResult,
    projectLoading, setProjectLoading,
    projectName, setProjectName,
    refineIdea, setRefineIdea,
    refineTheme, setRefineTheme,
    refineTeam, setRefineTeam,
    refineTime, setRefineTime,
    genTopic, setGenTopic,
    genTheme, setGenTheme,
    genTeam, setGenTeam,
    genTime, setGenTime,
    genGoals, setGenGoals,
    genConstraints, setGenConstraints,
    genUrls, setGenUrls,
    modalTitle, setModalTitle,
    modalContent, setModalContent,
    showModal, setShowModal,
    operatorNotes, setOperatorNotes,
    mobileMenuOpen, setMobileMenuOpen,
    userMenuOpen, setUserMenuOpen,
    theme, setTheme,
    currentPasscode, setCurrentPasscode,
    newPasscode, setNewPasscode,
    passcodeSuccess, setPasscodeSuccess,
    contactName, setContactName,
    contactEmail, setContactEmail,
    contactDept, setContactDept,
    contactMsg, setContactMsg,
    contactSuccess, setContactSuccess,
    collaboratedProjects, setCollaboratedProjects,
    invitations, setInvitations,
    collaborators, setCollaborators,
    inviteEmail, setInviteEmail,
    inviteStatus, setInviteStatus,
    notice, setNotice,
    showNotice,
    selectedAgentForChat, setSelectedAgentForChat,
    chatInput, setChatInput,
    chatLoading, setChatLoading,
    showCollabModal, setShowCollabModal,
    candidateSelectionLoading, setCandidateSelectionLoading,
    activeTabSubView, setActiveTabSubView,
    activeDebateStage, setActiveDebateStage,
    selectedCandidateIdx, setSelectedCandidateIdx,
    selectedImprovements, setSelectedImprovements,
    activeVersionIdx, setActiveVersionIdx,
    // refs
    consoleEndRef,
    progressTimerRef,
    // handlers
    toggleImprovement,
    loadProjects,
    loadCollaboratedProjects,
    loadInvitations,
    respondToInvitation,
    loadCollaborators,
    inviteCollaborator,
    selectCandidateIdea,
    handleRefineCurrentIdea,
    getActiveCandidateInfo,
    sendAgentMessage,
    loadProjectDetails,
    deleteProject,
    handleDeleteClick,
    handleLogin,
    handleRegister,
    handleLogout,
    handleProfileUpdate,
    appendConsoleLine,
    addAgentLog,
    streamPipeline,
    handlePipelineEvent,
    startProgressTimer,
    stopProgressTimer,
    submitRefine,
    submitGenerate,
    triggerIteration,
    openAgentModal,
    openCandidateModal,
    // derived
    activeCand,
    isCurrentCandidateRefined,
    versionList,
    activeVersion,
    innerResult,
    isGenerationKind,
    innerRefinement,
    isBrainstormTab,
    goToPathway,
    openModeratorChat,
    flowStep,
  };

  // Render Helper for Auth
  if (!token) {
    return (
      <AppContext.Provider value={ctx}>
        <AuthScreen />
        <Notice />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col">
      {theme === "dark" && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.05) 40%, transparent 70%), repeating-linear-gradient(0deg, rgba(148,163,184,0.04) 0 1px, transparent 1px 3px)",
          }}
        />
      )}
      {/* PERSISTENT TOP NAVBAR */}
      <TopNav />

      {/* WORKSPACE */}
      <div className="flex flex-1">
        {/* SIDEBAR (Desktop) */}
        {isBrainstormTab && <DesktopSidebar />}

        {/* MOBILE DRAWER */}
        {isBrainstormTab && mobileMenuOpen && <MobileDrawer />}

        {/* MAIN CANVAS */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl">
            {isBrainstormTab && flowStep >= 0 && <Stepper steps={FLOW_STEPS} current={flowStep} />}

            {isBrainstormTab ? (
              <>
                {/* VIEW 1: PATHWAY SELECTION */}
                {activeTab === "pathway" && <PathwayView />}

                {/* VIEW 2: REFINEMENT FORM */}
                {activeTab === "refine_form" && <RefineFormView />}

                {/* VIEW 3: GENERATION FORM */}
                {activeTab === "generate_form" && <GenerateFormView />}

                {/* VIEW 4: LIVE DEBATE STREAM */}
                {activeTab === "running" && <RunningView />}

                {/* VIEW 5: DEBATE DASHBOARD */}
                {activeTab === "dashboard" && <DashboardView />}

                {/* VIEW 6: ANALYTICS */}
                {activeTab === "analytics" && <AnalyticsView />}

                {/* VIEW 7: CONFIG */}
                {activeTab === "config" && <ConfigView />}

                {/* VIEW 8: LOGS */}
                {activeTab === "logs" && <LogsView />}

                {/* VIEW 9: SYSTEM STATUS */}
                {activeTab === "status" && <StatusView />}
              </>
            ) : (
              <>
                {/* PROFILE PAGE */}
                {activeTab === "profile" && <ProfileView />}

                {/* ABOUT US PAGE */}
                {activeTab === "about" && <AboutView />}

                {/* CONTACT US PAGE */}
                {activeTab === "contact" && <ContactView />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* DETAIL MODAL */}
      {showModal && <DetailModal />}

      {/* COLLABORATION / SHARE MODAL */}
      {showCollabModal && <CollabModal />}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmProject && <DeleteConfirmModal />}

      <Notice />
      </div>
    </AppContext.Provider>
  );
}

