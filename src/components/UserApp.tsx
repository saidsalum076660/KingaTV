import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, Play, Calendar, User, Search, PlayCircle, Clock, AlertCircle, 
  ChevronRight, LogOut, CheckCircle2, ShieldAlert, Award, DollarSign, Bell,
  Layers, RotateCw, ArrowLeft
} from "lucide-react";
import { Channel, SlideshowItem, Match, UserProfile, UserStatus, SystemNotification } from "../types";
import { localDb, localAuth } from "../firebase";
import Slideshow from "./Slideshow";
import VideoPlayer from "./VideoPlayer";

interface UserAppProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export default function UserApp({ user, onLogout, onOpenAdmin, isAdmin }: UserAppProps) {
  const [activeTab, setActiveTab] = useState<"home" | "matches" | "profile">("home");
  
  // App dynamic states loaded from database
  const [currentUser, setCurrentUser] = useState<UserProfile>(user);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  // Stream Playback States
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Zote");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Categories Scrollbar & Indicators ref and states
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 150;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const handleCategoriesScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const pct = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(pct);
    }
  };

  // Payment Confirmation Simulated Form Form States
  const [payPhoneNumber, setPayPhoneNumber] = useState("");
  const [payAmount, setPayAmount] = useState("10,000 TZS");
  const [payNetwork, setPayNetwork] = useState("M-Pesa");
  const [payReference, setPayReference] = useState("");
  const [paySubmitted, setPaySubmitted] = useState(false);

  // Sync state with database
  useEffect(() => {
    const loadData = () => {
      // Reload current logged in user details
      const freshUser = localDb.getUser(user.uid);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
      
      const loadedChannels = localDb.getChannels().sort((a, b) => a.order - b.order);
      setChannels(loadedChannels);
      setSlides(localDb.getSlideshow());
      setMatches(localDb.getMatches());
      setNotifications(localDb.getNotifications());

      // Auto-set first channel on initial load (optional, but let's let them click)
    };

    loadData();
    const unsubscribe = localDb.onUpdate(loadData);
    return () => unsubscribe();
  }, [user.uid]);

  // Play a channel with automatic 2-minute trial logic guard
  const handlePlayChannel = (c: Channel) => {
    if (isPending && currentUser.freeSecondsRemaining <= 0) {
      alert("Muda wako wa majaribio wa dakika 2 za bure umeshaisha! Tafadhali nenda kwenye profile na fanya malipo ili kuruhusiwa kucheza channel.");
      setActiveTab("profile");
      return;
    }
    setSelectedChannel(c);
    // Automatically scroll up to display the player
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle slide/match click to trigger channel stream
  const handleSelectChannelById = (channelId: string) => {
    const found = channels.find((c) => c.id === channelId);
    if (found) {
      handlePlayChannel(found);
    } else {
      alert("Channel inayohusiana na mechi hii haijapatikana.");
    }
  };

  const handleTimeUpdate = (remainingSeconds: number) => {
    setCurrentUser((prev) => ({
      ...prev,
      freeSecondsRemaining: remainingSeconds
    }));
  };

  const handleTimeExpired = () => {
    setCurrentUser((prev) => ({
      ...prev,
      freeSecondsRemaining: 0
    }));
    // Playback handles stopping itself and showing native overlay messages
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payPhoneNumber || !payReference) {
      alert("Tafadhali jaza namba ya simu na kumbukumbu ya muamala.");
      return;
    }
    
    // Simulate user request to admin
    setPaySubmitted(true);
    // Let's create an announcement notification or sim approval
    alert("Ombi lako la malipo limeshawasilishwa! Msimamizi atapitia na kukuwekea ACTIVE ndani ya masaa 2.");
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Import and trigger a live sync with Supabase in the background
      const m = await import("../supabase");
      if (m.isSupabaseConnected()) {
        const success = await m.syncDatabaseWithSupabase();
        if (success) {
          console.log("Supabase sync successful on manual refresh.");
        }
      }
    } catch (e) {
      console.warn("Supabase sync error on refresh:", e);
    } finally {
      // Reload local values as well
      const loadedChannels = localDb.getChannels().sort((a, b) => a.order - b.order);
      setChannels(loadedChannels);
      setSlides(localDb.getSlideshow());
      setMatches(localDb.getMatches());
      setNotifications(localDb.getNotifications());
      
      const freshUser = localDb.getUser(currentUser.uid);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
      setIsRefreshing(false);
      alert("Mifumo na Vituo vya KINGA TV vimesasishwa kikamilifu! (Data Refreshed Successfully)");
    }
  };

  // Direct list of categories requested by user
  const categories = ["Zote", "Sports", "Movies", "News", "Documentary", "Music", "Religious", "Kids"];

  const filteredChannels = channels.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const targetCategory = selectedChannel ? selectedChannel.category : selectedCategory;
    const matchesCategory = targetCategory === "Zote" || 
                            c.category.toLowerCase() === targetCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const featuredMatches = matches.filter(m => m.isFeatured);
  const isPending = currentUser.status === UserStatus.PENDING;

  return (
    <div id="user_app_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto shadow-2xl relative border-x border-slate-900 pb-20">
      
      {/* Top Header Section */}
      <header className="p-4 bg-slate-950 border-b border-slate-900 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between select-none">
        {showSearchInput ? (
          <div className="flex items-center gap-2 w-full animate-fade-in">
            <span className="text-slate-400">
              <Search className="w-5 h-5 text-slate-500" />
            </span>
            <input
              id="header_channel_search"
              type="text"
              autoFocus
              placeholder="Tafuta channels au sinema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#1e293b]/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-bold"
            />
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchInput(false);
              }}
              className="text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold"
            >
              Futa
            </button>
          </div>
        ) : (
          <>
            {/* Left Side: Photo-accurate Emerald Green KINGA TV Pill Badge with Layers/Stack Icon */}
            <div className="flex items-center gap-2 bg-[#0d8258] text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider select-none shadow-md shadow-emerald-950/20">
              <Layers className="w-4 h-4 text-white" />
              <span>KINGA TV</span>
            </div>

            {/* Right Side: Blue Circular Refresh and Search Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`w-[42px] h-[42px] bg-[#2563eb] hover:bg-blue-600 active:scale-95 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/15 border border-blue-400/20`}
                title="Reload App"
              >
                <RotateCw className={`w-5 h-5 text-white ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-[42px] h-[42px] bg-[#2563eb] hover:bg-blue-600 active:scale-95 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/15 border border-blue-400/20"
                title="Tafuta Vituo"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main tab viewports */}
      <main className="p-4 space-y-5 flex-1">

        {/* Dynamic Video Player Zone at the top if selected */}
        {selectedChannel ? (
          <div id="active_streaming_area" className="space-y-2.5 animate-fade-in scrolling-top">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <PlayCircle className="w-4 h-4 text-emerald-400 animate-spin" />
                UCHEZAJI WA SASA: {selectedChannel.name}
              </span>
              <button
                id="close_stream_btn"
                onClick={() => setSelectedChannel(null)}
                className="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer"
              >
                Funga
              </button>
            </div>
            
            <VideoPlayer
              channel={selectedChannel}
              user={currentUser}
              onTimeExpired={handleTimeExpired}
              onTimeUpdate={handleTimeUpdate}
            />

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <h3 className="font-extrabold text-white text-sm">{selectedChannel.name}</h3>
              <p className="text-slate-400 leading-relaxed">{selectedChannel.description || "Hakuna maelezo yaliyopo kwa kituo hiki kwa sasa."}</p>
              
              {isPending && currentUser.freeSecondsRemaining > 0 && (
                <div className="mt-3 p-2 bg-amber-950/30 border border-amber-900/60 text-amber-300 rounded-lg flex items-center gap-1.5 text-[10px]">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  Muda wa majaribio wa bure unapungua tu unapoangalia. Ukimaliza utatakiwa kulipia akaunti yako.
                </div>
              )}

              {isPending && currentUser.freeSecondsRemaining <= 0 && (
                <div className="mt-4 p-3.5 bg-rose-950/30 border border-rose-900/40 text-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                    <span className="font-extrabold text-[11px] uppercase text-rose-300 tracking-wider">Majaribio Yameisha (Trial Expired)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Muda wako wa dakika 2 za bure umeshaisha. Tafadhali lipia uanachama wa kila mwezi ili uendelee kufurahia mechi zote na vituo popote ulipo bila kikomo!
                  </p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-extrabold text-xs transition-all rounded-lg uppercase tracking-wider text-white shadow-lg cursor-pointer"
                  >
                    BONYEZA HAPA ILI KULIPIA (GO TO PROFILE)
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB A: HOME SCREEN */}
        {activeTab === "home" && (
          <div id="tab_home_view" className="space-y-5 animate-fade-in">
            {/* Automatic Featured Slideshow Banner (Hidden when actively streaming/playing a specific channel) */}
            {!selectedChannel && (
              <Slideshow slides={slides} onSelectChannel={handleSelectChannelById} />
            )}

            {/* Scrolling list container (Category buttons) */}
            <div className="relative w-full">
              <div 
                id="categories_tabs_slider" 
                ref={categoryScrollRef}
                onScroll={handleCategoriesScroll}
                className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-none select-none"
              >
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      id={`category_btn_${cat}`}
                      onClick={() => {
                        setSelectedCategory(cat);
                      }}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer select-none ${
                        isActive
                          ? "bg-[#2563eb] text-white font-black shadow-lg shadow-blue-500/10"
                          : "bg-slate-900/60 border border-slate-800 text-slate-400 font-medium hover:text-white hover:border-slate-750"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo-accurate custom Scroll Progress Indicator Bar with Arrow Anchors below categories */}
            <div className="flex items-center gap-2 justify-center w-full px-1 max-w-[280px] mx-auto select-none pt-0.5 pb-2">
              {/* Left Arrow Icon Indicator */}
              <button
                onClick={() => scrollCategories("left")}
                className="text-slate-500 hover:text-white pb-0.5 text-base font-bold select-none shrink-0 cursor-pointer active:scale-75 transition-all outline-none"
                title="Slaidi Nyuma"
              >
                &lsaquo;
              </button>
              
              {/* Sliding Track Line */}
              <div className="flex-1 h-3 bg-slate-800 border border-slate-750 rounded-full relative overflow-hidden shadow-inner">
                <div 
                  className="absolute top-0 bottom-0 bg-[#475569] rounded-full transition-all duration-150"
                  style={{
                    left: `${Math.max(0, Math.min(75, scrollProgress * 0.75))}%`,
                    width: "25%"
                  }}
                />
              </div>

              {/* Right Arrow Icon Indicator */}
              <button
                onClick={() => scrollCategories("right")}
                className="text-slate-500 hover:text-white pb-0.5 text-base font-bold select-none shrink-0 cursor-pointer active:scale-75 transition-all outline-none"
                title="Slaidi Mbele"
              >
                &rsaquo;
              </button>
            </div>

            {/* Channels List Header Section */}
            <div className="flex justify-between items-center select-none pt-1">
              <h2 id="home_channels_heading" className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">
                Channels
              </h2>
            </div>

            {/* 2-Column Grid layout: exactly two channels per row (mstari mmoja una channels mbili kama pichani) */}
            <div className="grid grid-cols-2 gap-4">
              {filteredChannels.map((c) => (
                <div
                  key={c.id}
                  id={`channel_card_${c.id}`}
                  onClick={() => handlePlayChannel(c)}
                  className="cursor-pointer group flex flex-col rounded-[20px] overflow-hidden border border-slate-800/80 bg-[#0f172a]/90 hover:border-blue-500/40 transition-all duration-300 shadow-xl relative"
                >
                  {/* Widescreen 16:9 Thumbnail Cover Image with badges */}
                  <div className="w-full aspect-video overflow-hidden bg-slate-950 relative">
                    <img
                      src={c.poster || c.logo}
                      alt={c.name}
                      onError={(e) => {
                        // Fallback in case of missing poster images
                        (e.target as HTMLImageElement).src = c.logo;
                      }}
                      className="w-full h-full object-cover select-none group-hover:scale-[1.02] transition-all duration-500"
                    />
                    
                    {/* Dark gradient shadow inside thumbnail bottom for readable text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

                    {/* LIVE Badge on top-left (red background, bold and uppercase) */}
                    <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow z-10">
                      LIVE
                    </span>

                    {/* FREE Badge on top-right (emerald green background, bold and uppercase) */}
                    <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow z-10">
                      FREE
                    </span>
                  </div>

                  {/* Channel brand card bottom: dark row containing small circular logo & human-read text */}
                  <div className="bg-[#0f172a]/95 px-3 py-3 flex items-center gap-2 border-t border-slate-800/40">
                    {/* Circle avatar on left */}
                    <img
                      src={c.logo}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-[20px] h-[20px] rounded-full object-cover border border-slate-700/80 shrink-0 select-none"
                    />
                    
                    {/* Fully human channel label without suffix codes */}
                    <p className="flex-1 text-[11px] font-black font-sans text-slate-200 truncate leading-tight group-hover:text-blue-400 transition-all">
                      {c.name}
                    </p>
                  </div>
                </div>
              ))}

              {filteredChannels.length === 0 && (
                <div className="col-span-2 text-center p-8 border border-slate-850 border-dashed rounded-xl text-slate-500 text-xs">
                  Hakuna channel iliyopatikana kwenye kundi hili kwa sasa.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB B: MATCH SCHEDULES SCREEN */}
        {activeTab === "matches" && (
          <div id="tab_matches_view" className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Ratiba na Matangazo yote ya Michezo</h3>
            
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => m.channelId && handleSelectChannelById(m.channelId)}
                  className={`p-4 bg-slate-900 border ${m.status === "LIVE" ? "border-rose-950 bg-gradient-to-br from-slate-900 to-rose-950/10" : "border-slate-800"} rounded-xl hover:bg-slate-900/90 transition-all cursor-pointer`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{m.date} | {m.time} GMT</span>
                    
                    {m.status === "LIVE" && (
                      <span className="px-2 py-0.5 bg-rose-950 border border-rose-500/50 text-rose-400 text-[8px] font-black rounded-full uppercase animate-pulse">
                        Live Now
                      </span>
                    )}
                    {m.status === "UPCOMING" && (
                      <span className="text-[9px] font-bold text-cyan-400 uppercase">Bado Kuanza</span>
                    )}
                    {m.status === "FINISHED" && (
                      <span className="text-[9px] text-slate-500 uppercase">Kumalizika</span>
                    )}
                  </div>

                  <div className="grid grid-cols-5 items-center justify-items-center py-2.5">
                    <div className="col-span-2 flex flex-col items-center gap-1 text-center">
                      <img src={m.teamALogo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-800" />
                      <span className="text-xs font-extrabold text-blue-100">{m.teamAName}</span>
                    </div>

                    <div className="col-span-1 text-center">
                      {m.score ? (
                        <span className="text-sm font-black text-cyan-300 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                          {m.score}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs uppercase font-serif tracking-widest font-bold">VS</span>
                      )}
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-1 text-center">
                      <img src={m.teamBLogo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-800" />
                      <span className="text-xs font-extrabold text-blue-100">{m.teamBName}</span>
                    </div>
                  </div>

                  {m.channelId && (
                    <div className="text-[10px] text-cyan-400 font-black mt-2 pt-2.5 border-t border-slate-800 flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
                        Inacheza LIVE - Gonga Tazama
                      </span>
                      <ChevronRight className="w-4 h-4 text-cyan-500" />
                    </div>
                  )}
                </div>
              ))}

              {matches.length === 0 && (
                <div className="text-center p-8 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                  Hakuna mechi zilizoongezwa kwenye ratiba kwa sasa.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB C: PROFILE & BILLING/PAYMENT CONFIRMATION */}
        {activeTab === "profile" && (
          <div id="tab_profile_view" className="space-y-4">
            
            {/* User Details Module */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-cyan-900 border-2 border-cyan-500 flex items-center justify-center mx-auto text-cyan-200 font-black text-xl shadow-lg shadow-cyan-500/20">
                {currentUser.name[0]?.toUpperCase() || "K"}
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white">{currentUser.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">{currentUser.email}</p>
                {currentUser.phone && <p className="text-[10px] text-slate-500 mt-0.5">{currentUser.phone}</p>}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-center gap-4">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-black block">Status yako</span>
                  {currentUser.status === UserStatus.ACTIVE ? (
                    <span className="text-xs text-emerald-400 font-black uppercase flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                      ACTIVE MEMBER
                    </span>
                  ) : (
                    <span className="text-xs text-rose-400 font-black uppercase flex items-center gap-1.5 mt-0.5 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      PENDING TRIAL
                    </span>
                  )}
                </div>
                
                {isPending && (
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Muda wa Kujaribu</span>
                    <span className="text-xs font-mono font-extrabold text-cyan-400 block mt-0.5">
                      {Math.floor(currentUser.freeSecondsRemaining / 60)}m {currentUser.freeSecondsRemaining % 60}s
                    </span>
                  </div>
                )}
                
                {currentUser.status === UserStatus.ACTIVE && currentUser.subscriptionExpiresAt && (
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Kumalizika Muda</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400 block mt-0.5">
                      {new Date(currentUser.subscriptionExpiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Trial Exhausted / Pending payment instructions (Swahili Form) */}
            {isPending && (
              <div id="trial_payment_instructions" className="p-5 bg-gradient-to-br from-slate-950 to-blue-950/40 border border-blue-900/40 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <h4 className="text-xs font-black uppercase text-white tracking-widest">
                    Lipia hapa ili kupata ACTIVE Account
                  </h4>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <p className="font-extrabold text-amber-300 mb-1">Maelekezo ya Malipo:</p>
                  Tuma kiasi cha <strong className="text-white font-black">10,000 TZS</strong> kwenda namba ya msimamizi kwa mitandao yeyote:
                  <ul className="list-disc list-inside text-slate-400 mt-1.5 space-y-0.5">
                    <li><strong className="text-white">M-PESA / Vodacom</strong>: +255 766 60xx</li>
                    <li><strong className="text-white">Airtel Money</strong>: +255 683 99xx</li>
                  </ul>
                  Kisha, jaza fomu iliyopo hapa chini uandike ile fomu ya kumbukumbu ya muamala (e.g. SL67D3Y) ili msimamizi aidhinishe akaunti yako sasa hivi.
                </div>

                {paySubmitted ? (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-center text-xs text-emerald-300">
                     Malipo yako yamepokelewa na yanashughulikiwa na KINGA TV Admin! Tafadhali subiri kidogo wakati msimamizi anapitia.
                  </div>
                ) : (
                  <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Mtandao uliolipia *</label>
                      <select 
                        value={payNetwork}
                        onChange={(e) => setPayNetwork(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="M-Pesa">Vodacom M-Pesa</option>
                        <option value="Airtel Money">Airtel Money</option>
                        <option value="Tigo Pesa">Tigo Pesa</option>
                        <option value="Halopesa">Halopesa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Namba ya Simu Ulilotumia Kulipia *</label>
                      <input
                        id="pay_phone_input"
                        type="tel"
                        required
                        placeholder="e.g. 0766601212"
                        value={payPhoneNumber}
                        onChange={(e) => setPayPhoneNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Kumbukumbu ya Muamala / Reference ID *</label>
                      <input
                        id="pay_ref_input"
                        type="text"
                        required
                        placeholder="e.g. SL08T67F"
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none font-mono font-bold uppercase"
                      />
                    </div>

                    <button
                      id="submit_payment_btn"
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer transition-colors"
                    >
                      TUMA TAARIFA YA MALIPO
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Admin panel launcher if checked securely by explicit email */}
            {isAdmin && (
              currentUser.email.toLowerCase().trim() === "saidsalum076660@gmail.com" || 
              currentUser.email.toLowerCase().trim() === "saidsalum076660@gmailo.com" || 
              currentUser.email.toLowerCase().trim() === "admin@kingatv.com"
            ) && (
              <button
                id="header_admin_portal_launcher"
                onClick={onOpenAdmin}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-500/30 rounded-xl text-white font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 mb-3 shadow-lg"
                title="Fungua Admin Panel"
              >
                <span>FUNGUA ADMIN DASHBOARD</span>
              </button>
            )}

            {/* Logout panel button */}
            <button
              id="logout_app_btn"
              onClick={onLogout}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              LOGOUT / AFILIA MAPENDEKEZO
            </button>

          </div>
        )}

      </main>

      {/* Styled Bottom Tab Bar Navigation Panel */}
      <nav id="bottom_nav_bar" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-slate-950/90 border-t border-slate-900 backdrop-blur-md px-6 py-2.5 flex justify-between items-center z-40">
        
        <button
          id="tab_nav_home"
          onClick={() => {
            setActiveTab("home");
            // Clear current video error messages or reset selections on double tap
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === "home" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-300"}`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-wider">Home</span>
        </button>

        <button
          id="tab_nav_matches"
          onClick={() => setActiveTab("matches")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === "matches" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-300"}`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-wider">Matches</span>
        </button>

        <button
          id="tab_nav_profile"
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === "profile" ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-300"}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-wider">Profile</span>
        </button>

      </nav>

    </div>
  );
}
