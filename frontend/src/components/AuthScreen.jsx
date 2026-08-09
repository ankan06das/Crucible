import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { Button, Card, Field, inputCls } from "./ui";
import { GoogleLogin } from '@react-oauth/google';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function AuthScreen() {
  const {
    authError,
    authMode,
    handleLogin,
    handleRegister,
    handleGoogleSuccess,
    handleGoogleRegister,
    setAuthMode,
  } = useAppContext();

  // Local controlled inputs
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Real-time validation states
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null = unknown, true/false
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Password checks
  const passLength = password.length >= 8;
  const passUpper = /[A-Z]/.test(password);
  const passNumber = /\d/.test(password);
  const passValid = passLength && passUpper && passNumber;

  // Debounced availability check
  useEffect(() => {
    if (authMode === "login") return; // No checks on login

    const checkAvailability = async () => {
      if (!username && !email) {
        setUsernameAvailable(null);
        setEmailAvailable(null);
        return;
      }
      
      setCheckingAvailability(true);
      try {
        const query = new URLSearchParams();
        if (username) query.append("username", username);
        if (email && authMode === "register") query.append("email", email);

        const res = await fetch(`${API_BASE}/api/check-availability?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (username) setUsernameAvailable(data.username_available);
          if (email && authMode === "register") setEmailAvailable(data.email_available);
        }
      } catch (err) {
        console.error("Availability check failed");
      } finally {
        setCheckingAvailability(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkAvailability();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, email, authMode]);

  const onFormSubmit = (e) => {
    // Inject the values into the event target if needed by App.js handlers
    // since we're using controlled inputs now, we still let standard forms submit for App.jsx compatibility,
    // but the inputs already have the names attached.
    
    // Prevent submit if validation fails in register mode
    if (authMode === "register" || authMode === "google_setup") {
      if (usernameAvailable === false) {
        e.preventDefault();
        return; // UI already shows error
      }
    }
    
    if (authMode === "register" && !passValid) {
       e.preventDefault();
       return; // App.js catches this too, but we can stop it early
    }

    if (authMode === "login") return handleLogin(e);
    if (authMode === "register") return handleRegister(e);
    if (authMode === "google_setup") return handleGoogleRegister(e);
  };

  const InputFeedback = ({ isValid, checking, errorMsg, successMsg }) => {
    if (checking) return <div className="mt-1 text-xs text-indigo-400 animate-pulse">Checking...</div>;
    if (isValid === false) return <div className="mt-1 text-xs text-rose-400 font-medium">{errorMsg}</div>;
    if (isValid === true) return <div className="mt-1 text-xs text-emerald-400 font-medium">{successMsg}</div>;
    return null;
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
      
      {/* Left Side: Hero / Landing Content (hidden on small screens) */}
      <div className="relative hidden w-0 flex-1 lg:block overflow-hidden">
        {/* Animated gradient background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        
        {/* Floating abstract glowing orbs */}
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-indigo-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[140px] mix-blend-screen pointer-events-none"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-center h-full px-16 xl:px-24">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-white/20">
               <img src="/favicon.png" className="w-8 h-8 filter drop-shadow-md" alt="Crucible icon" />
            </div>
            <span className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase">Crucible</span>
          </div>
          
          <h1 className="text-5xl xl:text-7xl font-extrabold tracking-tight text-white mb-8 leading-[1.1]">
            Forge brilliant <br/>
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">ideas together.</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-sm opacity-60"></div>
            </span>
          </h1>
          
          <p className="text-lg xl:text-xl text-slate-300 max-w-2xl leading-relaxed mb-12 border-l-4 border-indigo-500/50 pl-6 py-2 bg-slate-900/20 backdrop-blur-sm rounded-r-lg">
            The intelligent brainstorming platform powered by multi-agent debates. 
            Bring your hackathon MVPs to life through rigorous, structured AI feedback.
          </p>

          <div className="flex flex-wrap items-center gap-8 text-sm font-medium text-slate-300">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              Rapid Iteration
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              AI Debate Panel
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Container */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-8 lg:flex-none lg:w-[500px] xl:w-[600px] relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] bg-slate-950/80 backdrop-blur-3xl border-l border-white/5">
        
        {/* Mobile background (fallback since left side is hidden) */}
        <div className="absolute inset-0 bg-slate-950 lg:hidden -z-10">
           <div className="absolute top-0 left-0 w-full h-full bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          
          {/* Mobile Logo Header */}
          <div className="flex items-center gap-3 mb-10 lg:hidden justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
               <img src="/favicon.png" className="w-full h-full" alt="Crucible logo" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Crucible.</h2>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
              {authMode === "login" && "Welcome back"}
              {authMode === "register" && "Create an account"}
              {authMode === "google_setup" && "Almost there!"}
            </h2>
            <p className="text-sm text-slate-400">
              {authMode === "login" && "Sign in to continue your brainstorming sessions."}
              {authMode === "register" && "Sign up to start forging your ideas."}
              {authMode === "google_setup" && "Choose a unique username for your profile."}
            </p>
          </div>

          <form onSubmit={onFormSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input 
                className={`${inputCls} bg-slate-900 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-white placeholder-slate-600 transition-colors ${usernameAvailable === false ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' : ''}`} 
                type="text" 
                name="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                placeholder="johndoe" 
                autoComplete="username" 
              />
              {(authMode === "register" || authMode === "google_setup") && username.length > 0 && (
                 <InputFeedback checking={checkingAvailability} isValid={usernameAvailable} errorMsg="Username is already taken" successMsg="Username is available" />
              )}
            </div>
            
            {authMode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input 
                  className={`${inputCls} bg-slate-900 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-white placeholder-slate-600 transition-colors ${emailAvailable === false ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' : ''}`} 
                  type="email" 
                  name="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  placeholder="you@example.com" 
                  autoComplete="email" 
                />
                {email.length > 5 && email.includes("@") && (
                   <InputFeedback checking={checkingAvailability} isValid={emailAvailable} errorMsg="Email is already registered" successMsg="Email is valid and available" />
                )}
              </div>
            )}
            
            {authMode !== "google_setup" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <input 
                  className={`${inputCls} bg-slate-900 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-white placeholder-slate-600 transition-colors`} 
                  type="password" 
                  name="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  placeholder="••••••••" 
                  autoComplete="current-password" 
                />
                {authMode === "register" && password.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex gap-1 mb-2">
                       <div className={`h-1.5 w-1/3 rounded-full transition-colors ${passLength ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                       <div className={`h-1.5 w-1/3 rounded-full transition-colors ${passUpper ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                       <div className={`h-1.5 w-1/3 rounded-full transition-colors ${passNumber ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                    </div>
                    <p className={`text-xs ${passLength ? 'text-emerald-400' : 'text-slate-500'}`}>✓ At least 8 characters</p>
                    <p className={`text-xs ${passUpper ? 'text-emerald-400' : 'text-slate-500'}`}>✓ Contains uppercase letter</p>
                    <p className={`text-xs ${passNumber ? 'text-emerald-400' : 'text-slate-500'}`}>✓ Contains number</p>
                  </div>
                )}
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {authError}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={authMode === "register" && (!passValid || usernameAvailable === false || emailAvailable === false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-3 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all font-medium text-base"
            >
              {authMode === "login" && "Sign in"}
              {authMode === "register" && "Create account"}
              {authMode === "google_setup" && "Complete Sign Up"}
            </Button>
          </form>

          {authMode !== "google_setup" && (
            <div className="mt-8">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider font-semibold">Or continue with</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <div className="mt-6 flex justify-center hover:scale-[1.02] transition-transform">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  shape="circle"
                  text={authMode === "login" ? "signin_with" : "signup_with"}
                  size="large"
                />
              </div>
            </div>
          )}

          {authMode !== "google_setup" && (
            <div className="mt-10 text-center text-sm text-slate-400">
              {authMode === "login" ? (
                <>
                  New to Crucible?{" "}
                  <button onClick={() => setAuthMode("register")} className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-1">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setAuthMode("login")} className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-1">
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
