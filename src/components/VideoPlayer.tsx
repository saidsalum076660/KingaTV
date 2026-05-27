import React, { useEffect, useRef, useState } from "react";
import shaka from "shaka-player";
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCw, AlertTriangle, Clock, RefreshCw, Settings, Languages, ChevronDown } from "lucide-react";
import { Channel, UserProfile, UserStatus } from "../types";
import { localDb } from "../firebase";

interface VideoPlayerProps {
  channel: Channel;
  user: UserProfile | null;
  onTimeExpired: () => void;
  onTimeUpdate: (remainingSeconds: number) => void;
}

export default function VideoPlayer({ channel, user, onTimeExpired, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<shaka.Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Free trial timing state (obtained from user login status)
  const isPending = user?.status === UserStatus.PENDING;
  const [timeLeft, setTimeLeft] = useState<number>(user?.freeSecondsRemaining ?? 120);

  // Quality and Commentary language selection states
  const [qualities, setQualities] = useState<{ id: string; label: string; height?: number }[]>([
    { id: "auto", label: "Auto" },
    { id: "1080p", label: "1080p HD" },
    { id: "720p", label: "720p HD" },
    { id: "480p", label: "480p SD" },
    { id: "360p", label: "360p Low" },
  ]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const [languages, setLanguages] = useState<{ id: string; label: string; nativeLabel: string }[]>([
    { id: "swahili", label: "Swahili", nativeLabel: "Kiswahili" },
    { id: "english", label: "English", nativeLabel: "Kiingereza" },
  ]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("swahili");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastText(text);
    toastTimerRef.current = setTimeout(() => {
      setToastText(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const updateTracksAndLanguages = () => {
    if (!player) return;
    try {
      // 1. Get Variant Tracks for Quality
      const tracks = player.getVariantTracks();
      if (tracks && tracks.length > 0) {
        // Find unique resolutions/heights
        const uniqueHeights = Array.from(new Set(tracks.map(t => t.height).filter(Boolean))) as number[];
        uniqueHeights.sort((a, b) => b - a); // high to low
        
        const detectedQualities = uniqueHeights.map(h => ({
          id: `${h}p`,
          label: `${h}p ${h >= 720 ? "HD" : "SD"}`,
          height: h
        }));
        setQualities([
          { id: "auto", label: "Auto" },
          ...detectedQualities
        ]);
      }

      // 2. Get Audio Languages
      const langs = player.getAudioLanguages();
      if (langs && langs.length > 0) {
        const detectedLangs = langs.map(l => {
          let label = l;
          let nativeLabel = l;
          const lower = l.toLowerCase();
          if (lower.startsWith("sw") || lower.startsWith("kis")) {
            label = "Swahili";
            nativeLabel = "Kiswahili";
          } else if (lower.startsWith("en") || lower.startsWith("eng")) {
            label = "English";
            nativeLabel = "Kiingereza";
          }
          return { id: l, label, nativeLabel };
        });
        setLanguages(detectedLangs);
      }
    } catch (err) {
      console.warn("Failed to read shaka tracks:", err);
    }
  };

  const handleQualityChange = (qualityId: string) => {
    setSelectedQuality(qualityId);
    setShowQualityMenu(false);
    
    if (player) {
      try {
        if (qualityId === "auto") {
          // Enable abr (Auto Bitrate Regulator)
          player.configure({ streaming: { abr: { enabled: true } } });
          showToast("Ubora wa Video: Auto (Imewezeshwa)");
        } else {
          // Disable abr
          player.configure({ streaming: { abr: { enabled: false } } });
          // Find track with matching height
          const height = parseInt(qualityId);
          const tracks = player.getVariantTracks();
          const matchingTrack = tracks.find(t => t.height === height);
          if (matchingTrack) {
            player.selectVariantTrack(matchingTrack, true);
            showToast(`Ubora wa Video uliochaguliwa: ${qualityId}`);
          } else {
            showToast(`Ubora: ${qualityId} (Imewezeshwa)`);
          }
        }
      } catch (err: any) {
        console.warn("Error changing quality track:", err);
        showToast(`Ubora wa Video: ${qualityId}`);
      }
    } else {
      showToast(`Ubora wa Video: ${qualityId}`);
    }
  };

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setShowLanguageMenu(false);
    
    if (player) {
      try {
        const langs = player.getAudioLanguages();
        const match = langs.find(l => l === langId || l.toLowerCase().startsWith(langId.substring(0, 2)));
        if (match) {
          player.selectAudioLanguage(match);
          const label = langId === "swahili" || langId.startsWith("sw") ? "Kiswahili" : "Kiingereza";
          showToast(`Lugha tayari ni: ${label}`);
        } else {
          const label = langId === "swahili" ? "Kiswahili (Swahili)" : "Kiingereza (English)";
          showToast(`Umechagua lugha ya utangazaji ya: ${label}`);
        }
      } catch (err) {
        const label = langId === "swahili" ? "Kiswahili" : "Kiingereza";
        showToast(`Umechagua lugha ya utangazaji ya: ${label}`);
      }
    } else {
      const label = langId === "swahili" ? "Kiswahili" : "Kiingereza";
      showToast(`Umechagua lugha ya utangazaji ya: ${label}`);
    }
  };

  // Synchronize timeLeft state with prop if user changes
  useEffect(() => {
    if (user) {
      setTimeLeft(user.freeSecondsRemaining);
    }
  }, [user]);

  // Handle active countdown for PENDING users when video is playing
  useEffect(() => {
    if (!isPending || !isPlaying || timeLeft <= 0 || !user) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        
        // Persist to user record in local db
        localDb.updateUserProfile(user.uid, { freeSecondsRemaining: next });
        onTimeUpdate(next);

        if (next === 0) {
          clearInterval(timer);
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          onTimeExpired();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPending, isPlaying, user, onTimeExpired, onTimeUpdate]);

  // Append global token if requested
  const getStreamUrl = () => {
    let url = channel.streamUrl;
    if (channel.useGlobalToken) {
      const config = localDb.getGlobalConfig();
      const token = config?.globalToken?.trim();
      if (token) {
        // Strip any leading ? or & from token to normalize it
        let cleanToken = token;
        if (cleanToken.startsWith("?") || cleanToken.startsWith("&")) {
          cleanToken = cleanToken.substring(1);
        }
        
        // Check if token has name or is raw JWT
        let finalParam = cleanToken;
        if (!cleanToken.includes("cdntoken=") && !cleanToken.includes("token=")) {
          finalParam = "cdntoken=" + cleanToken;
        }

        // Get key-value name of token (e.g. cdntoken or token)
        const paramName = finalParam.split("=")[0];
        
        // If the URL already contains this parameter, we should replace or remove it to avoid duplicates
        if (url.includes(paramName + "=")) {
          const regex = new RegExp(`[?&]${paramName}=[^&]*`, 'g');
          url = url.replace(regex, '');
        }

        const sep = url.includes("?") ? "&" : "?";
        url = url + sep + finalParam;
      }
    }
    // Clean up any double parameter separators or trailing ones
    url = url.replace(/\s+/g, ""); // remove accidental whitespaces
    url = url.replace(/\?&/, "?").replace(/&&+/, "&");
    return url;
  };

  // Reset error if user gets activated whilst watching
  useEffect(() => {
    if (!isPending) {
      setErrorMsg(null);
    }
  }, [isPending]);

  // Initialize Shaka Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if free trial already exhausted
    if (isPending && timeLeft <= 0) {
      setErrorMsg("Dakika zako za bure zimeisha. Tafadhali lipia ili kuendelea kutazama .");
      setIsLoading(false);
      return;
    }

    // Install polyfills
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      setErrorMsg("Video streaming is not supported on this browser.");
      return;
    }

    const shakaPlayer = new shaka.Player();
    shakaPlayer.attach(video).then(() => {
      setPlayer(shakaPlayer);
    }).catch((err) => {
      console.error("Shaka Player attachment error:", err);
      setErrorMsg("Kosa la kuunganisha Kicheza Video: " + err.message);
    });

    return () => {
      if (shakaPlayer) {
        shakaPlayer.destroy().catch((err) => console.error("Error destroying shaka player:", err));
      }
    };
  }, [channel.id, isPending]);

  // Load stream url into Shaka Player
  useEffect(() => {
    if (!player || !videoRef.current) return;

    const loadStream = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const streamUrl = getStreamUrl();
        
        // Setup Widevine ClearKey DRM if available with smart split resilience in case of combined KID:KEY formatting
        let kid = channel.clearKeyKid?.trim() || "";
        let key = channel.clearKeyKey?.trim() || "";
        
        if (kid && kid.includes(":")) {
          const parts = kid.split(":");
          kid = parts[0].trim();
          key = parts[1].trim();
        } else if (key && key.includes(":")) {
          const parts = key.split(":");
          kid = parts[0].trim();
          key = parts[1].trim();
        }
        
        if (channel.streamType === "mpd" && kid && key) {
          player.configure({
            drm: {
              clearKeys: {
                [kid]: key
              }
            }
          });
        } else {
          // Clear previous DRM configuration
          player.configure({
            drm: {
              clearKeys: {}
            }
          });
        }

        // Configure general streaming features (retry, buffering, etc.)
        player.configure({
          streaming: {
            rebufferingGoal: 2,
            bufferingGoal: 10,
            retryParameters: {
              maxAttempts: 3,
              baseDelay: 1000,
              backoffFactor: 2
            }
          }
        });

        await player.load(streamUrl);
        setIsLoading(false);
        updateTracksAndLanguages();
        
        // Auto-play
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((e) => {
              console.warn("Autoplay blocked or halted:", e);
              setIsPlaying(false);
            });
        }
      } catch (err: any) {
        console.error("Shaka load error:", err);
        setIsLoading(false);
        
        // Native fallback if Shaka struggles with certain types of TS or MP4 directly
        if (videoRef.current && (channel.streamType === "mp4" || channel.streamType === "ts")) {
          try {
            videoRef.current.src = getStreamUrl();
            await videoRef.current.play();
            setIsPlaying(true);
          } catch (fallbackErr: any) {
            setErrorMsg("Imeshindwa kupakia channel hii. Tafadhali thibitisha link kwenye Admin Panel.");
          }
        } else {
          setErrorMsg("Mchezaji ameshindwa kupakia chanzo cha video (Error: " + err.code + ")");
        }
      }
    };

    loadStream();
  }, [player, channel.id, channel.streamUrl, channel.clearKeyKid, channel.clearKeyKey]);

  // Control Functions
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (isPending && timeLeft <= 0) {
        onTimeExpired();
        return;
      }
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Error playing video:", err);
          setErrorMsg("Imeshindwa kuanza kucheza video.");
        });
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div id="video_player_container" ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      
      {/* Toast Notification for Quality / Language commentary changes */}
      {toastText && (
        <div id="video_toast_notification" className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/95 border border-blue-500/30 rounded-full text-slate-100 text-xs font-black tracking-wider flex items-center gap-2 shadow-2xl z-30 transition-all duration-300">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>{toastText}</span>
        </div>
      )}

      {/* Quality Dropdown Menu */}
      {showQualityMenu && (
        <div className="absolute bottom-14 right-14 sm:right-24 bg-slate-950/95 border border-slate-800 rounded-xl p-2.5 min-w-[120px] shadow-2xl z-20 flex flex-col gap-1 text-xs text-slate-200">
          <div className="font-bold border-b border-slate-800 pb-1.5 text-[10px] uppercase tracking-wider text-slate-400 text-center">Ubora (Quality)</div>
          {qualities.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleQualityChange(q.id)}
              className={`w-full py-1 px-2.5 rounded text-left transition-colors font-semibold hover:bg-slate-800 cursor-pointer ${
                selectedQuality === q.id ? "text-cyan-400 font-black bg-slate-900" : ""
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Language Selection Dropdown Menu */}
      {showLanguageMenu && (
        <div className="absolute bottom-14 right-20 sm:right-48 bg-slate-950/95 border border-slate-800 rounded-xl p-2.5 min-w-[140px] shadow-2xl z-20 flex flex-col gap-1 text-xs text-slate-200">
          <div className="font-bold border-b border-slate-800 pb-1.5 text-[10px] uppercase tracking-wider text-slate-400 text-center">Lugha (Audio)</div>
          {languages.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleLanguageChange(l.id)}
              className={`w-full py-1 px-2.5 rounded text-left transition-colors font-semibold hover:bg-slate-800 cursor-pointer ${
                selectedLanguage === l.id ? "text-blue-400 font-black bg-slate-900" : ""
              }`}
            >
              <span>{l.nativeLabel}</span> <span className="text-[9px] text-slate-500 font-normal">({l.label})</span>
            </button>
          ))}
        </div>
      )}

      {/* Target Video Object */}
      <video
        ref={videoRef}
        id="video_stream_element"
        className={`w-full h-full object-contain transition-transform duration-300`}
        style={{ transform: `rotate(${rotation}deg)` }}
        playsInline
        referrerPolicy="no-referrer"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div id="video_loading" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20">
          <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-300">Inapakia mchezo wa KINGA TV...</p>
        </div>
      )}

      {/* Error or Expiry Alert Overlay */}
      {errorMsg && (
        <div id="video_error" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center px-6 z-20 animate-fade-in">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
          <p className="text-white text-base md:text-lg font-bold max-w-md">Mama Mia!</p>
          <p className="text-rose-300 text-sm md:text-base max-w-md mt-2 leading-relaxed">
            {errorMsg}
          </p>
          {isPending && timeLeft <= 0 && (
            <div className="mt-5 p-3.5 bg-blue-950/60 border border-blue-800 rounded-lg max-w-xs text-xs text-blue-200">
              Uanachama wako umefutwa au haujaidhinishwa. Wasiliana na Team ya KINGA TV ili kuwezesha akaunti yako kukuza utazamaji.
            </div>
          )}
        </div>
      )}

      {/* Expiry Stop Signal Trigger */}
      {isPending && timeLeft === 0 && !errorMsg && (
        <div id="free_trial_expired" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center px-6 z-20">
          <Clock className="w-14 h-14 text-rose-500 mb-4 animate-pulse" />
          <p className="text-white text-lg font-extrabold max-w-md">
            Dakika zako za bure zimeisha. Tafadhali lipia ili kuendelea kutazama .
          </p>
          <p className="text-slate-400 text-xs mt-3 max-w-sm">
            Kama umeshalipia, wasiliana na mtendaji wa mifumo wa KINGA TV ili kuidhinisha malipo na upokee akaunti ya ACTIVE.
          </p>
        </div>
      )}

      {/* Custom Bottom Control Bars */}
      {!isLoading && !errorMsg && (timeLeft > 0 || !isPending) && (
        <div id="video_controls" className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent flex items-center justify-between z-10 opacity-100 transition-opacity">
          
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              id="video_play_toggle"
              onClick={handlePlayPause}
              className="p-1.5 hover:bg-slate-800/80 rounded-full text-slate-100 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-cyan-400" /> : <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />}
            </button>

            {/* Mute and Volume controls */}
            <div className="flex items-center gap-1.5 group">
              <button
                id="video_mute_toggle"
                onClick={handleMuteToggle}
                className="p-1.5 hover:bg-slate-800/80 rounded-full text-slate-100 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
              </button>
              <input
                id="video_volume_slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            
            {/* Live Indicator or Expiry Timer */}
            {isPending && (
              <span id="video_time_left_badge" className="text-xs bg-red-950/70 border border-red-500/50 text-red-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                Trial: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            )}
            
            {!isPending && (
              <span id="video_live_badge" className="text-[10px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                FULL ACCESS LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Language Commentary Track Switch */}
            <div className="relative">
              <button
                id="video_language_toggle"
                onClick={() => {
                  setShowLanguageMenu(!showLanguageMenu);
                  setShowQualityMenu(false);
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1 hover:bg-slate-800/90 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-sans text-xs ${showLanguageMenu ? "bg-slate-800 text-white border border-blue-500/30" : ""}`}
              >
                <Languages className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline-block">
                  {languages.find(l => l.id === selectedLanguage)?.nativeLabel || "Lugha"}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Video Quality Switch */}
            <div className="relative">
              <button
                id="video_quality_toggle"
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowLanguageMenu(false);
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1 hover:bg-slate-800/90 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-sans text-xs ${showQualityMenu ? "bg-slate-800 text-white border border-cyan-500/30" : ""}`}
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline-block">
                  {qualities.find(q => q.id === selectedQuality)?.label || "Ubora"}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Rotate Button */}
            <button
              id="video_rotate_toggle"
              onClick={handleRotate}
              title="Kuzungusha View"
              className="p-1.5 hover:bg-slate-800/80 rounded-full text-slate-300 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              id="video_fullscreen_toggle"
              onClick={handleFullscreen}
              className="p-1.5 hover:bg-slate-800/80 rounded-full text-slate-300 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
