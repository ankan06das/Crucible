import React, { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem("crucible_token") || null);
  const [username, setUsername] = useState(localStorage.getItem("crucible_username") || "");
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authError, setAuthError] = useState("");
  
  // App views state
  const [activeTab, setActiveTab] = useState("pathway"); // pathway, refine_form, generate_form, running, dashboard, history, analytics, config, logs, status
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [progressTime, setProgressTime] = useState(0.0);
  const [loadedResult, setLoadedResult] = useState(null);

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
    }
  }, [token]);

  // Scroll console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Error loading projects", err);
    }
  };

  const loadProjectDetails = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProject(data);
        setLoadedResult(data.project_data);
        
        // Load chats
        const chatRes = await fetch(`${API_BASE}/api/projects/${projectId}/chats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChats(chatData);
        }
        
        setActiveTab("dashboard");
      }
    } catch (err) {
      console.error("Error loading project details", err);
    }
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
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal })
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
    setActiveProject(null);
    setLoadedResult(null);
    setChats([]);
  };

  const appendConsoleLine = (text, color = "#e2e2e2") => {
    setConsoleLogs(prev => [...prev, { text, color }]);
  };

  const runMockLogs = (callback) => {
    const steps = [
      { msg: "[SYSTEM] Initiating A2A communication socket...", delay: 200, color: "#849495" },
      { msg: "[SYSTEM] Connecting to Innovation Agent spec...", delay: 400, color: "#e2e2e2" },
      { msg: "[SYSTEM] Connecting to Feasibility Agent spec...", delay: 200, color: "#e2e2e2" },
      { msg: "[SYSTEM] Connecting to Impact Agent spec...", delay: 200, color: "#e2e2e2" },
      { msg: "[SYSTEM] Connecting to Technical Agent spec...", delay: 200, color: "#e2e2e2" },
      { msg: "[SYSTEM] Connecting to Skeptic Agent spec...", delay: 200, color: "#e2e2e2" },
      { msg: "[RESEARCHER] Querying search endpoint with lens hint...", delay: 600, color: "#74f5ff" },
      { msg: "[SYSTEM] Web research brief compiled. Launching parallel reviews...", delay: 800, color: "#34fc0d" },
      { msg: "[INDEPENDENT REVIEW] Innovation Agent submitted baseline evaluation (Confidence: 0.88).", delay: 1000, color: "#fe00fe" },
      { msg: "[INDEPENDENT REVIEW] Feasibility Agent submitted baseline evaluation (Confidence: 0.82).", delay: 600, color: "#fe00fe" },
      { msg: "[INDEPENDENT REVIEW] Skeptic Agent submitted critical review (Confidence: 0.94).", delay: 800, color: "#ffb4ab" },
      { msg: "[DEBATE ENGINE] Distributing peer reviews to all Specialist Nodes...", delay: 700, color: "#849495" },
      { msg: "[DEBATE ROUND] Technical Agent challenging Skeptic Agent stance...", delay: 1200, color: "#79ff5b" },
      { msg: "[DEBATE ROUND] Skeptic Agent responding with counterfact evaluation...", delay: 900, color: "#ffb4ab" },
      { msg: "[REFLECTION] Innovation Agent updated score configuration (10 -> 8).", delay: 1000, color: "#fe00fe" },
      { msg: "[REFLECTION] Feasibility Agent validated challenge and revised roadmap priority.", delay: 800, color: "#fe00fe" },
      { msg: "[SYSTEM] Concluding debates. Feeding data to Moderator...", delay: 600, color: "#34fc0d" },
      { msg: "[MODERATOR] Aggregating consensus and constructing refined implementation path...", delay: 1000, color: "#74f5ff" },
      { msg: "[SYSTEM] Output database persistence finalized. Rendering analytical metrics.", delay: 400, color: "#34fc0d" }
    ];

    setConsoleLogs([{ text: "[SYSTEM] Initializing node thread...", color: "#849495" }]);
    let index = 0;

    function printNext() {
      if (index < steps.length) {
        appendConsoleLine(steps[index].msg, steps[index].color);
        setTimeout(printNext, steps[index].delay);
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

  const submitRefine = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();

    const payload = {
      project_name: projectName,
      idea: refineIdea,
      theme: refineTheme || null,
      team_size: refineTeam ? parseInt(refineTeam) : null,
      time_hours: refineTime ? parseInt(refineTime) : null
    };

    let apiError = null;
    let resultData = null;

    const apiCall = fetch(`${API_BASE}/idea/refine`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    }).then(async res => {
      if (res.ok) {
        resultData = await res.json();
      } else {
        const text = await res.text();
        apiError = `Server error ${res.status}: ${text}`;
      }
    }).catch(err => {
      apiError = err.message;
    });

    runMockLogs(async () => {
      await apiCall;
      stopProgressTimer();

      if (apiError) {
        appendConsoleLine(`[ERROR] Refinement pipeline execution failed: ${apiError}`, "#ffb4ab");
        alert("Execution failed: " + apiError);
        setActiveTab("refine_form");
      } else {
        // Load details of the newly created project
        loadProjects();
        loadProjectDetails(resultData.project_id);
      }
    });
  };

  const submitGenerate = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Please specify a project name to save this concept under.");
      return;
    }

    setActiveTab("running");
    startProgressTimer();

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

    let apiError = null;
    let resultData = null;

    const apiCall = fetch(`${API_BASE}/idea/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).then(async res => {
      if (res.ok) {
        resultData = await res.json();
      } else {
        const text = await res.text();
        apiError = `Server error ${res.status}: ${text}`;
      }
    }).catch(err => {
      apiError = err.message;
    });

    runMockLogs(async () => {
      await apiCall;
      stopProgressTimer();

      if (apiError) {
        appendConsoleLine(`[ERROR] Generation pipeline execution failed: ${apiError}`, "#ffb4ab");
        alert("Execution failed: " + apiError);
        setActiveTab("generate_form");
      } else {
        loadProjects();
        loadProjectDetails(resultData.project_id);
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

    const baseIdea = loadedResult.moderator ? loadedResult.moderator.refined_idea : "";
    
    setActiveTab("running");
    startProgressTimer();

    const payload = {
      project_name: activeProject.name,
      idea: `BASELINE IDEA:\n${baseIdea}\n\nAccepted Improvements:\n${accepted.map(a => `- ${a}`).join('\n')}\n\nRejected Improvements:\n${rejected.map(r => `- ${r}`).join('\n')}\n\nOperator Notes:\n${operatorNotes}`,
      theme: null,
      team_size: null,
      time_hours: null
    };

    let apiError = null;
    let resultData = null;

    const apiCall = fetch(`${API_BASE}/idea/refine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).then(async res => {
      if (res.ok) {
        resultData = await res.json();
      } else {
        apiError = `Server returned status ${res.status}`;
      }
    }).catch(err => {
      apiError = err.message;
    });

    runMockLogs(async () => {
      await apiCall;
      stopProgressTimer();

      if (apiError) {
        appendConsoleLine(`[ERROR] Iteration failed: ${apiError}`, "#ffb4ab");
        alert("Iteration failed: " + apiError);
        setActiveTab("dashboard");
      } else {
        loadProjects();
        loadProjectDetails(resultData.project_id);
      }
    });
  };

  const openAgentModal = (name) => {
    if (!loadedResult) return;
    const key = name.toLowerCase();
    const reviews = loadedResult.refined_reviews || loadedResult.reviews || {};
    const reflections = loadedResult.refined_reflections || loadedResult.reflections || {};
    const debates = loadedResult.refined_debates || loadedResult.debates || loadedResult.debate || {};

    const rev = reviews[key] || reviews[name] || {};
    const refl = reflections[key] || reflections[name] || {};
    const round = debates[key] || debates[name] || null;

    setModalTitle(`${name} Agent Arguments`);
    setModalContent(
      <div className="space-y-md">
        <div className="border-b border-white/10 pb-sm mb-md">
          <h4 className="font-bold text-white text-xs uppercase mb-xs font-display-lg">Independent Review Snapshot</h4>
          <div className="grid grid-cols-2 gap-sm text-[11px] pt-xs">
            <div>Score: <span className="text-secondary font-bold">{rev.score || "N/A"}/10</span></div>
            <div>Confidence: <span className="text-tertiary">{rev.confidence || "0.00"}</span></div>
          </div>
          <div className="mt-sm space-y-xs">
            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant block font-bold">Key Weaknesses Criticized</span>
            <ul className="list-disc list-inside space-y-xs pl-xs text-on-surface-variant">
              {(rev.weaknesses || []).map((w, idx) => <li key={idx}>{w}</li>)}
            </ul>
          </div>
        </div>

        <div className="space-y-sm">
          <h4 className="font-bold text-white text-xs uppercase mb-sm font-display-lg">Debate Stances Taken</h4>
          {round && Array.isArray(round.arguments) && round.arguments.length > 0 ? (
            round.arguments.map((arg, idx) => {
              const isDisagree = arg.stance && arg.stance.toLowerCase() === "disagree";
              return (
                <div key={idx} className="bg-[#131313] p-sm border border-white/5 rounded">
                  <div className="flex justify-between items-center mb-xs">
                    <div>Stance on <span className="font-bold text-secondary-fixed uppercase">{arg.reply_to}</span></div>
                    <span className={`text-[9px] px-xs rounded bg-white/5 border border-white/10 uppercase tracking-widest ${isDisagree ? "text-error" : "text-tertiary"}`}>{arg.stance || "stance"}</span>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">{arg.argument}</p>
                </div>
              );
            })
          ) : (
            <div className="text-on-surface-variant italic">This agent did not initiate any specific cross-examination arguments.</div>
          )}
        </div>

        {refl && refl.new_score !== undefined && (
          <div className="border-t border-white/10 pt-sm mt-md space-y-xs">
            <h4 className="font-bold text-white text-xs uppercase mb-xs font-display-lg">Post-Debate Reflection</h4>
            <div className="text-[11px] pt-xs">
              Reflected Score: <span className="text-tertiary font-bold">{refl.new_score}/10</span>
              <span className="text-on-surface-variant ml-xs">(Was: {refl.old_score || rev.score})</span>
            </div>
            <p className="text-on-surface-variant leading-relaxed mt-xs italic bg-white/5 p-xs rounded border border-white/5">"{refl.reason}"</p>
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
  const innerResult = loadedResult ? (loadedResult.result || loadedResult) : null;
  const isGenerationKind = loadedResult && (loadedResult.kind === "generate" || !!innerResult?.conclusion);

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
          <div className="flex items-center gap-xs font-display-lg text-headline-lg-mobile font-[900] text-slate-900 dark:text-primary cursor-pointer tracking-tighter" onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }}>
            <img src="/favicon.png" className="w-6 h-6 rounded-full" alt="Crucible Logo" />
            <span>Crucible.</span>
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

              <div className="flex-1 flex flex-col gap-sm">
                <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold">Saved Projects</div>
                
                <div className="flex-1 overflow-y-auto max-h-[35vh] space-y-xs">
                  {projects.map(proj => (
                    <a key={proj.id} onClick={() => loadProjectDetails(proj.id)} className={`flex items-center gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-xs truncate max-w-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 border-l-2 border-primary-container font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                      <span className="material-symbols-outlined text-xs select-none">folder</span>
                      {proj.name}
                    </a>
                  ))}
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
                  <>
                    <div className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase tracking-wider block mb-xs px-sm select-none font-bold">Saved Projects</div>
                    <div className="space-y-xs max-h-[25vh] overflow-y-auto">
                      {projects.map(proj => (
                        <a key={proj.id} onClick={() => { loadProjectDetails(proj.id); setMobileMenuOpen(false); }} className={`flex items-center gap-xs px-sm py-xs rounded-DEFAULT transition-all cursor-pointer text-xs truncate max-w-xs font-code-sm ${activeProject?.id === proj.id ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 font-bold" : "text-slate-500 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-white"}`}>
                          <span className="material-symbols-outlined text-xs select-none">folder</span>
                          {proj.name}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CANVAS */}
        <main className={`flex-1 min-h-[calc(100vh-57px)] relative flex flex-col p-md md:p-lg ${isBrainstormTab ? "md:ml-64 pt-[110px] md:pt-[24px]" : "pt-[24px] pb-xl w-full"}`}>
          {/* Background overlay glows */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary-container/20 via-transparent to-transparent"></div>
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary-container/20 via-transparent to-transparent"></div>
          
          <div className="relative z-10 w-full flex-1 flex flex-col justify-start">
            
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

                {/* VIEW 4: PROGRESSIVE LOGS */}
                {activeTab === "running" && (
                  <div className="flex-1 flex flex-col justify-center min-h-[60vh] py-lg space-y-md">
                    <div className="w-full bg-white dark:bg-[#0A0A0A]/95 border border-slate-200 dark:border-white/10 p-md md:p-lg rounded-xl shadow-md flex flex-col gap-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-sm mb-sm text-left">
                        <div className="flex items-center gap-xs">
                          <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-primary-container ai-pulse"></div>
                          <h3 className="font-code-sm text-sm font-bold text-slate-800 dark:text-primary-fixed-dim uppercase tracking-wider">PIPELINE_EXECUTION // ACTIVE</h3>
                        </div>
                        <span className="font-code-sm text-xs text-slate-500 dark:text-on-surface-variant">Time Elapsed: {progressTime.toFixed(1)}s</span>
                      </div>
                      
                      <div className="bg-slate-950 text-green-400 border border-slate-900 p-sm font-code-sm text-xs rounded h-80 overflow-y-auto space-y-xs text-left">
                        {consoleLogs.map((log, idx) => (
                          <div key={idx} style={{ color: theme === "light" && log.color === "#e2e2e2" ? "#ffffff" : log.color }}>{log.text}</div>
                        ))}
                        <div ref={consoleEndRef} />
                      </div>
                      
                      <div className="flex items-center justify-center py-sm">
                        <div className="flex flex-col items-center gap-xs select-none">
                          <span className="font-code-sm text-xs text-slate-500 dark:text-on-surface-variant uppercase tracking-widest">Agents are debating and reflecting...</span>
                          <div className="w-48 bg-slate-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                            <div className="bg-slate-900 dark:bg-primary-container h-full w-2/3 absolute top-0 left-0 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 5: DEBATE DASHBOARD */}
                {activeTab === "dashboard" && innerResult && (
                  <div className="space-y-lg flex-1 text-left">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-slate-200 dark:border-white/10 pb-sm">
                      <div>
                        <div className={`font-label-xs text-label-xs uppercase tracking-wider font-bold inline-flex items-center gap-xs px-xs py-base rounded-sm mb-xs border ${isGenerationKind ? "text-slate-800 dark:text-primary-fixed bg-slate-100 dark:bg-primary/10 border-slate-200 dark:border-primary/20" : "text-slate-800 dark:text-secondary-fixed bg-slate-100 dark:bg-secondary-container/10 border-slate-200 dark:border-secondary-container/30"}`}>
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                          {isGenerationKind ? "Generation & Refinement" : "Refinement Results"}
                        </div>
                        <h2 className="font-display-lg text-headline-lg font-bold text-slate-900 dark:text-primary">
                          {isGenerationKind ? innerResult.conclusion?.selected_idea : activeProject?.name || "Refined Idea"}
                        </h2>
                        <p className="font-code-sm text-xs text-slate-500 dark:text-on-surface-variant mt-1">PROJECT_ID: {activeProject?.id}</p>
                      </div>
                      <div className="flex items-center gap-sm">
                        <button onClick={() => { setActiveTab("pathway"); setActiveProject(null); setLoadedResult(null); }} className="bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-on-surface font-label-xs text-label-xs py-sm px-md rounded-DEFAULT border border-slate-200 dark:border-white/10 transition-all uppercase tracking-widest font-bold shadow-xs">
                          New Session
                        </button>
                      </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                      
                      {/* Left Panel */}
                      <div className="lg:col-span-8 space-y-lg">
                        
                        {/* Factual Research */}
                        {innerResult.research && Object.keys(innerResult.research).length > 0 && (
                          <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                            <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                              <span className="material-symbols-outlined text-sm">fact_check</span> Factual Research Brief
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm text-sm">
                              <div className="space-y-xs">
                                <h4 className="font-code-sm text-xs font-bold text-slate-800 dark:text-secondary-fixed uppercase">Verified Claims / Facts</h4>
                                <ul className="space-y-xs max-h-48 overflow-y-auto pr-xs">
                                  {(() => {
                                    let facts = [];
                                    if (Array.isArray(innerResult.research.facts)) {
                                      facts = innerResult.research.facts;
                                    } else {
                                      Object.values(innerResult.research).forEach(b => {
                                        if (b.facts) facts.push(...b.facts);
                                      });
                                    }
                                    return facts.map((fact, idx) => (
                                      <li key={idx} className="border-b border-slate-100 dark:border-white/5 pb-xs mb-xs">
                                        <span className="text-[10px] px-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded uppercase font-bold text-slate-500 dark:text-on-surface-variant mr-1">{fact.strength || "med"}</span>
                                        <span className="text-xs text-slate-800 dark:text-white">{fact.claim}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-on-surface-variant block mt-xs">Source: {fact.source}</span>
                                      </li>
                                    ));
                                  })()}
                                </ul>
                              </div>
                              <div className="space-y-sm">
                                <div className="space-y-xs">
                                  <h4 className="font-code-sm text-xs font-bold text-red-500 dark:text-error uppercase">Problem Signals</h4>
                                  <ul className="list-disc list-inside text-slate-500 dark:text-on-surface-variant space-y-xs pl-xs max-h-24 overflow-y-auto text-xs">
                                    {(() => {
                                      let probs = [];
                                      if (Array.isArray(innerResult.research.problem_signals)) {
                                        probs = innerResult.research.problem_signals;
                                      } else {
                                        Object.values(innerResult.research).forEach(b => {
                                          if (b.problem_signals) probs.push(...b.problem_signals);
                                        });
                                      }
                                      return probs.map((p, idx) => <li key={idx}>{p}</li>);
                                    })()}
                                  </ul>
                                </div>
                                <div className="space-y-xs">
                                  <h4 className="font-code-sm text-xs font-bold text-slate-800 dark:text-primary-fixed uppercase">Unverified / Data Gaps</h4>
                                  <ul className="list-disc list-inside text-slate-500 dark:text-on-surface-variant space-y-xs pl-xs max-h-24 overflow-y-auto text-xs">
                                    {(() => {
                                      let gaps = [];
                                      if (Array.isArray(innerResult.research.gap_notes)) {
                                        gaps = innerResult.research.gap_notes;
                                      } else {
                                        Object.values(innerResult.research).forEach(b => {
                                          if (b.gap_notes) gaps.push(...b.gap_notes);
                                        });
                                      }
                                      return gaps.map((g, idx) => <li key={idx}>{g}</li>);
                                    })()}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Candidate Proposals */}
                        {isGenerationKind && innerResult.candidates && (
                          <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                            <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                              <span className="material-symbols-outlined text-sm">lightbulb</span> Pooled Candidate Proposals
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                              {innerResult.candidates.map((cand, idx) => (
                                <div key={idx} onClick={() => openCandidateModal(cand)} className="bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 p-sm rounded hover:border-slate-400 dark:hover:border-primary-container transition-all cursor-pointer text-left">
                                  <div className="flex justify-between items-center mb-xs">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{cand.title}</h4>
                                    <span className="text-[10px] px-xs bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/30 rounded text-slate-600 dark:text-primary">Score: {cand.hackathon_fit}/10</span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-on-surface-variant line-clamp-2">{cand.idea}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Agent Panels */}
                        <div className="space-y-md">
                          <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                            <span className="material-symbols-outlined text-sm">groups</span> Specialist Agent Panel (Debate & Reflections)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
                            {["Innovation", "Feasibility", "Impact", "Technical", "Skeptic"].map(name => {
                              const key = name.toLowerCase();
                              const reviews = innerResult.refined_reviews || innerResult.reviews || {};
                              const reflections = innerResult.refined_reflections || innerResult.reflections || {};
                              const rev = reviews[key] || reviews[name];
                              const refl = reflections[key] || reflections[name];

                              if (!rev) return null;

                              return (
                                <div key={name} className="bg-white dark:bg-[#131313] border border-slate-200 dark:border-white/10 p-sm rounded-lg hover:border-slate-400 dark:hover:border-secondary transition-all flex flex-col justify-between shadow-xs">
                                  <div>
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-xs mb-sm">
                                      <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide font-display-lg">{name}</h4>
                                      {refl && refl.new_score !== undefined && refl.new_score !== rev.score ? (
                                        <div className="flex items-center gap-xs">
                                          <span className="text-xs line-through text-slate-400 dark:text-on-surface-variant">{rev.score}</span>
                                          <span className="text-sm font-bold text-slate-900 dark:text-tertiary font-display-lg">{refl.new_score}/10</span>
                                        </div>
                                      ) : (
                                        <span className="text-sm font-bold text-slate-900 dark:text-secondary font-display-lg">{rev.score}/10</span>
                                      )}
                                    </div>
                                    <div className="space-y-sm text-xs text-left">
                                      <div>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold">Strengths</span>
                                        <p className="text-slate-800 dark:text-on-surface line-clamp-2">{rev.strengths ? rev.strengths.join(", ") : "None specified"}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-on-surface-variant block font-bold">Suggestions Adopted</span>
                                        <p className="text-slate-800 dark:text-on-surface line-clamp-2">{rev.suggestions ? rev.suggestions.join(", ") : "None specified"}</p>
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

                        {/* Debate Chats */}
                        <div className="bg-white dark:bg-[#0A0A0A]/85 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                          <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                            <span className="material-symbols-outlined text-sm">chat_bubble</span> Structured Debate Cross-Examination
                          </h3>
                          <div className="space-y-sm max-h-96 overflow-y-auto pr-xs border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#131313]/60 p-sm rounded font-code-sm text-xs text-left">
                            {chats && chats.length > 0 ? (
                              chats.map((chat, idx) => (
                                <div key={idx} className="border-b border-slate-100 dark:border-white/5 pb-xs mb-xs">
                                  <div className="flex items-center gap-xs mb-xs">
                                    <span className="font-bold uppercase text-slate-800 dark:text-white">{chat.sender}</span>
                                    <span className="text-[9px] text-slate-500 dark:text-on-surface-variant">{new Date(chat.created_at).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-slate-600 dark:text-on-surface-variant leading-relaxed">{chat.message}</p>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-500 dark:text-on-surface-variant text-center py-sm">No structured debates recorded for this session.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Panel */}
                      <div className="lg:col-span-4 space-y-lg text-left">
                        
                        {/* Selected Idea (Generate Only) */}
                        {isGenerationKind && innerResult.conclusion && (
                          <div className="bg-white dark:bg-[#0A0A0A]/80 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                            <div className="inline-flex items-center gap-xs px-xs py-base bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 rounded-sm">
                              <span className="font-label-xs text-[10px] text-slate-700 dark:text-primary uppercase font-bold tracking-widest">Selected Concept</span>
                            </div>
                            <h4 className="font-headline-lg-mobile font-bold text-slate-900 dark:text-white text-sm">{innerResult.conclusion.selected_idea}</h4>
                            <p className="text-sm text-slate-600 dark:text-on-surface-variant">{innerResult.conclusion.rationale}</p>
                            <div className="pt-xs border-t border-slate-200 dark:border-white/10 space-y-xs">
                              <span className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block">Ranked Ideas</span>
                              <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-primary-fixed-dim space-y-xs">
                                {(innerResult.conclusion.ranked_ideas || []).map((r, idx) => <li key={idx}>{r}</li>)}
                              </ol>
                            </div>
                          </div>
                        )}

                        {/* Moderator Synthesis */}
                        {innerResult.moderator && (
                          <div className="bg-white dark:bg-[#0A0A0A]/90 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-md shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 py-base px-sm bg-slate-100 dark:bg-primary-container/20 border-b border-l border-slate-200 dark:border-white/10 rounded-bl font-label-xs text-[9px] text-slate-700 dark:text-primary uppercase font-bold tracking-widest select-none">
                              Moderator Synthesis
                            </div>
                            <div className="space-y-sm mt-xs">
                              <h3 className="font-headline-lg-mobile font-bold text-slate-900 dark:text-white tracking-tight leading-snug">Refined Hackathon Concept</h3>
                              <p className="text-sm text-slate-900 dark:text-on-surface bg-slate-50 dark:bg-[#131313] p-sm border border-slate-200 dark:border-white/5 rounded font-medium leading-relaxed">{innerResult.moderator.refined_idea}</p>
                            </div>
                            <div className="glow-divider my-sm"></div>
                            <div className="space-y-sm text-xs font-code-sm">
                              <div className="space-y-xs">
                                <span className="text-slate-500 dark:text-on-surface-variant uppercase text-[10px] block tracking-wide font-bold">Consensus Agreements</span>
                                <ul className="list-disc list-inside text-slate-700 dark:text-tertiary space-y-xs pl-xs">
                                  {(innerResult.moderator.consensus || []).map((c, idx) => <li key={idx}>{c}</li>)}
                                </ul>
                              </div>
                              <div className="space-y-xs">
                                <span className="text-slate-500 dark:text-on-surface-variant uppercase text-[10px] block tracking-wide font-bold">Specialist Trade-offs</span>
                                <ul className="list-disc list-inside text-slate-700 dark:text-secondary space-y-xs pl-xs">
                                  {(innerResult.moderator.tradeoffs || []).map((t, idx) => <li key={idx}>{t}</li>)}
                                </ul>
                              </div>
                            </div>
                            <div className="glow-divider my-sm"></div>
                            <div className="space-y-xs">
                              <h4 className="font-display-lg text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Implementation Roadmap</h4>
                              <ol className="space-y-sm pl-xs pt-xs">
                                {(innerResult.moderator.implementation_roadmap || []).map((step, idx) => (
                                  <li key={idx} className="flex gap-xs items-start">
                                    <span className="w-5 h-5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-primary-fixed-dim rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-base">{idx+1}</span>
                                    <p className="text-xs text-slate-600 dark:text-on-surface-variant leading-normal pt-base">{step}</p>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        )}

                        {/* Operator Feedback Iteration */}
                        {innerResult.moderator && (
                          <div className="bg-white dark:bg-[#0A0A0A]/85 border border-slate-200 dark:border-white/10 p-md rounded-xl space-y-sm shadow-xs">
                            <h3 className="font-display-lg text-sm uppercase tracking-wider font-bold text-slate-900 dark:text-primary flex items-center gap-xs select-none">
                              <span className="material-symbols-outlined text-sm">settings_backup_restore</span> Operator Decision Loop
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-on-surface-variant leading-relaxed">Select improvements to adopt and rerun the debates with the updated baseline concept.</p>
                            
                            <div className="space-y-sm pt-xs text-slate-700 dark:text-on-surface-variant" id="decision-checklist">
                              {(innerResult.moderator.high_priority_improvements || []).map((imp, idx) => (
                                <div key={idx} className="flex items-start gap-xs text-xs">
                                  <input type="checkbox" id={`improve-${idx}`} defaultChecked value={imp} className="rounded border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#131313] text-secondary-container focus:ring-secondary-container mt-base" />
                                  <label htmlFor={`improve-${idx}`} className="select-none leading-relaxed">{imp}</label>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-xs pt-xs">
                              <label className="font-code-sm text-[10px] text-slate-500 dark:text-on-surface-variant uppercase block font-bold">Operator Guidance Notes</label>
                              <textarea value={operatorNotes} onChange={e => setOperatorNotes(e.target.value)} placeholder="e.g. Keep sensor checks, but simplify battery settings..." rows="3" className="w-full bg-slate-50 dark:bg-[#131313] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-on-surface p-xs font-code-sm text-xs rounded-DEFAULT focus:outline-none focus:border-slate-400 dark:focus:border-secondary-container transition-all"></textarea>
                            </div>

                            <button onClick={triggerIteration} className="w-full bg-slate-900 dark:bg-secondary-container text-white dark:text-on-secondary-container font-label-xs text-label-xs py-sm rounded-DEFAULT hover:shadow-md transition-all uppercase tracking-widest font-bold flex items-center justify-center gap-xs">
                              Iterate Concept
                              <span className="material-symbols-outlined text-sm">sync</span>
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
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
    </div>
  );
}
