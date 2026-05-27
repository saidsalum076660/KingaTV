import React, { useState, useEffect } from "react";
import { Tv, Shield, Mail, Phone, User, Play, AlertCircle, Sparkles, ChevronRight, Eye, EyeOff, Lock, Crown } from "lucide-react";
import { UserProfile, UserStatus } from "./types";
import { localAuth, localDb } from "./firebase";
import UserApp from "./components/UserApp";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isRegister, setIsRegister] = useState(false); // Toggle between SignUp (true) and SignIn (false) - default false to match the login photo immediately
  
  // Login input states
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [appLogo, setAppLogo] = useState<string>("");

  // Load current user session on mount
  useEffect(() => {
    const handleStorageUpdate = () => {
      const active = localAuth.getCurrentUser();
      setCurrentUser(active);
      const config = localDb.getGlobalConfig();
      setAppLogo(config.appLogo || "");
    };

    handleStorageUpdate();
    const unsubscribe = localDb.onUpdate(handleStorageUpdate);

    // Dynamic clean initial background database synchronization with Supabase
    let syncInterval: any = null;
    import("./supabase").then(m => {
      m.syncDatabaseWithSupabase();
      
      // Setup periodic background database synchronization (every 15 seconds)
      syncInterval = setInterval(() => {
        m.syncDatabaseWithSupabase();
      }, 15000);
    }).catch(e => console.warn("Could not load supabase dynamically on mount:", e));

    return () => {
      unsubscribe();
      if (syncInterval) clearInterval(syncInterval);
    };
  }, []);

  // Authentication handlers
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setAuthError("Tafadhali jaza barua pepe (Email) yako.");
      return;
    }

    if (!passwordInput) {
      setAuthError("Tafadhali jaza nenosiri lako.");
      return;
    }

    try {
      if (isRegister) {
        if (!firstNameInput.trim() || !lastNameInput.trim() || !phoneInput) {
          setAuthError("Tafadhali jaza majina yako na namba ya simu zote.");
          return;
        }
        const fullName = `${firstNameInput.trim()} ${lastNameInput.trim()}`;
        // Register but do NOT do autoLogin (pass autoLogin as false)
        localAuth.register(fullName, trimmedEmail, phoneInput, UserStatus.PENDING, passwordInput, false);
        
        // Success: Redirect back to login screen
        setAuthSuccessMsg("Usajili umefanikiwa! Sasa tafadhali ingia hapa chini kwa kutumia barua pepe na nenosiri lako.");
        setIsRegister(false);
        setPasswordInput("");
      } else {
        const user = localAuth.login(trimmedEmail, passwordInput);
        setCurrentUser(user);
        
        // Auto routing to admin if login matches admin account
        const normalized = trimmedEmail.toLowerCase();
        if (normalized === "saidsalum076660@gmail.com" || normalized === "saidsalum076660@gmailo.com" || normalized === "admin@kingatv.com") {
          setIsAdminMode(true);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Kosa la kiufundi limetokea. Jaribu tena.");
    }
  };

  const handleLogout = () => {
    localAuth.logout();
    setCurrentUser(null);
    setIsAdminMode(false);
    resetAuthForm();
  };

  const resetAuthForm = () => {
    setEmailInput("");
    setNameInput("");
    setFirstNameInput("");
    setLastNameInput("");
    setPhoneInput("");
    setPasswordInput("");
    setShowPassword(false);
    setAuthError(null);
  };

  // Helper check to check if logged in user is authorized to open admin portal
  const checkIsAdmin = (user: UserProfile | null) => {
    if (!user) return false;
    const normalized = user.email.toLowerCase().trim();
    return normalized === "saidsalum076660@gmail.com" || 
           normalized === "saidsalum076660@gmailo.com" || 
           normalized === "admin@kingatv.com";
  };

  const isUserAdmin = checkIsAdmin(currentUser);

  // 1. ADMIN MODE CONTROLS
  if (currentUser && isAdminMode && isUserAdmin) {
    return (
      <div className="bg-slate-950 min-h-screen">
        <AdminPanel onClose={() => setIsAdminMode(false)} />
      </div>
    );
  }

  // 2. LOGGED IN USER EXPERIENCE
  if (currentUser) {
    return (
      <div className="bg-slate-950 min-h-screen font-sans antialiased text-slate-100 flex flex-col justify-between">
        <UserApp 
          user={currentUser} 
          onLogout={handleLogout} 
          onOpenAdmin={() => setIsAdminMode(true)}
          isAdmin={isUserAdmin}
        />
      </div>
    );
  }

  // 3. SECURE AUTHENTICATION SCREEN (LOGIN / REGISTER) - HIGH-FIDELITY MATCH TO UPLOADED PHOTO
  return (
    <div id="auth_portal_wrapper" className="min-h-screen w-full bg-[#0a0e1a] text-slate-100 font-sans antialiased flex flex-col items-center justify-between p-6 relative overflow-hidden">
      
      {/* Space & Ambient Atmosphere Backdrop */}
      <div className="absolute inset-0 bg-[#070a14] select-none pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[45vh] bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] m-auto h-[350px] bg-blue-500/5 rounded-full pointer-events-none blur-[120px]" />
      
      {/* Spacer or empty div at the top to balance vertical layout */}
      <div className="h-6 sm:h-12" />
 
      {/* Main centered core layout */}
      <div className="w-full max-w-md flex flex-col items-center z-10 relative">
        
        {/* Golden outline crown inside rounded-square badge with glow */}
        <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-[28px] bg-[#0c1424] border-2 border-amber-500/40 flex items-center justify-center mb-4 relative shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent rounded-[26px] pointer-events-none" />
          <Crown className="w-11 h-11 sm:w-12 sm:h-12 text-[#e2b04c] stroke-[1.5]" />
        </div>
 
        {/* Branding Typography */}
        <h1 className="text-3xl sm:text-[38px] font-black tracking-wide text-white flex items-center justify-center gap-2 font-sans select-none">
          <span className="text-white drop-shadow-[0_1px_8px_rgba(255,255,255,0.15)] uppercase">KINGA</span>
          <span className="text-[#3b82f6] font-extrabold uppercase drop-shadow-[0_1px_8px_rgba(59,130,246,0.40)]">TV</span>
        </h1>
        <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.5em] text-slate-400 uppercase mt-2 mb-8 text-center select-none opacity-85">
          {isRegister ? "J I S A J I L I   S A S A" : "K A R I B U T E N A"}
        </p>
 
        {/* Crisp Card Box Container */}
        <div className="w-full bg-[#0c1424] border border-[#1b253b] rounded-[28px] p-6 sm:p-9 shadow-2xl relative overflow-hidden">
          
          {/* Subtle glowing edges inside card */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl select-none pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl select-none pointer-events-none" />
 
          {/* Auth Error Display */}
          {authError && (
            <div id="auth_error_alert" className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl flex items-start gap-2.5 text-red-300 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400 animate-bounce" />
              <p className="leading-relaxed">{authError}</p>
            </div>
          )}
 
          {/* Auth Success Display */}
          {authSuccessMsg && (
            <div id="auth_success_alert" className="p-3.5 bg-emerald-950/40 border border-emerald-800/55 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs mb-4 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-ping"></span>
              <p className="leading-relaxed font-bold">{authSuccessMsg}</p>
            </div>
          )}
 
          {/* Authentication Input Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            
            {isRegister && (
              <>
                {/* JINA LA KWANZA and JINA LA PILI */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">JINA LA KWANZA</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <User className="w-[18px] h-[18px]" />
                      </span>
                      <input
                        id="register_first_name"
                        type="text"
                        required
                        placeholder="Jina la Kwan"
                        value={firstNameInput}
                        onChange={(e) => setFirstNameInput(e.target.value)}
                        className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-all placeholder-slate-600 font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">JINA LA PILI</label>
                    <input
                      id="register_last_name"
                      type="text"
                      required
                      placeholder="Jina la Pili"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 px-4 text-xs text-white focus:outline-none transition-all placeholder-slate-600 font-medium"
                    />
                  </div>
                </div>
 
                {/* Phone Number */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">NAMBA YA SIMU</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Phone className="w-[18px] h-[18px]" />
                    </span>
                    <input
                      id="register_phone"
                      type="tel"
                      required
                      placeholder="+255..."
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-all placeholder-slate-600 font-medium"
                    />
                  </div>
                </div>
              </>
            )}
 
            {/* Email Address */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">EMAIL</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="w-[18px] h-[18px]" />
                </span>
                <input
                  id="auth_email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none transition-all placeholder-slate-600 font-medium"
                />
              </div>
            </div>
 
            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">PASSWORD</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-[18px] h-[18px]" />
                </span>
                <input
                  id="auth_password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-11 pr-11 text-xs text-white focus:outline-none transition-all placeholder-slate-600 font-medium tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>
 
            {/* Remember Me and Forgot Password links (In login mode) */}
            {!isRegister && (
              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 select-none text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#070b13] border-[#1b253b] text-[#3b82f6] focus:ring-0 cursor-pointer"
                  />
                  <span>Nikumbuke</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => alert("Tafadhali wasiliana na msimamizi kupitia WhatsApp ili kuweka upya nenosiri lako.")}
                  className="text-blue-500 hover:underline hover:text-blue-400 font-semibold cursor-pointer"
                >
                  Umesahau Password?
                </button>
              </div>
            )}
 
            {/* Core Action Button (INGIA / JISAJILI) */}
            <button
              id="auth_submit_btn"
              type="submit"
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 font-black text-xs sm:text-sm text-white uppercase rounded-xl tracking-widest shadow-[0_4px_24px_rgba(59,130,246,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-400/20"
            >
              {isRegister ? "JISAJILI" : "INGIA"}
            </button>
          </form>
 
          {/* Form Toggle Options */}
          <div className="pt-6 mt-4 border-t border-slate-800/40 text-center text-xs">
            {isRegister ? (
              <p className="text-slate-400 select-none">
                Una akaunti?{" "}
                <button
                  id="toggle_login_btn"
                  onClick={() => {
                    setIsRegister(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="text-blue-500 font-black hover:underline cursor-pointer ml-1"
                >
                  Ingia hapa
                </button>
              </p>
            ) : (
              <p className="text-slate-400 select-none font-medium">
                Huna akaunti?{" "}
                <button
                  id="toggle_register_btn"
                  onClick={() => {
                    setIsRegister(true);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="text-blue-500 font-black hover:underline cursor-pointer ml-1"
                >
                  Jisajili sasa
                </button>
              </p>
            )}
          </div>
 
        </div>
      </div>
 
      {/* Footer copyright */}
      <div className="py-6 text-center select-none z-10 relative">
        <p className="text-[9px] sm:text-[10px] text-slate-500/85 tracking-[0.16em] font-medium uppercase font-sans">
          © 2026 KINGA TV • ENTERTAINMENT UNLIMITED
        </p>
      </div>
 
    </div>
  );
}
