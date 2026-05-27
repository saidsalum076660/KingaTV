import React, { useState, useEffect } from "react";
import { 
  Tv, Play, Settings, Users, Plus, Edit2, Trash2, Shield, Calendar, 
  CheckCircle, Ban, Bell, Key, RefreshCw, Layers, Check, ExternalLink, AlertCircle, Save, Timer
} from "lucide-react";
import { Channel, SlideshowItem, Match, UserProfile, UserStatus, MatchStatus, StreamType, SystemNotification } from "../types";
import { localDb } from "../firebase";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "channels" | "slideshow" | "matches" | "users" | "notifications">("dashboard");
  
  // Storage states synced to localDb
  const [channels, setChannels] = useState<Channel[]>([]);
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [globalToken, setGlobalToken] = useState("");
  const [appLogoInput, setAppLogoInput] = useState("");
  const [supabaseUrlInput, setSupabaseUrlInput] = useState("");
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState("");
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Load Admin Data on Component Mount
  useEffect(() => {
    const loadData = () => {
      setChannels(localDb.getChannels());
      setSlides(localDb.getSlideshow());
      setMatches(localDb.getMatches());
      
      // Sort users: non-admin (regular) users on top sorted by creation date descending, admins at the bottom
      const loadedUsers = localDb.getUsers();
      const sortedUsers = [...loadedUsers].sort((a, b) => {
        const emailA = (a.email || "").toLowerCase().trim();
        const emailB = (b.email || "").toLowerCase().trim();
        
        const isAAdmin = emailA === "saidsalum076660@gmail.com";
        const isBAdmin = emailB === "saidsalum076660@gmail.com";

        if (isAAdmin && !isBAdmin) return 1;    // Admin goes to bottom
        if (!isAAdmin && isBAdmin) return -1;   // Regular user stays on top
        
        // Same category: sort by creation date descending (newest on top)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setUsers(sortedUsers);
      const config = localDb.getGlobalConfig();
      setGlobalToken(config.globalToken);
      setAppLogoInput(config.appLogo || "");
      setSupabaseUrlInput(config.supabaseUrl || "");
      setSupabaseAnonKeyInput(config.supabaseAnonKey || "");
      setSlideSpeed(config.slideshowIntervalSeconds || 5);
      setNotifications(localDb.getNotifications());
    };

    loadData();
    // Subscribe to DB changes
    const unsubscribe = localDb.onUpdate(loadData);
    return () => unsubscribe();
  }, []);

  // --- FORM STATES FOR CREATING/EDITING ITEMS ---
  
  // Channel Form States
  const [channelEditId, setChannelEditId] = useState<string | null>(null);
  const [chanName, setChanName] = useState("");
  const [chanLogo, setChanLogo] = useState("");
  const [chanPoster, setChanPoster] = useState("");
  const [chanDesc, setChanDesc] = useState("");
  const [chanCategory, setChanCategory] = useState("Sports");
  const [chanOrder, setChanOrder] = useState(1);
  const [chanStreamType, setChanStreamType] = useState<StreamType>("hls");
  const [chanStreamUrl, setChanStreamUrl] = useState("");
  const [chanKeyKid, setChanKeyKid] = useState("");
  const [chanKeyKey, setChanKeyKey] = useState("");
  const [chanUseGlobalToken, setChanUseGlobalToken] = useState(true);

  // Slideshow Form States
  const [slideEditId, setSlideEditId] = useState<string | null>(null);
  const [slideImage, setSlideImage] = useState("");
  const [slideTitle, setSlideTitle] = useState("");
  const [slideMatchInfo, setSlideMatchInfo] = useState("");
  const [slideChannelId, setSlideChannelId] = useState("");
  const [slideOrder, setSlideOrder] = useState(1);
  const [slideSpeed, setSlideSpeed] = useState(5);

  // Match Form States
  const [matchEditId, setMatchEditId] = useState<string | null>(null);
  const [matchTeamA, setMatchTeamA] = useState("");
  const [matchTeamALogo, setMatchTeamALogo] = useState("");
  const [matchTeamB, setMatchTeamB] = useState("");
  const [matchTeamBLogo, setMatchTeamBLogo] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchChannelId, setMatchChannelId] = useState("");
  const [matchIsFeatured, setMatchIsFeatured] = useState(true);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("LIVE");
  const [matchScore, setMatchScore] = useState("");

  // Notification States
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  // Subscription Edit States
  const [userExpiryUid, setUserExpiryUid] = useState<string | null>(null);
  const [userExpiryDate, setUserExpiryDate] = useState("");

  // --- ACTIONS HANDLERS ---

  // Global Config Token & Logo Saving
  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.saveGlobalConfig({
      globalToken,
      appLogo: appLogoInput,
      supabaseUrl: supabaseUrlInput,
      supabaseAnonKey: supabaseAnonKeyInput,
      slideshowIntervalSeconds: Number(slideSpeed),
      updatedAt: new Date().toISOString()
    });
    alert("Mipangilio imehifadhiwa kwa ufanisi!");

    // Attempt automatic sync right after saving connection details
    if (supabaseUrlInput && supabaseAnonKeyInput) {
      import("../supabase").then(m => {
        m.syncDatabaseWithSupabase().then(success => {
          if (success) {
            console.log("Supabase synced successfully after saving configuring!");
          }
        });
      });
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrlInput || !supabaseAnonKeyInput) {
      alert("Tafadhali jaza URL na Anon Key kwanza ili kupima muunganisho.");
      return;
    }
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const { testSupabaseConnection } = await import("../supabase");
      const res = await testSupabaseConnection(supabaseUrlInput, supabaseAnonKeyInput);
      setSupabaseTestResult(res);
      if (res.success) {
        const { syncDatabaseWithSupabase } = await import("../supabase");
        await syncDatabaseWithSupabase();
      }
    } catch (err: any) {
      setSupabaseTestResult({ success: false, message: `Hitilafu ya kupima: ${err.message || err}` });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleTriggerManualSync = async () => {
    setIsTestingSupabase(true);
    try {
      const { syncDatabaseWithSupabase } = await import("../supabase");
      const success = await syncDatabaseWithSupabase();
      if (success) {
        alert("Sakata mzozo na Supabase imekamilika kwa mafanikio! Data zote zimesawazishwa.");
      } else {
        alert("Data Sync imeshindwa! Tafadhali hakikisha URL & Key ni sahihi na umetengeneza jedwali kule Supabase SQL.");
      }
    } catch (err: any) {
      alert(`Hitilafu ya Sakata: ${err.message || err}`);
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Channels Management Logic
  const handleSaveChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chanName || !chanStreamUrl) {
      alert("Tafadhali jaza jina na link ya kusambaza stream.");
      return;
    }

    const updatedChannels = [...channels];
    const itemData: Channel = {
      id: channelEditId || "CH-" + Math.random().toString(36).substring(2, 10),
      name: chanName,
      logo: chanLogo || chanPoster || "https://images.unsplash.com/photo-1540747737956-378725752c03?w=120&q=80",
      poster: chanPoster || "https://images.unsplash.com/photo-1540747737956-378725752c03?w=800&q=80",
      description: chanDesc,
      category: chanCategory,
      order: Number(chanOrder),
      streamType: chanStreamType,
      streamUrl: chanStreamUrl,
      clearKeyKid: chanKeyKid,
      clearKeyKey: chanKeyKey,
      useGlobalToken: chanUseGlobalToken
    };

    if (channelEditId) {
      const idx = updatedChannels.findIndex(c => c.id === channelEditId);
      if (idx !== -1) updatedChannels[idx] = itemData;
    } else {
      updatedChannels.push(itemData);
    }

    localDb.saveChannels(updatedChannels);
    resetChannelForm();
    alert("Kituo kimehifadhiwa!");
  };

  const handleEditChannel = (c: Channel) => {
    setChannelEditId(c.id);
    setChanName(c.name);
    setChanLogo(c.logo);
    setChanPoster(c.poster);
    setChanDesc(c.description);
    setChanCategory(c.category);
    setChanOrder(c.order);
    setChanStreamType(c.streamType);
    setChanStreamUrl(c.streamUrl);
    setChanKeyKid(c.clearKeyKid || "");
    setChanKeyKey(c.clearKeyKey || "");
    setChanUseGlobalToken(c.useGlobalToken);
  };

  const handleDeleteChannel = (id: string) => {
    if (confirm("Je, una uhakika unataka kufuta Kituo hiki kabisa? Kitendo hiki kitaondoa kituo hiki kwenye simu zote na kwenye mfumo wa wingu (Supabase)!")) {
      localDb.deleteChannel(id);
      alert("Kituo kimefutwa kikamilifu!");
    }
  };

  const resetChannelForm = () => {
    setChannelEditId(null);
    setChanName("");
    setChanLogo("");
    setChanPoster("");
    setChanDesc("");
    setChanCategory("Sports");
    setChanOrder(1);
    setChanStreamType("hls");
    setChanStreamUrl("");
    setChanKeyKid("");
    setChanKeyKey("");
    setChanUseGlobalToken(true);
  };

  // Slideshow Management Logic
  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideImage) {
      alert("Tafadhali jaza Link ya Picha ya Slideshow!");
      return;
    }

    const updatedSlides = [...slides];
    const itemData: SlideshowItem = {
      id: slideEditId || "SL-" + Math.random().toString(36).substring(2, 10),
      image: slideImage.trim(),
      title: "",
      matchInfo: "",
      channelId: "",
      order: Number(slideOrder) || 1
    };

    if (slideEditId) {
      const idx = updatedSlides.findIndex(s => s.id === slideEditId);
      if (idx !== -1) updatedSlides[idx] = itemData;
    } else {
      updatedSlides.push(itemData);
    }

    localDb.saveSlideshow(updatedSlides);
    resetSlideForm();
    alert("Slide imehifadhiwa!");
  };

  const handleEditSlide = (s: SlideshowItem) => {
    setSlideEditId(s.id);
    setSlideImage(s.image);
    setSlideOrder(s.order);
  };

  const handleDeleteSlide = (id: string) => {
    if (confirm("Je, una uhakika unataka kufuta slide hii kabisa? Itatolewa kwenye simu zote na kwenye mfumo wa wingu (Supabase)!")) {
      localDb.deleteSlideshow(id);
      alert("Slide imefutwa kikamilifu!");
    }
  };

  const resetSlideForm = () => {
    setSlideEditId(null);
    setSlideImage("");
    setSlideOrder(1);
  };

  const handleSaveSlideSpeed = () => {
    if (!slideSpeed || slideSpeed < 1) {
      alert("Tafadhali weka muda sahihi (kuanzia sekunde 1)!");
      return;
    }
    const config = localDb.getGlobalConfig();
    const updatedConfig = {
      ...config,
      slideshowIntervalSeconds: Number(slideSpeed),
      updatedAt: new Date().toISOString()
    };
    localDb.saveGlobalConfig(updatedConfig);
    alert(`Muda wa kutembea picha umehifadhiwa: sekunde ${slideSpeed}!`);
  };

  // Matches Management Logic
  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchTeamA || !matchTeamB || !matchTime || !matchDate) {
      alert("Tafadhali jaza timu zote, tarehe na wakati.");
      return;
    }

    const updatedMatches = [...matches];
    const itemData: Match = {
      id: matchEditId || "MC-" + Math.random().toString(36).substring(2, 10),
      teamAName: matchTeamA,
      teamALogo: matchTeamALogo || "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=80&q=80",
      teamBName: matchTeamB,
      teamBLogo: matchTeamBLogo || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=80&q=80",
      time: matchTime,
      date: matchDate,
      channelId: matchChannelId || undefined,
      isFeatured: matchIsFeatured,
      status: matchStatus,
      score: matchScore || undefined
    };

    if (matchEditId) {
      const idx = updatedMatches.findIndex(m => m.id === matchEditId);
      if (idx !== -1) updatedMatches[idx] = itemData;
    } else {
      updatedMatches.push(itemData);
    }

    localDb.saveMatches(updatedMatches);
    resetMatchForm();
    alert("Mechi imehifadhiwa kwa ufanisi!");
  };

  const handleEditMatch = (m: Match) => {
    setMatchEditId(m.id);
    setMatchTeamA(m.teamAName);
    setMatchTeamALogo(m.teamALogo);
    setMatchTeamB(m.teamBName);
    setMatchTeamBLogo(m.teamBLogo);
    setMatchTime(m.time);
    setMatchDate(m.date);
    setMatchChannelId(m.channelId || "");
    setMatchIsFeatured(m.isFeatured);
    setMatchStatus(m.status);
    setMatchScore(m.score || "");
  };

  const handleDeleteMatch = (id: string) => {
    if (confirm("Je, una uhakika unataka kufuta mechi hii kabisa? Itatolewa kwenye simu zote na kwenye mfumo wa wingu (Supabase)!")) {
      localDb.deleteMatch(id);
      alert("Mechi imefutwa kikamilifu!");
    }
  };

  const resetMatchForm = () => {
    setMatchEditId(null);
    setMatchTeamA("");
    setMatchTeamALogo("");
    setMatchTeamB("");
    setMatchTeamBLogo("");
    setMatchTime("");
    setMatchDate("");
    setMatchChannelId(channels[0]?.id || "");
    setMatchIsFeatured(true);
    setMatchStatus("LIVE");
    setMatchScore("");
  };

  // User Management Actions
  const isSelfUser = (uid: string) => {
    try {
      const active = localStorage.getItem("kingatv_active_user");
      if (active) {
        return JSON.parse(active).uid === uid;
      }
    } catch (_) {}
    return false;
  };

  const getLoggedInUser = (): UserProfile | null => {
    try {
      const active = localStorage.getItem("kingatv_active_user");
      return active ? JSON.parse(active) : null;
    } catch (_) {}
    return null;
  };

  const isSuperAdmin = (email: string) => {
    return email.toLowerCase().trim() === "saidsalum076660@gmail.com";
  };

  const isAdminUser = (email: string) => {
    const norm = email.toLowerCase().trim();
    return norm === "saidsalum076660@gmail.com";
  };

  const handleApprovePayment = (uid: string) => {
    // Approve: set user ACTIVE, and give them subscription expiry
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    localDb.updateUserProfile(uid, {
      status: UserStatus.ACTIVE,
      approvedByAdmin: true,
      subscriptionExpiresAt: oneMonthFromNow.toISOString()
    });
    alert("ID ya Mtumiaji imeidhinishwa kuwa ACTIVE kwa mwezi mmoja!");
  };

  const handleBlockUser = (uid: string) => {
    const currentUser = getLoggedInUser();
    if (!currentUser) return;

    if (isSelfUser(uid)) {
      alert("Huwezi kujiblock wewe mwenyewe!");
      return;
    }

    const targetUser = users.find(u => u.uid === uid);
    if (targetUser) {
      if (isSuperAdmin(targetUser.email)) {
        alert("Huwezi kumzuia (Block) Admin Mkuu wa Kinga TV (saidsalum076660@gmail.com)!");
        return;
      }
      if (!isSuperAdmin(currentUser.email) && isAdminUser(targetUser.email)) {
        alert("Huwezi kumzuia (Block) msimamizi mwenzako! Ni Admin Mkuu tu mwenye mamlaka hayo.");
        return;
      }
    }

    localDb.updateUserProfile(uid, {
      status: UserStatus.BLOCKED
    });
    alert("Mtumiaji amezuiwa kuingia!");
  };

  const handleUnblockUser = (uid: string) => {
    localDb.updateUserProfile(uid, {
      status: UserStatus.ACTIVE
    });
    alert("Mtumiaji amefunguliwa na kuwa ACTIVE kwa ufanisi!");
  };

  const handleDeleteUser = (uid: string, name: string) => {
    const currentUser = getLoggedInUser();
    if (!currentUser) return;

    if (isSelfUser(uid)) {
      alert("Huwezi kufuta akaunti yako unayotumia sasa hivi!");
      return;
    }

    const targetUser = users.find(u => u.uid === uid);
    if (targetUser) {
      if (isSuperAdmin(targetUser.email)) {
        alert("Huwezi kumfuta Admin Mkuu wa Kinga TV (saidsalum076660@gmail.com)!");
        return;
      }
      if (!isSuperAdmin(currentUser.email) && isAdminUser(targetUser.email)) {
        alert("Huwezi kumfuta msimamizi (admin) mwenzako! Ni Admin Mkuu tu mwenye mamlaka hayo.");
        return;
      }
    }

    if (confirm(`Je, uko tayari kumfuta kabisa mteja/msimamizi "${name}"? Kitendo hiki kitaondoa wasifu wake wote kwenye localstorage na wingu la Supabase!`)) {
      localDb.deleteUser(uid);
      alert("Mtumiaji amefutwa kabisa na kuondolewa kila mahali!");
    }
  };

  const handleGivePackage = (uid: string, option: string) => {
    if (option === "0") {
      handleResetTrial(uid);
      return;
    }
    const days = parseInt(option, 10);
    if (isNaN(days)) return;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);

    localDb.updateUserProfile(uid, {
      status: UserStatus.ACTIVE,
      approvedByAdmin: true,
      subscriptionExpiresAt: expiry.toISOString()
    });
    alert(`Kifurushi cha Siku ${days} kimeongezwa kwa ufanisi! Muda utakwisha tarehe: ${expiry.toLocaleDateString()}`);
  };

  const handleResetTrial = (uid: string) => {
    localDb.updateUserProfile(uid, {
      status: UserStatus.PENDING,
      freeSecondsRemaining: 120, // 2 minutes reset
      approvedByAdmin: false,
      subscriptionExpiresAt: null
    });
    alert("Ziada ya dakika 2 za bure ya mtihani imewekwa upya!");
  };

  const handleSaveExpiryDate = (uid: string) => {
    if (!userExpiryDate) return;
    localDb.updateUserProfile(uid, {
      subscriptionExpiresAt: new Date(userExpiryDate).toISOString(),
      status: UserStatus.ACTIVE
    });
    setUserExpiryUid(null);
    setUserExpiryDate("");
    alert("Muda wa uanachama umesasishwa!");
  };

  // Push Notifications Broadcast logic
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) {
      alert("Tafadhali jaza Kichwa na Ujumbe wa taarifa.");
      return;
    }

    const newNotif: SystemNotification = {
      id: "notif-" + Math.random().toString(36).substring(2, 10),
      title: notifTitle,
      message: notifMessage,
      createdAt: new Date().toISOString()
    };

    const updated = [newNotif, ...notifications];
    localDb.saveNotifications(updated);
    setNotifTitle("");
    setNotifMessage("");
    alert("Ujumbe wa Tangazo umesukumwa kwa wateja wote!");
  };

  const handleDeleteNotification = (id: string) => {
    if (confirm("Futa tangazo hili?")) {
      const filtered = notifications.filter(n => n.id !== id);
      localDb.saveNotifications(filtered);
    }
  };

  // Stats Counters
  const countPending = users.filter(u => u.status === UserStatus.PENDING).length;
  const countActive = users.filter(u => u.status === UserStatus.ACTIVE).length;
  const countBlocked = users.filter(u => u.status === UserStatus.BLOCKED).length;

  return (
    <div id="admin_portal_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Admin Left Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Branding header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="font-extrabold text-sm tracking-widest text-white uppercase">Admin Portal</h1>
              <span className="text-[10px] text-slate-400 font-mono">KINGA TV Control v1.0</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 flex flex-col gap-1.5 grow overflow-y-auto">
          <button
            id="admin_nav_dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "dashboard" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
            Dashboard & Token
          </button>

          <button
            id="admin_nav_channels"
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "channels" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Tv className="w-4 h-4" />
            Channels Management
          </button>

          <button
            id="admin_nav_slideshow"
            onClick={() => {
              setActiveTab("slideshow");
              if (!slideChannelId && channels.length > 0) setSlideChannelId(channels[0].id);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "slideshow" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Play className="w-4 h-4" />
            Slideshow Carousel
          </button>

          <button
            id="admin_nav_matches"
            onClick={() => {
              setActiveTab("matches");
              if (!matchChannelId && channels.length > 0) setMatchChannelId(channels[0].id);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "matches" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Calendar className="w-4 h-4" />
            Match Schedules
          </button>

          <button
            id="admin_nav_users"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer relative ${activeTab === "users" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            User Access System
            {countPending > 0 && (
              <span className="absolute right-3 bg-rose-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {countPending}
              </span>
            )}
          </button>

          <button
            id="admin_nav_notifications"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "notifications" ? "bg-cyan-950/50 text-cyan-400 border-l-4 border-cyan-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Bell className="w-4 h-4" />
            Push Announcements
          </button>
        </nav>

        {/* Escape admin panel */}
        <div className="p-4 border-t border-slate-800">
          <button
            id="admin_back_to_app"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            RUDI KWENYE APP
          </button>
        </div>
      </aside>

      {/* Main Admin Right Panels */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* TAB 1: DASHBOARD & CONFIG */}
        {activeTab === "dashboard" && (
          <div id="panel_dashboard" className="max-w-4xl space-y-6">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Mfumo wa KINGA TV - Dashboard Overview</h2>
            
            {/* Bento statistics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Makocha/Channels</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">{channels.length}</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-rose-400 uppercase font-bold tracking-wider">Pending (Free Limit)</span>
                <p className="text-2xl font-black text-rose-400 mt-1">{countPending}</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Wateja Active</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{countActive}</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider font-mono">Blocked Users</span>
                <p className="text-2xl font-black text-slate-400 mt-1">{countBlocked}</p>
              </div>
            </div>

            {/* Global parameters configuration Form */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Mipangilio Mikuu ya Programu (Global App Settings)</h3>
              </div>
              <form onSubmit={handleSaveToken} className="space-y-4">
                <div>
                  <label htmlFor="app_logo_input" className="block text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-blue-400" />
                    Logo ya Programu (App Logo URL):
                  </label>
                  <input
                    id="app_logo_input"
                    type="text"
                    value={appLogoInput}
                    onChange={(e) => setAppLogoInput(e.target.value)}
                    placeholder="e.g. https://domain.com/my-logo.png"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-sans"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Ukiacha wazi, mfumo utaonyesha kimvui cha kuvutia (placeholder shadow) cha Kinga TV kwenye fomu ya Login / Kujisajili.
                  </p>
                </div>

                <div className="pt-2">
                  <label htmlFor="token_input" className="block text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Global Authentication Token (?cdntoken=...):
                  </label>
                  <textarea
                    id="token_input"
                    value={globalToken}
                    onChange={(e) => setGlobalToken(e.target.value)}
                    placeholder="e.g. ?cdntoken=eyJ0eXAiOiJKV1..."
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-cyan-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Token hii itaunganishwa mwishoni mwa viungo vya MPD ambavyo vimewekewa alama ya kutumia Global Token.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  {appLogoInput && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Mvonekano uliochaguliwa sasa:</span>
                      <img src={appLogoInput} className="w-8 h-8 rounded-lg object-cover border border-slate-800" alt="Preview Logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <button
                    id="save_token_btn"
                    type="submit"
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg uppercase tracking-wider ml-auto"
                  >
                    HIFADHI MIPANGILIO MIKUU
                  </button>
                </div>
              </form>
            </div>

            {/* Supabase Cloud Connection & Sync Center */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Layers className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Muunganisho wa Database ya Supabase</h3>
                    <p className="text-[10px] text-slate-400">Unganisha programu na wingu ya Supabase Cloud Database kuokoa data milele</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${
                  supabaseUrlInput && supabaseAnonKeyInput 
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" 
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}>
                  {supabaseUrlInput && supabaseAnonKeyInput ? "CONFIGURED" : "LOCAL STORAGE MODE"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sb_url_input" className="block text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">
                      Supabase URL (VITE_SUPABASE_URL):
                    </label>
                    <input
                      id="sb_url_input"
                      type="text"
                      value={supabaseUrlInput}
                      onChange={(e) => setSupabaseUrlInput(e.target.value)}
                      placeholder="e.g. https://xxx.supabase.co"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb_key_input" className="block text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">
                      Supabase Anon Key (VITE_SUPABASE_ANON_KEY):
                    </label>
                    <input
                      id="sb_key_input"
                      type="password"
                      value={supabaseAnonKeyInput}
                      onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                      placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {supabaseTestResult && (
                  <div className={`p-3.5 rounded-lg border text-xs leading-normal flex items-start gap-2 ${
                    supabaseTestResult.success 
                      ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40" 
                      : "bg-rose-950/30 text-rose-300 border-rose-900/30"
                  }`}>
                    {supabaseTestResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <p>{supabaseTestResult.message}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isTestingSupabase}
                    onClick={handleTestSupabase}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 border border-slate-700/60"
                  >
                    {isTestingSupabase ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                    )}
                    PIMA MUUNGANISHO & SYNC
                  </button>

                  <button
                    type="button"
                    disabled={isTestingSupabase || !supabaseUrlInput || !supabaseAnonKeyInput}
                    onClick={handleTriggerManualSync}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 border border-slate-700/60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? "animate-spin" : ""}`} />
                    SAWAZISHA MANUAL SYNC
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSqlSetup(!showSqlSetup)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-slate-800"
                  >
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    {showSqlSetup ? "Ficha SQL Setup" : "Tazama Supabase SQL Schema"}
                  </button>
                </div>

                {showSqlSetup && (
                  <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Supabase SQL Script Setup & Seeding
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          import("../supabase").then(m => {
                            navigator.clipboard.writeText(m.SUPABASE_SETUP_SQL);
                            alert("SQL Setup Script and Initial Entries copied to clipboard! You can now paste this directly inside the Supabase SQL Editor and click RUN.");
                          }).catch(err => {
                            alert("Error copying script: " + err);
                          });
                        }}
                        className="text-[10px] text-cyan-400 hover:underline hover:text-cyan-300 font-extrabold cursor-pointer"
                      >
                        Nakili SQL Yote (Tables + Seeding entries)
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Tafadhali nenda kwenye <strong className="text-white">Supabase Dashboard → SQL Editor → New Query/Run</strong>, weka (paste) na ubonyeze <strong className="text-emerald-400">RUN / PLAY</strong> ili kuandaa mifumo na data zote za mechi/kuishi kwa usahihi kwa usalama:
                    </p>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-mono overflow-auto max-h-56 whitespace-pre">
{`-- SQL DATABASE SETUP AND SEEDING FOR KINGA TV
-- Run this in your Supabase SQL Editor to prepare both tables and seed entry data

-- 1. Create all core tables (ktv_users, ktv_channels, ktv_matches, ktv_slideshow, ktv_config)
-- 2. Configures Row Level Security (RLS) to allow read/write actions
-- 3. Seeds initial Sports TV channels, live football matches, main carousel banners, and configuration settings`}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Orodha ya Watumiaji wote kwenye Dashboard */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Users className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Watumiaji Waliojisajili (Registered Users)</h3>
                    <p className="text-[10px] text-slate-400">Tazama na udhibiti watumiaji wote waliojisajili hapa papo hapo</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-cyan-400 font-extrabold">
                  Wateja Wote: {users.length}
                </span>
              </div>

              {users.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Hakuna mtumiaji aliyesajiliwa bado kwenye mifumo yetu.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        <th className="p-3">Jina & Barua Pepe</th>
                        <th className="p-3">Namba ya Simu</th>
                        <th className="p-3">Trial / Kikomo</th>
                        <th className="p-3">Hali (Status)</th>
                        <th className="p-3 text-right">Marekebisho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                      {users.map((u) => {
                        const isSelf = isSelfUser(u.uid);
                        const isUserAdminAcc = isAdminUser(u.email);
                        const isTargetSuperAdmin = isSuperAdmin(u.email);
                        const loggedInUser = getLoggedInUser();
                        const isCurrentUserSuperAdmin = loggedInUser ? isSuperAdmin(loggedInUser.email) : false;
                        const cannotBlockOrDelete = isSelf || isTargetSuperAdmin || (!isCurrentUserSuperAdmin && isUserAdminAcc);

                        return (
                          <tr key={u.uid} className="hover:bg-slate-800/20">
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-100">{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[8px] uppercase tracking-wider rounded">Wewe</span>
                                )}
                                {!isSelf && isUserAdminAcc && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[8px] uppercase tracking-wider rounded flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5 shrink-0" /> Admin {isTargetSuperAdmin && "Mkuu"}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                            </td>
                            <td className="p-3 font-mono">{u.phone || "-"}</td>
                            <td className="p-3">
                              {u.status === UserStatus.PENDING ? (
                                <span className="text-amber-400 font-mono font-bold">{u.freeSecondsRemaining}s zilizobaki</span>
                              ) : (
                                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/35">
                                  {u.subscriptionExpiresAt ? `Itaisha: ${new Date(u.subscriptionExpiresAt).toLocaleDateString()}` : "Bila Kikomo"}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {u.status === UserStatus.ACTIVE ? (
                                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-950/50 rounded-full font-bold text-[9px] uppercase">Active</span>
                              ) : u.status === UserStatus.PENDING ? (
                                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-950/50 rounded-full font-bold text-[9px] uppercase">Pending</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded-full font-bold text-[9px] uppercase">Blocked</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1.5 justify-end items-center flex-wrap">
                                {/* Subscription package select */}
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      handleGivePackage(u.uid, val);
                                      e.target.value = "";
                                    }
                                  }}
                                  className="px-2 py-1 bg-slate-950 border border-slate-800 text-[9px] rounded text-emerald-400 font-bold hover:border-emerald-600 focus:outline-none cursor-pointer"
                                  title="Mpe mtumiaji kifurushi cha kujiunga"
                                >
                                  <option value="">+ Mpe Kifurushi</option>
                                  <option value="1">Siku 1 (Day Pass)</option>
                                  <option value="7">Siku 7 (Weekly)</option>
                                  <option value="30">Siku 30 (Monthly)</option>
                                  <option value="90">Siku 90 (Miezi 3)</option>
                                  <option value="365">Siku 365 (Mwaka 1)</option>
                                  <option value="0">Rudisha Kionjo (120s)</option>
                                </select>

                                {/* Approve / Block/Unblock toggle */}
                                {u.status === UserStatus.BLOCKED ? (
                                  <button
                                    onClick={() => handleUnblockUser(u.uid)}
                                    className="px-2 py-1 bg-teal-800 hover:bg-teal-700 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer"
                                  >
                                    Fungulia
                                  </button>
                                ) : u.status === UserStatus.PENDING ? (
                                  <button
                                    onClick={() => handleApprovePayment(u.uid)}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer"
                                  >
                                    Idhinisha
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBlockUser(u.uid)}
                                    disabled={cannotBlockOrDelete}
                                    className={`px-2 py-1 font-extrabold text-[10px] rounded transition-all border ${
                                      cannotBlockOrDelete ? "bg-slate-800 text-slate-500 border-transparent cursor-not-allowed" : "bg-red-950 hover:bg-red-900 text-rose-300 border-red-900/40 cursor-pointer"
                                    }`}
                                    title={cannotBlockOrDelete ? "Hakuna ruhusa ya kufanya hivi kwenye akaunti hii" : "Zuia mtumiaji kujiunga"}
                                  >
                                    Zuia
                                  </button>
                                )}

                                {/* Delete user option */}
                                <button
                                  onClick={() => handleDeleteUser(u.uid, u.name)}
                                  disabled={cannotBlockOrDelete}
                                  className={`p-1 rounded transition-all ${
                                    cannotBlockOrDelete ? "text-slate-600 cursor-not-allowed" : "text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 cursor-pointer"
                                  }`}
                                  title={cannotBlockOrDelete ? "Hakuna ruhusa ya kufuta akaunti hii" : "Futa mtumiaji kabisa kwenye mfumo"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Guide Info Card */}
            <div className="p-6 bg-blue-950/20 border border-blue-900/40 rounded-xl">
              <h4 className="text-sm font-bold text-cyan-300">Vidokezo vya Mfumo:</h4>
              <ul className="list-disc list-inside text-xs text-slate-300 mt-2 space-y-1.5 leading-relaxed">
                <li>Mpangilio wa Dashibodi: Unaweza kuongeza mechi live na channel nazo mtandaoni.</li>
                <li>Watumiaji wapya wakisajiliwa wanapata dakika 2 za bure pekee, kisha wanapigwa marufuku (PENDING blocks) mpaka msimamizi aidhinishe.</li>
                <li>Saa na muda utajaliwa katika UTC. Mabadiliko yanajitokeza papo hapo kwa wateja (real-time style local updates).</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: CHANNELS MANAGEMENT */}
        {activeTab === "channels" && (
          <div id="panel_channels" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">Vituo vyote vya KINGA TV ({channels.length})</h2>
              {channelEditId && (
                <button 
                  onClick={resetChannelForm}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Futa fomu / Ongeza Mpya
                </button>
              )}
            </div>

            {/* Channels Add/Edit Form */}
            <form onSubmit={handleSaveChannel} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 max-w-4xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {channelEditId ? "Hariri Idhaaa" : "Ongeza Channel Mpya"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Mkoa/Jina la Channel *</label>
                  <input
                    id="chan_name_input"
                    type="text"
                    required
                    value={chanName}
                    onChange={(e) => setChanName(e.target.value)}
                    placeholder="Mfano: KIXMovies, Azam Sports 1 HD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Aina ya Link ya Stream *</label>
                  <select
                    id="chan_stream_type_select"
                    value={chanStreamType}
                    onChange={(e) => setChanStreamType(e.target.value as StreamType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="hls">HLS (m3u8)</option>
                    <option value="mpd">MPEG-DASH (mpd URL na Widevine ClearKey)</option>
                    <option value="mp4">MP4 Video Link</option>
                    <option value="ts">MPEG-TS (ts)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Streaming Source URL *</label>
                  <input
                    id="chan_url_input"
                    type="url"
                    required
                    value={chanStreamUrl}
                    onChange={(e) => setChanStreamUrl(e.target.value)}
                    placeholder="https://example.com/stream.m3u8"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Logo URL (Picha ya Mduara ya Kituo)</label>
                  <input
                    id="chan_logo_input"
                    type="text"
                    value={chanLogo}
                    onChange={(e) => setChanLogo(e.target.value)}
                    placeholder="e.g. https://domain.com/logo.png"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Background Poster URL (Kipicha kikubwa)</label>
                  <input
                    id="chan_poster_input"
                    type="text"
                    value={chanPoster}
                    onChange={(e) => setChanPoster(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1 font-mono">Category</label>
                  <input
                    id="chan_cat_input"
                    type="text"
                    value={chanCategory}
                    onChange={(e) => setChanCategory(e.target.value)}
                    placeholder="Sports, Movies, Series, Miscellaneous"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Raka / Order Namba</label>
                  <input
                    id="chan_order_input"
                    type="number"
                    value={chanOrder}
                    onChange={(e) => setChanOrder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {chanStreamType === "mpd" && (
                  <div className="md:col-span-2 p-4 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Key className="w-4 h-4" />
                        Mipangilio ya ClearKey DRM (KID na KEY ili kusawazisha video)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">KID</label>
                      <input
                        id="chan_kid_input"
                        type="text"
                        value={chanKeyKid}
                        onChange={(e) => setChanKeyKid(e.target.value)}
                        placeholder="a7e155b282f33335ae8d553f169f443c"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">KEY</label>
                      <input
                        id="chan_key_input"
                        type="text"
                        value={chanKeyKey}
                        onChange={(e) => setChanKeyKey(e.target.value)}
                        placeholder="c3fdcfd5d509f1ed8550d76a525e34e5"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-2 flex items-center gap-2 py-1">
                  <input
                    id="chan_use_token_chk"
                    type="checkbox"
                    checked={chanUseGlobalToken}
                    onChange={(e) => setChanUseGlobalToken(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="chan_use_token_chk" className="text-xs text-slate-300 font-bold select-none">
                    Tumia Global Token mwishoni mwa Mpd/m3u8 link hii
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Maelezo/Description</label>
                  <textarea
                    id="chan_desc_textarea"
                    value={chanDesc}
                    onChange={(e) => setChanDesc(e.target.value)}
                    placeholder="Andika maelezo madogo ya chaanel..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  id="submit_chan_btn"
                  type="submit"
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-xl flex items-center gap-2 uppercase tracking-widest"
                >
                  <Save className="w-4 h-4 shrink-0 text-emerald-100" />
                  {channelEditId ? "SASISHA / SAVE CHANGES" : "HIFADHI / SAVE CHANNEL"}
                </button>
                {channelEditId && (
                  <button
                    type="button"
                    onClick={resetChannelForm}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Ghairi / Cancel
                  </button>
                )}
              </div>
            </form>

            {/* List Table of existing channels */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-5xl">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-white tracking-widest">Orodha ya Vituo vyako</h4>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <th className="p-4">Logo</th>
                      <th className="p-4">Jina la Channel</th>
                      <th className="p-4">Stream Aina</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">DRM Status</th>
                      <th className="p-4">Token Mod</th>
                      <th className="p-4 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {channels.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="p-4">
                          <img src={c.logo} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-800" />
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{c.streamUrl}</div>
                        </td>
                        <td className="p-4 font-mono text-[10px]">
                          <span className="px-2 py-1 bg-slate-950 rounded uppercase leading-none font-bold text-cyan-400">
                            {c.streamType}
                          </span>
                        </td>
                        <td className="p-4">{c.category}</td>
                        <td className="p-4 font-bold">
                          {c.clearKeyKid ? (
                            <span className="text-emerald-400">XML DRM Ready</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {c.useGlobalToken ? (
                            <span className="text-cyan-400">On</span>
                          ) : (
                            <span className="text-slate-500">Off</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEditChannel(c)}
                              className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 cursor-pointer"
                              title="Hariri"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChannel(c.id)}
                              className="p-1.5 bg-red-950 text-rose-300 rounded hover:bg-red-900 cursor-pointer"
                              title="Futa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {channels.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Hakuna vituo vilivyoonyeshwa. Tafadhali jaza kwanza kituo chako.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SLIDESHOW MANAGEMENT */}
        {activeTab === "slideshow" && (
          <div id="panel_slideshow" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">Homepage Slideshow Carousel</h2>
              {slideEditId && (
                <button 
                  onClick={resetSlideForm}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Ongeza Slide Mpya
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Slide Add/Edit form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSaveSlide} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      {slideEditId ? "Sajili Mabadiliko ya Slide" : "Unda Poster la Slideshow"}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Link ya picha ya slideshow (Image URL) *</label>
                      <input
                        id="slide_img_input"
                        type="text"
                        required
                        value={slideImage}
                        onChange={(e) => setSlideImage(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1 font-mono">Order Namba (Mpangilio)</label>
                      <input
                        id="slide_order_input"
                        type="number"
                        value={slideOrder}
                        onChange={(e) => setSlideOrder(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      id="submit_slide_btn"
                      type="submit"
                      className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg text-center"
                    >
                      {slideEditId ? "SASISHA SLIDE" : "Unda poster la carousel"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Slide Speed settings */}
              <div>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveSlideSpeed(); }} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-4">
                      <Timer className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Kasi ya Slideshow
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase font-bold text-slate-400">
                        Sekunde za kutembea slide:
                      </label>
                      <input
                        id="slideshow_speed_input"
                        type="number"
                        min="1"
                        required
                        value={slideSpeed}
                        onChange={(e) => setSlideSpeed(Number(e.target.value))}
                        placeholder="e.g. 5"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    HIFADHI MUDA (SEKUNDE)
                  </button>
                </form>
              </div>
            </div>

            {/* Carousel Item list previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((s) => {
                return (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group relative flex flex-col justify-between">
                    <div className="h-40 bg-slate-950 relative">
                      <img src={s.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          onClick={() => handleEditSlide(s)}
                          className="p-1 text-white bg-slate-950/80 rounded hover:bg-cyan-500 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlide(s.id)}
                          className="p-1 text-white bg-red-950/80 rounded hover:bg-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-mono font-bold text-cyan-400">
                        Order {s.order}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Slide Poster #{s.order}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MATCHES MANAGEMENT */}
        {activeTab === "matches" && (
          <div id="panel_matches" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white">Ratiba na Mechi LIVE kwenye Skrini</h2>
              {matchEditId && (
                <button 
                  onClick={resetMatchForm}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Ongeza Ratiba Mpya
                </button>
              )}
            </div>

            {/* Match Creator Form */}
            <form onSubmit={handleSaveMatch} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 max-w-4xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {matchEditId ? "Rekebisha Mechi" : "Hifadhi Mechi Mpya kwenye Orodha"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Jina la Timu A (Home) *</label>
                  <input
                    id="match_a_name_input"
                    type="text"
                    required
                    value={matchTeamA}
                    onChange={(e) => setMatchTeamA(e.target.value)}
                    placeholder="e.g. Yanga SC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Jina la Timu B (Away) *</label>
                  <input
                    id="match_b_name_input"
                    type="text"
                    required
                    value={matchTeamB}
                    onChange={(e) => setMatchTeamB(e.target.value)}
                    placeholder="e.g. Simba SC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Logo URL Timo A</label>
                  <input
                    id="match_a_logo_input"
                    type="text"
                    value={matchTeamALogo}
                    onChange={(e) => setMatchTeamALogo(e.target.value)}
                    placeholder="Mtumiaji mkao wa nembo picha ya timu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Logo URL Timo B</label>
                  <input
                    id="match_b_logo_input"
                    type="text"
                    value={matchTeamBLogo}
                    onChange={(e) => setMatchTeamBLogo(e.target.value)}
                    placeholder="Nembo picha ya timu B"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Muda / Saa *</label>
                  <input
                    id="match_time_input"
                    type="text"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    placeholder="Mfafanuzi: Saa 10:00 Jioni au 16:00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Tarehe au Siku *</label>
                  <input
                    id="match_date_input"
                    type="text"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    placeholder="Mfano: Leo, Leo Usiku, 2026-05-25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Hali / Match Hadhiri *</label>
                  <select
                    id="match_status_select"
                    value={matchStatus}
                    onChange={(e) => setMatchStatus(e.target.value as MatchStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="LIVE">LIVE SASA HIVI</option>
                    <option value="UPCOMING">UPCOMING (Bado Mechi haijaanza)</option>
                    <option value="FINISHED">FINISHED (Kumalizika)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1 font-mono">Live Score (Kama Mechi Imeanza)</label>
                  <input
                    id="match_score_input"
                    type="text"
                    value={matchScore}
                    onChange={(e) => setMatchScore(e.target.value)}
                    placeholder="e.g. 1 - 0, 2 - 2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Ionyeshe kwenye Channel ipi? (Live Channel Link)</label>
                  <select
                    id="match_chan_select"
                    value={matchChannelId}
                    onChange={(e) => setMatchChannelId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Hakuna Video Stream (Schedule pekee) --</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="match_featured_chk"
                    type="checkbox"
                    checked={matchIsFeatured}
                    onChange={(e) => setMatchIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="match_featured_chk" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                    Mechi hii iwe na Muonekano Maalum nyumbani
                  </label>
                </div>
              </div>

              <div>
                <button
                  id="submit_match_btn"
                  type="submit"
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  {matchEditId ? "SASISHA MECHI" : "SAJILI MECHI LIVE"}
                </button>
              </div>
            </form>

            {/* List Table of existing matches */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-5xl">
              <div className="p-4 bg-slate-800 border-b border-slate-700 font-bold text-xs text-white uppercase tracking-wider">
                Mechi zote katika Ratiba
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <th className="p-4">Watangaji (Mechi)</th>
                      <th className="p-4">Score</th>
                      <th className="p-4">Siku / Muda</th>
                      <th className="p-4">Aina ya Hali</th>
                      <th className="p-4">Channel Stream</th>
                      <th className="p-4">Kipengele</th>
                      <th className="p-4 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {matches.map((m) => {
                      const associatedChanName = channels.find(c => c.id === m.channelId)?.name || "N/A";
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-blue-100">{m.teamAName}</span>
                              <span className="text-slate-400 font-mono italic">vs</span>
                              <span className="font-extrabold text-blue-100">{m.teamBName}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-cyan-400 text-base">
                            {m.score || "-"}
                          </td>
                          <td className="p-4">
                            <div className="font-bold">{m.date}</div>
                            <div className="text-[10px] text-slate-400">{m.time}</div>
                          </td>
                          <td className="p-4">
                            {m.status === "LIVE" && (
                              <span className="px-2 py-0.5 bg-rose-950 border border-rose-500/50 text-rose-400 text-[10px] font-bold rounded-full animate-pulse uppercase">
                                Live Now
                              </span>
                            )}
                            {m.status === "UPCOMING" && (
                              <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] rounded-full uppercase font-medium">
                                Upcoming
                              </span>
                            )}
                            {m.status === "FINISHED" && (
                              <span className="px-2 py-0.5 bg-slate-950 text-slate-400 text-[10px] rounded-full uppercase border border-slate-800">
                                Over
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-cyan-300">{associatedChanName}</td>
                          <td className="p-4">
                            {m.isFeatured ? (
                              <span className="text-emerald-400 text-[11px] font-semibold">Featured</span>
                            ) : (
                              <span className="text-slate-500 font-serif">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditMatch(m)}
                                className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(m.id)}
                                className="p-1.5 bg-red-950 text-rose-300 rounded hover:bg-red-900 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: USER ACCESS SYSTEM */}
        {activeTab === "users" && (
          <div id="panel_users" className="space-y-6">
            <h2 className="text-xl font-extrabold text-white">Udhibiti wa Uanachama (User Account Operations)</h2>

            {/* Filter controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2.5">
                <span className="text-xs bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400">
                  Wateja Wote: <span className="font-bold text-white">{users.length}</span>
                </span>
                <span className="text-xs bg-rose-950 px-2.5 py-1.5 rounded-lg border border-rose-900 text-rose-400">
                  Trial PENDING: <span className="font-bold whitespace-nowrap text-rose-200">{countPending}</span>
                </span>
                <span className="text-xs bg-emerald-950 px-2.5 py-1.5 rounded-lg border border-emerald-900 text-emerald-400">
                  Uanachama ACTIVE: <span className="font-bold whitespace-nowrap text-emerald-200">{countActive}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Watumiaji wa "PENDING" wana kikomo cha sekunde 120 (dk 2) za kuangalia bure.</p>
            </div>

            {/* Users grid checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-800 border-b border-slate-700 font-bold text-xs text-white uppercase tracking-wider">
                Mawasiliano na Usajili wa Watumiaji
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <th className="p-4">Wasifu (Jina / Email)</th>
                      <th className="p-4">Simu (Phone)</th>
                      <th className="p-4">Free Trial (Saa/Sekunde)</th>
                      <th className="p-4">Hali / Status</th>
                      <th className="p-4">Uanachama Expiry</th>
                      <th className="p-4 text-right">Marekebisho / Matendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {users.map((u) => {
                      const isExpired = u.subscriptionExpiresAt 
                        ? new Date(u.subscriptionExpiresAt).getTime() < Date.now() 
                        : false;
                      const formattedExpiry = u.subscriptionExpiresAt 
                        ? new Date(u.subscriptionExpiresAt).toLocaleDateString()
                        : "-";
                      const isSelf = isSelfUser(u.uid);
                      const isUserAdminAcc = isAdminUser(u.email);
                      const isTargetSuperAdmin = isSuperAdmin(u.email);
                      const loggedInUser = getLoggedInUser();
                      const isCurrentUserSuperAdmin = loggedInUser ? isSuperAdmin(loggedInUser.email) : false;
                      const cannotBlockOrDelete = isSelf || isTargetSuperAdmin || (!isCurrentUserSuperAdmin && isUserAdminAcc);

                      return (
                        <tr key={u.uid} className="hover:bg-slate-800/40">
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-white text-sm">{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[8px] uppercase tracking-wider rounded">Wewe</span>
                              )}
                              {!isSelf && isUserAdminAcc && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[8px] uppercase tracking-wider rounded flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5 shrink-0" /> Admin {isTargetSuperAdmin && "Mkuu"}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                            <div className="text-[9px] text-slate-600">Created: {new Date(u.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4 font-mono select-all text-slate-300">{u.phone || "Haipo"}</td>
                          <td className="p-4 font-mono font-bold">
                            {u.status === UserStatus.PENDING ? (
                              <span className={`px-2 py-0.5 rounded ${u.freeSecondsRemaining <= 0 ? "bg-rose-950 text-rose-300" : "bg-cyan-950 text-cyan-400"}`}>
                                Trial: {u.freeSecondsRemaining}s remaining
                              </span>
                            ) : (
                              <span className="text-slate-500">- (Active)</span>
                            )}
                          </td>
                          <td className="p-4">
                            {u.status === UserStatus.ACTIVE && (
                              <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] rounded-full font-bold uppercase tracking-wider">
                                Active
                              </span>
                            )}
                            {u.status === UserStatus.PENDING && (
                              <span className="px-2.5 py-1 bg-rose-950 border border-rose-500/50 text-rose-400 text-[10px] rounded-full font-bold uppercase tracking-wider">
                                Pending
                              </span>
                            )}
                            {u.status === UserStatus.BLOCKED && (
                              <span className="px-2.5 py-1 bg-slate-950 text-slate-400 text-[10px] rounded-full border border-slate-700 uppercase">
                                Blocked
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-xs select-all">
                            {isExpired ? (
                              <span className="text-rose-500">Muda Umaisha ({formattedExpiry})</span>
                            ) : u.subscriptionExpiresAt ? (
                              <span className="text-emerald-400">{formattedExpiry}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-1.5 justify-end flex-wrap max-w-sm ml-auto items-center">
                              
                              {/* Option to approve PENDING users to ACTIVE in Swahili logic */}
                              {u.status === UserStatus.PENDING && (
                                <button
                                  onClick={() => handleApprovePayment(u.uid)}
                                  className="px-2.5 py-1 bg-emerald-700 text-white font-bold text-[10px] rounded hover:bg-emerald-600 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Kuidhinisha
                                </button>
                              )}

                              {/* Live Subscription Package dropdown select */}
                              <select
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    handleGivePackage(u.uid, val);
                                    e.target.value = "";
                                  }
                                }}
                                className="px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] rounded text-emerald-400 font-bold hover:border-emerald-600 focus:outline-none cursor-pointer"
                                title="Mpe mtumiaji kifurushi cha kujiunga"
                              >
                                <option value="">+ Mpe Kifurushi</option>
                                <option value="1">Siku 1 (Day Pass)</option>
                                <option value="7">Siku 7 (Weekly)</option>
                                <option value="30">Siku 30 (Monthly)</option>
                                <option value="90">Siku 90 (Miezi 3)</option>
                                <option value="365">Siku 365 (Mwaka 1)</option>
                                <option value="0">Rudisha Kionjo (120s)</option>
                              </select>

                              {/* Manual expiry update togglers */}
                              {userExpiryUid === u.uid ? (
                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="date" 
                                    value={userExpiryDate}
                                    onChange={(e) => setUserExpiryDate(e.target.value)}
                                    className="bg-slate-950 text-white border border-slate-800 rounded p-0.5 text-[10px] font-mono"
                                  />
                                  <button 
                                    onClick={() => handleSaveExpiryDate(u.uid)}
                                    className="p-1 bg-cyan-600 text-white rounded hover:bg-cyan-500 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setUserExpiryUid(u.uid);
                                    setUserExpiryDate(u.subscriptionExpiresAt ? u.subscriptionExpiresAt.split("T")[0] : "");
                                  }}
                                  className="px-2 py-1 bg-slate-800 text-slate-300 font-bold text-[10px] rounded hover:bg-slate-700 transition-colors cursor-pointer"
                                  title="Pakia tarehe ya kumalizika usajili"
                                >
                                  Set Expiry
                                </button>
                              )}

                              {/* Reset 2min free trial for testing */}
                              <button
                                onClick={() => handleResetTrial(u.uid)}
                                className="px-2 py-1 bg-slate-800 text-orange-400 font-bold text-[10px] rounded hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                                title="Rudisha kionjo cha dakika 2"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Reset Trial
                              </button>

                              {/* Block / Unblock Account Button */}
                              {u.status === UserStatus.BLOCKED ? (
                                <button
                                  onClick={() => handleUnblockUser(u.uid)}
                                  className="px-2 py-1 bg-teal-800 hover:bg-teal-700 text-white font-bold text-[10px] rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title="Fungua akaunti ya mteja"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Fungua
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockUser(u.uid)}
                                  disabled={cannotBlockOrDelete}
                                  className={`px-2 py-1 font-bold text-[10px] rounded transition-colors flex items-center gap-1 border ${
                                    cannotBlockOrDelete ? "bg-slate-800 text-slate-500 border-transparent cursor-not-allowed" : "bg-red-950 text-rose-300 hover:bg-red-900 border-red-900/40 cursor-pointer"
                                  }`}
                                  title={cannotBlockOrDelete ? "Hakuna ruhusa ya kufanya hivi kwenye akaunti hii" : "Zuia akaunti ya mteja"}
                                >
                                  <Ban className="w-3 h-3" />
                                  Block
                                </button>
                              )}

                              {/* Delete Account button */}
                              <button
                                onClick={() => handleDeleteUser(u.uid, u.name)}
                                disabled={cannotBlockOrDelete}
                                className={`px-2 py-1 font-bold text-[10px] rounded transition-colors flex items-center gap-1 border ${
                                  cannotBlockOrDelete ? "bg-slate-800 text-slate-500 border-transparent cursor-not-allowed" : "bg-red-950 text-rose-400 hover:bg-rose-900 border-rose-900/40 cursor-pointer"
                                }`}
                                title={cannotBlockOrDelete ? "Hakuna ruhusa ya kufuta akaunti hii" : "Futa akaunti kabisa kwenye mfumo"}
                              >
                                <Trash2 className="w-3 h-3" />
                                Futa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PUSH ANNOUNCEMENTS */}
        {activeTab === "notifications" && (
          <div id="panel_notifications" className="space-y-6 max-w-3xl">
            <h2 className="text-xl font-extrabold text-white">Sukuma Taarifa na Matangazo ya Global (Push Messages)</h2>
            
            <form onSubmit={handleSendNotification} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Bell className="w-5 h-5 text-cyan-400 animate-swing" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Tuma Tangazo Mpya kwa Skrini zote za KINGA TV
                </h3>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Kichwa cha Tangazo / Title *</label>
                <input
                  id="notif_title_input"
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. TAARIFA MAALUM: Mechi ya Leo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Ujumbe / Notification Message *</label>
                <textarea
                  id="notif_msg_textarea"
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Andika taarifa ya utengenezaji, promo, namba za malipo ya mitandao hapa..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <button
                  id="send_notif_btn"
                  type="submit"
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  SUKUMA TANGAZO SASA
                </button>
              </div>
            </form>

            {/* Existing notifications logs */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Matangazo yaliyopita</h3>
              
              {notifications.map((n) => (
                <div key={n.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block mb-0.5">
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                    <h5 className="font-extrabold text-white text-sm">{n.title}</h5>
                    <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap leading-relaxed">{n.message}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(n.id)}
                    className="p-1.5 text-rose-400 hover:bg-red-950 rounded cursor-pointer shrink-0"
                    title="Futa Ujumbe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                  Hakuna ujumbe uliosukumwa kwa sasa.
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
