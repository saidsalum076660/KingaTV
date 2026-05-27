/**
 * Dynamic Firebase & Client-Side Local Database Engine for KINGA TV
 * Automatically falls back to high-fidelity Local Storage sync when Firebase is not yet connected.
 */

import { Channel, SlideshowItem, Match, UserProfile, UserStatus, GlobalConfig, SystemNotification } from "./types";

// Dynamic check for Firebase config file
let firebaseApp: any = null;
let firestoreDb: any = null;
let firebaseAuth: any = null;
let isRealFirebase = false;

// Default initial database content for KINGA TV
const DEFAULT_CHANNELS: Channel[] = [
  {
    id: "CH-azam-sport-1",
    name: "Azam Sport 1",
    logo: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><defs><radialGradient id=\"g1\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"%232563eb\"/><stop offset=\"100%\" stop-color=\"%231e3a8a\"/></radialGradient></defs><circle cx=\"60\" cy=\"60\" r=\"56\" fill=\"url(%23g1)\" stroke=\"%233b82f6\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"60\" r=\"50\" fill=\"none\" stroke=\"%23f59e0b\" stroke-width=\"2\" stroke-dasharray=\"4 2\"/><text x=\"50%\" y=\"42%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"18\" letter-spacing=\"2\">AZAM</text><rect x=\"18\" y=\"56\" width=\"84\" height=\"24\" rx=\"6\" fill=\"%23f97316\"/><text x=\"50%\" y=\"71%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"13\" letter-spacing=\"1\">SPORT 1</text><circle cx=\"60\" cy=\"98\" r=\"4\" fill=\"%2310b981\"/></svg>",
    poster: "https://images.unsplash.com/photo-1540747737956-378724044453?w=800&q=80",
    description: "Tazama matangazo ya kimichezo, Ligi Kuu ya Tanzania, na matukio live kupitia Azam Sport 1 HD.",
    category: "Sports",
    order: 1,
    streamType: "mpd",
    streamUrl: "https://cdnblncr.azamtvltd.co.tz/live/eds/AzamSport1/DASH/AzamSport1.mpd",
    clearKeyKid: "dd2101530e222f545997d4c553787f85",
    clearKeyKey: "c31df1600afc33799ecac543331803f2",
    useGlobalToken: true
  },
  {
    id: "CH-azam-sport-2",
    name: "Azam Sport 2",
    logo: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><defs><radialGradient id=\"g2\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"%232563eb\"/><stop offset=\"100%\" stop-color=\"%231e3a8a\"/></radialGradient></defs><circle cx=\"60\" cy=\"60\" r=\"56\" fill=\"url(%23g2)\" stroke=\"%233b82f6\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"60\" r=\"50\" fill=\"none\" stroke=\"%23f59e0b\" stroke-width=\"2\" stroke-dasharray=\"4 2\"/><text x=\"50%\" y=\"42%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"18\" letter-spacing=\"2\">AZAM</text><rect x=\"18\" y=\"56\" width=\"84\" height=\"24\" rx=\"6\" fill=\"%2306b6d4\"/><text x=\"50%\" y=\"71%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"13\" letter-spacing=\"1\">SPORT 2</text><circle cx=\"60\" cy=\"98\" r=\"4\" fill=\"%2310b981\"/></svg>",
    poster: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80",
    description: "Tazama matangazo ya kimichezo na ligi mbalimbali kupitia Azam Sport 2 HD.",
    category: "Sports",
    order: 2,
    streamType: "mpd",
    streamUrl: "https://cdnblncr.azamtvltd.co.tz/live/eds/AzamSport2/DASH/AzamSport2.mpd",
    clearKeyKid: "1b7d44d798c351acc02f33ddfbb7682a",
    clearKeyKey: "739e7499125b31cc9948da8057b84cf9",
    useGlobalToken: true
  },
  {
    id: "CH-azam-sport-3",
    name: "Azam Sport 3",
    logo: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><defs><radialGradient id=\"g3\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"%232563eb\"/><stop offset=\"100%\" stop-color=\"%231e3a8a\"/></radialGradient></defs><circle cx=\"60\" cy=\"60\" r=\"56\" fill=\"url(%23g3)\" stroke=\"%233b82f6\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"60\" r=\"50\" fill=\"none\" stroke=\"%23f59e0b\" stroke-width=\"2\" stroke-dasharray=\"4 2\"/><text x=\"50%\" y=\"42%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"18\" letter-spacing=\"2\">AZAM</text><rect x=\"18\" y=\"56\" width=\"84\" height=\"24\" rx=\"6\" fill=\"%2310b981\"/><text x=\"50%\" y=\"71%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"13\" letter-spacing=\"1\">SPORT 3</text><circle cx=\"60\" cy=\"98\" r=\"4\" fill=\"%2310b981\"/></svg>",
    poster: "https://images.unsplash.com/photo-1540747737956-378724044453?w=800&q=80",
    description: "Tazama Azam Sport 3 HD ikikuletea mechi kali za kusisimua kila siku.",
    category: "Sports",
    order: 3,
    streamType: "mpd",
    streamUrl: "https://cdnblncr.azamtvltd.co.tz/live/eds/AzamSport3/DASH/AzamSport3.mpd",
    clearKeyKid: "51c2d733a54306fdf89acd4c9d4f6005",
    clearKeyKey: "2f12d7b889de381a9fb5326ca3aa166d",
    useGlobalToken: true
  },
  {
    id: "CH-azam-sport-4",
    name: "Azam Sport 4",
    logo: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><defs><radialGradient id=\"g4\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"%232563eb\"/><stop offset=\"100%\" stop-color=\"%231e3a8a\"/></radialGradient></defs><circle cx=\"60\" cy=\"60\" r=\"56\" fill=\"url(%23g4)\" stroke=\"%233b82f6\" stroke-width=\"4\"/><circle cx=\"60\" cy=\"60\" r=\"50\" fill=\"none\" stroke=\"%23f59e0b\" stroke-width=\"2\" stroke-dasharray=\"4 2\"/><text x=\"50%\" y=\"42%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"18\" letter-spacing=\"2\">AZAM</text><rect x=\"18\" y=\"56\" width=\"84\" height=\"24\" rx=\"6\" fill=\"%23a855f7\"/><text x=\"50%\" y=\"71%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%23ffffff\" font-family=\"'Inter', sans-serif\" font-weight=\"900\" font-size=\"13\" letter-spacing=\"1\">SPORT 4</text><circle cx=\"60\" cy=\"98\" r=\"4\" fill=\"%2310b981\"/></svg>",
    poster: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80",
    description: "Tazama Azam Sport 4 HD kwa maelezo na uchambuzi wa kitaalam wa michezo yote.",
    category: "Sports",
    order: 4,
    streamType: "mpd",
    streamUrl: "https://cdnblncr.azamtvltd.co.tz/live/eds/AzamSport4/DASH/AzamSport4.mpd",
    clearKeyKid: "04ece212a9201531afdd91c6f468e0b3",
    clearKeyKey: "1606cddebd3c36308ec5072350fb790a",
    useGlobalToken: true
  },
  {
    id: "CH-kix-movies",
    name: "KIX Movies",
    logo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' width='120' height='120'><defs><radialGradient id='gKix' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='%23dc2626'/><stop offset='100%' stop-color='%237f1d1d'/></radialGradient></defs><circle cx='60' cy='60' r='56' fill='url(%23gKix)' stroke='%23ef4444' stroke-width='4'/><polygon points='60,22 63,29 71,29 65,34 67,41 60,36 53,41 55,34 49,29 57,29' fill='%23fbbf24'/><text x='50%' y='62%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Space Grotesk, sans-serif' font-weight='950' font-size='28' font-style='italic' letter-spacing='1'>KIX</text><rect x='22' y='78' width='76' height='18' rx='4' fill='%23eab308'/><text x='50%' y='88%' dominant-baseline='middle' text-anchor='middle' fill='%231e1b4b' font-family='Inter, sans-serif' font-weight='900' font-size='10' letter-spacing='1.5'>MOVIES</text></svg>",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    description: "Tazama filamu za kusisimua za mapigano na matukio live masaa 24 kupitia KIX Movies.",
    category: "Movies",
    order: 5,
    streamType: "mpd",
    streamUrl: "https://cdnblncr.azamtvltd.co.tz/live/eds/KIXMovies/DASH/KIXMovies.mpd",
    clearKeyKid: "a7e155b282f33335ae8d553f169f443c",
    clearKeyKey: "c3fdcfd5d509f1ed8550d76a525e34e5",
    useGlobalToken: true
  }
];

const DEFAULT_SLIDESHOW: SlideshowItem[] = [];

const DEFAULT_MATCHES: Match[] = [
  {
    id: "match-1",
    teamAName: "Yanga SC",
    teamALogo: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=80&q=80",
    teamBName: "Simba SC",
    teamBLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=80&q=80",
    time: "16:00",
    date: "Ataonekana Live Leo",
    channelId: "CH-azam-sports-1",
    isFeatured: true,
    status: "LIVE",
    score: "1 - 0"
  },
  {
    id: "match-2",
    teamAName: "Arsenal",
    teamALogo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=80&q=80",
    teamBName: "Chelsea",
    teamBLogo: "https://images.unsplash.com/photo-1540747737956-378725752c03?w=80&q=80",
    time: "20:00",
    date: "Kesho",
    channelId: "CH-world-cup-live",
    isFeatured: true,
    status: "UPCOMING"
  },
  {
    id: "match-3",
    teamAName: "Real Madrid",
    teamALogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=80&q=80",
    teamBName: "Bayern Munich",
    teamBLogo: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=80&q=80",
    time: "21:45",
    date: "2026-05-26",
    channelId: "CH-azam-sports-1",
    isFeatured: false,
    status: "UPCOMING"
  }
];

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  globalToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3Nzk3NDkxODUsInNpcCI6IjE4LjY4LjI4LjQ5In0.eZCM6Os5lY3JI9OgxQxiiafRlzN955irkOkp0LxCGBGAMPmaJzaq_RQP-XE5QB_BXEzHAkSmYvMPLX8-LwJBZQ",
  appLogo: "",
  supabaseUrl: "https://axemqydlmyiacilzduge.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW1xeWRsbXlpYWNpbHpkdWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTUxMDAsImV4cCI6MjA5NTI3MTEwMH0.95kYXcp-2l38qH3uedp6Zt12He-nuIpxEFvb3bXt9Ac",
  updatedAt: new Date().toISOString(),
  slideshowIntervalSeconds: 5
};

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-1",
    title: "PROMO: Jiunge na Kinga TV",
    message: "Karibu! Lipia sasa ili uweze kutazama mechi zote live bila kikomo cha dakika 2 za bure.",
    createdAt: new Date().toISOString()
  }
];

// Initialize localStorage with dummy data if not present
function initLocalStorage() {
  if (!localStorage.getItem("kingatv_channels")) {
    localStorage.setItem("kingatv_channels", JSON.stringify(DEFAULT_CHANNELS));
  }
  if (!localStorage.getItem("kingatv_slideshow")) {
    localStorage.setItem("kingatv_slideshow", JSON.stringify(DEFAULT_SLIDESHOW));
  }
  if (!localStorage.getItem("kingatv_matches")) {
    localStorage.setItem("kingatv_matches", JSON.stringify(DEFAULT_MATCHES));
  }
  if (!localStorage.getItem("kingatv_config")) {
    localStorage.setItem("kingatv_config", JSON.stringify(DEFAULT_GLOBAL_CONFIG));
  }
  if (!localStorage.getItem("kingatv_notifications")) {
    localStorage.setItem("kingatv_notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
  if (!localStorage.getItem("kingatv_users")) {
    // Initial dummy users (only keeping targeted admin and user accounts as per supreme request)
    const initialUsers: UserProfile[] = [
      {
        uid: "user-admin",
        email: "saidsalum076660@gmail.com",
        name: "Said Salum (Admin)",
        phone: "076660",
        status: UserStatus.ACTIVE,
        createdAt: "2026-05-25T13:40:00Z",
        freeSecondsRemaining: 120,
        subscriptionExpiresAt: "2030-12-31T23:59:59Z",
        approvedByAdmin: true,
        password: "tanganyika"
      },
      {
        uid: "user-customer-requested",
        email: "saidsalum0741@gmail.com",
        name: "Said Salum (Mteja)",
        phone: "0711317780",
        status: UserStatus.PENDING,
        createdAt: "2026-05-25T13:42:00Z",
        freeSecondsRemaining: 120,
        subscriptionExpiresAt: null,
        approvedByAdmin: false,
        password: "user123"
      }
    ];
    localStorage.setItem("kingatv_users", JSON.stringify(initialUsers));
  }
}

// Removed user-filtering logic to keep all registered users persistent on Admin Dashboard as per the latest request
function cleanAndPreserveOnlyThreeUsers() {
  // Keeping all user profiles persistent 
}

// Function to immediately clear and wipe all existing default channels, slideshow banners, and matches once so the customer starts from scratch with the 5 preloaded channels (Azam + KIX)
function cleanAndClearAllChannelsSlidesAndMatches() {
  if (!localStorage.getItem("kingatv_cleared_v11_svg_logos_ok")) {
    try {
      const rawChannels = localStorage.getItem("kingatv_channels") || "[]";
      let oldChannelIds: string[] = [];
      try {
        const parsed = JSON.parse(rawChannels);
        if (Array.isArray(parsed)) {
          oldChannelIds = parsed.map((c: any) => c.id);
        }
      } catch (_) {}

      const rawSlides = localStorage.getItem("kingatv_slideshow") || "[]";
      let oldSlideIds: string[] = [];
      try {
        const parsed = JSON.parse(rawSlides);
        if (Array.isArray(parsed)) {
          oldSlideIds = parsed.map((s: any) => s.id);
        }
      } catch (_) {}

      const rawMatches = localStorage.getItem("kingatv_matches") || "[]";
      let oldMatchIds: string[] = [];
      try {
        const parsed = JSON.parse(rawMatches);
        if (Array.isArray(parsed)) {
          oldMatchIds = parsed.map((m: any) => m.id);
        }
      } catch (_) {}

      // Preloaded channels to keep
      const preloadedIds = ["CH-azam-sport-1", "CH-azam-sport-2", "CH-azam-sport-3", "CH-azam-sport-4", "CH-kix-movies"];
      const idsToDelete = oldChannelIds.filter(id => !preloadedIds.includes(id));

      // Clear all locally, but set Azam + KIX preloaded channels
      localStorage.setItem("kingatv_channels", JSON.stringify(DEFAULT_CHANNELS));
      localStorage.setItem("kingatv_slideshow", JSON.stringify([]));
      localStorage.setItem("kingatv_matches", JSON.stringify([]));
      localStorage.setItem("kingatv_config", JSON.stringify(DEFAULT_GLOBAL_CONFIG));

      // Persist deleted lists so sync flows won't fetch them from Supabase in the background
      const deletedTrackChans: string[] = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
      idsToDelete.forEach(id => {
        if (!deletedTrackChans.includes(id)) deletedTrackChans.push(id);
      });
      // Ensure we remove the preloaded channels from any blocked list
      const filteredDeletedTrackChans = deletedTrackChans.filter(id => !preloadedIds.includes(id));
      localStorage.setItem("kingatv_deleted_channels", JSON.stringify(filteredDeletedTrackChans));

      const deletedTrackSlides: string[] = JSON.parse(localStorage.getItem("kingatv_deleted_slides") || "[]");
      oldSlideIds.forEach(id => {
        if (!deletedTrackSlides.includes(id)) deletedTrackSlides.push(id);
      });
      localStorage.setItem("kingatv_deleted_slides", JSON.stringify(deletedTrackSlides));

      const deletedTrackMatches: string[] = JSON.parse(localStorage.getItem("kingatv_deleted_matches") || "[]");
      oldMatchIds.forEach(id => {
        if (!deletedTrackMatches.includes(id)) deletedTrackMatches.push(id);
      });
      localStorage.setItem("kingatv_deleted_matches", JSON.stringify(deletedTrackMatches));

      localStorage.setItem("kingatv_cleared_v11_svg_logos_ok", "true");

      // Signal Supabase background cleans & inserts
      import("./supabase").then(m => {
        // Delete older non-preloaded channels
        idsToDelete.forEach(id => {
          m.deleteChannelFromSupabase(id).catch(() => {});
        });
        
        // Push the preloaded channels up to Supabase so they are visible on all client apps
        DEFAULT_CHANNELS.forEach(c => {
          m.pushChannelUpdateToSupabase(c).catch(() => {});
        });

        // Push config up to Supabase
        m.pushConfigUpdateToSupabase(DEFAULT_GLOBAL_CONFIG).catch(() => {});

        oldSlideIds.forEach(id => {
          m.deleteSlideFromSupabase(id).catch(() => {});
        });
        oldMatchIds.forEach(id => {
          m.deleteMatchFromSupabase(id).catch(() => {});
        });
      }).catch(() => {});

    } catch (e) {
      console.warn("Error running immediate wipe of channels, slides, and matches:", e);
    }
  }
}

initLocalStorage();
cleanAndClearAllChannelsSlidesAndMatches();

/**
 * Helper to ensure channel SVG logos are properly UTF8/Base64 escaped so they dynamically render in standard HTML img tags flawlessly.
 */
export function getSafeLogoUrl(logo: string | undefined, poster: string = ""): string {
  if (!logo) return poster;
  const trimmed = logo.trim();
  if (trimmed.startsWith("data:image/svg+xml;utf8,")) {
    try {
      const rawSvg = trimmed.substring("data:image/svg+xml;utf8,".length);
      const base64 = btoa(unescape(encodeURIComponent(rawSvg)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
      return poster;
    }
  }
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
    try {
      const base64 = btoa(unescape(encodeURIComponent(trimmed)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch (e) {
      return poster;
    }
  }
  if (trimmed.toUpperCase().includes("LOGO") && !trimmed.includes("/")) {
    return poster;
  }
  return logo;
}

/**
 * Local Database Management API (Simulates Firestore & Auth)
 */
export const localDb = {
  getChannels(): Channel[] {
    const raw: Channel[] = JSON.parse(localStorage.getItem("kingatv_channels") || "[]");
    return raw.map(c => ({
      ...c,
      logo: getSafeLogoUrl(c.logo, c.poster)
    }));
  },
  saveChannels(channels: Channel[]) {
    localStorage.setItem("kingatv_channels", JSON.stringify(channels));
    this.triggerUpdate();
    import("./supabase").then(m => {
      channels.forEach(c => m.pushChannelUpdateToSupabase(c));
    }).catch(e => console.warn("Supabase load error:", e));
  },
  deleteChannel(id: string) {
    const channels = this.getChannels();
    const updated = channels.filter(c => c.id !== id);
    localStorage.setItem("kingatv_channels", JSON.stringify(updated));
    
    // Save locally deleted channel IDs to prevent sync re-syncing them back
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
      if (!deletedTrack.includes(id)) {
        deletedTrack.push(id);
        localStorage.setItem("kingatv_deleted_channels", JSON.stringify(deletedTrack));
      }
    } catch (_) {}

    this.triggerUpdate();
    import("./supabase").then(m => {
      m.deleteChannelFromSupabase(id);
    }).catch(e => console.warn("Supabase delete channel load error:", e));
  },
  getSlideshow(): SlideshowItem[] {
    return JSON.parse(localStorage.getItem("kingatv_slideshow") || "[]").sort((a: any, b: any) => a.order - b.order);
  },
  saveSlideshow(slides: SlideshowItem[]) {
    localStorage.setItem("kingatv_slideshow", JSON.stringify(slides));
    this.triggerUpdate();
    import("./supabase").then(m => {
      slides.forEach(s => m.pushSlideshowUpdateToSupabase(s));
    }).catch(e => console.warn("Supabase load error:", e));
  },
  deleteSlideshow(id: string) {
    const slides = this.getSlideshow();
    const updated = slides.filter(s => s.id !== id);
    localStorage.setItem("kingatv_slideshow", JSON.stringify(updated));

    // Save locally deleted slide IDs to prevent sync re-syncing them back
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_slides") || "[]");
      if (!deletedTrack.includes(id)) {
        deletedTrack.push(id);
        localStorage.setItem("kingatv_deleted_slides", JSON.stringify(deletedTrack));
      }
    } catch (_) {}

    this.triggerUpdate();
    import("./supabase").then(m => {
      m.deleteSlideFromSupabase(id);
    }).catch(e => console.warn("Supabase delete slide load error:", e));
  },
  getMatches(): Match[] {
    return JSON.parse(localStorage.getItem("kingatv_matches") || "[]");
  },
  saveMatches(matches: Match[]) {
    localStorage.setItem("kingatv_matches", JSON.stringify(matches));
    this.triggerUpdate();
    import("./supabase").then(m => {
      matches.forEach(mat => m.pushMatchUpdateToSupabase(mat));
    }).catch(e => console.warn("Supabase load error:", e));
  },
  deleteMatch(id: string) {
    const matches = this.getMatches();
    const updated = matches.filter(m => m.id !== id);
    localStorage.setItem("kingatv_matches", JSON.stringify(updated));

    // Save locally deleted match IDs to prevent sync re-syncing them back
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_matches") || "[]");
      if (!deletedTrack.includes(id)) {
        deletedTrack.push(id);
        localStorage.setItem("kingatv_deleted_matches", JSON.stringify(deletedTrack));
      }
    } catch (_) {}

    this.triggerUpdate();
    import("./supabase").then(m => {
      m.deleteMatchFromSupabase(id);
    }).catch(e => console.warn("Supabase delete match load error:", e));
  },
  getGlobalConfig(): GlobalConfig {
    const raw = localStorage.getItem("kingatv_config");
    if (!raw) return DEFAULT_GLOBAL_CONFIG;
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_GLOBAL_CONFIG,
        ...parsed,
        supabaseUrl: parsed.supabaseUrl || DEFAULT_GLOBAL_CONFIG.supabaseUrl,
        supabaseAnonKey: parsed.supabaseAnonKey || DEFAULT_GLOBAL_CONFIG.supabaseAnonKey
      };
    } catch (e) {
      return DEFAULT_GLOBAL_CONFIG;
    }
  },
  saveGlobalConfig(config: GlobalConfig) {
    localStorage.setItem("kingatv_config", JSON.stringify(config));
    this.triggerUpdate();
    import("./supabase").then(m => {
      m.pushConfigUpdateToSupabase(config);
    }).catch(e => console.warn("Supabase load error:", e));
  },
  getNotifications(): SystemNotification[] {
    return JSON.parse(localStorage.getItem("kingatv_notifications") || "[]");
  },
  saveNotifications(notifs: SystemNotification[]) {
    localStorage.setItem("kingatv_notifications", JSON.stringify(notifs));
    this.triggerUpdate();
  },
  getUsers(): UserProfile[] {
    return JSON.parse(localStorage.getItem("kingatv_users") || "[]");
  },
  saveUsers(users: UserProfile[]) {
    localStorage.setItem("kingatv_users", JSON.stringify(users));
    this.triggerUpdate();
    import("./supabase").then(m => {
      users.forEach(u => m.pushUserUpdateToSupabase(u));
    }).catch(e => console.warn("Supabase load error:", e));
  },
  getUser(uid: string): UserProfile | null {
    const users = this.getUsers();
    return users.find(u => u.uid === uid) || null;
  },
  updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const users = this.getUsers();
    const updated = users.map(u => {
      if (u.uid === uid) {
        return { ...u, ...updates };
      }
      return u;
    });
    this.saveUsers(updated);
    
    // Also update current active user session if applicable
    const active = localStorage.getItem("kingatv_active_user");
    if (active) {
      const activeObj = JSON.parse(active);
      if (activeObj.uid === uid) {
        localStorage.setItem("kingatv_active_user", JSON.stringify({ ...activeObj, ...updates }));
      }
    }
  },
  deleteUser(uid: string) {
    const users = this.getUsers();
    const updated = users.filter(u => u.uid !== uid);
    localStorage.setItem("kingatv_users", JSON.stringify(updated));
    
    // Save locally deleted user UIDs to prevent sync re-syncing them back
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_users") || "[]");
      if (!deletedTrack.includes(uid)) {
        deletedTrack.push(uid);
        localStorage.setItem("kingatv_deleted_users", JSON.stringify(deletedTrack));
      }
    } catch (_) {}

    this.triggerUpdate();
    import("./supabase").then(m => {
      m.deleteUserFromSupabase(uid);
    }).catch(e => console.warn("Supabase delete sync in localDb error:", e));
  },


  // Event dispatching to simulate snapListeners in single tab
  listeners: [] as Array<() => void>,
  onUpdate(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  triggerUpdate() {
    this.listeners.forEach(l => l());
  }
};

/**
 * Fallback auth controller
 */
export const localAuth = {
  getCurrentUser(): UserProfile | null {
    const u = localStorage.getItem("kingatv_active_user");
    return u ? JSON.parse(u) : null;
  },
  register(name: string, email: string, phone: string, status: UserStatus = UserStatus.PENDING, password?: string, autoLogin: boolean = true): UserProfile {
    const newUser: UserProfile = {
      uid: "user_" + Math.random().toString(36).substring(2, 10),
      email,
      name,
      phone,
      status,
      createdAt: new Date().toISOString(),
      freeSecondsRemaining: 120,
      subscriptionExpiresAt: null,
      approvedByAdmin: false,
      password: password || "12345"
    };

    // Store in all users list
    const users = localDb.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email tayari imesajiliwa. Tafadhali ingia.");
    }
    users.push(newUser);
    localDb.saveUsers(users);

    // Save as active session only if autoLogin is true
    if (autoLogin) {
      localStorage.setItem("kingatv_active_user", JSON.stringify(newUser));
    }
    localDb.triggerUpdate();
    return newUser;
  },
  login(email: string, password?: string): UserProfile {
    const normalizedEmail = email.trim().toLowerCase();

    // Admin override check
    if (normalizedEmail === "saidsalum076660@gmail.com" || normalizedEmail === "saidsalum076660@gmailo.com") {
      if (password !== "tanganyika") {
        throw new Error("Nenosiri si sahihi (Incorrect password).");
      }
      const users = localDb.getUsers();
      let adminUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!adminUser) {
        adminUser = {
          uid: normalizedEmail === "saidsalum076660@gmail.com" ? "user-admin-said" : "user-admin-typo",
          email: normalizedEmail,
          name: normalizedEmail === "saidsalum076660@gmail.com" ? "Said Salum" : "Said Salum (Typo Admin)",
          phone: "076660",
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          freeSecondsRemaining: 120,
          subscriptionExpiresAt: "2030-12-31T23:59:59Z",
          approvedByAdmin: true,
          password: "tanganyika"
        };
        users.push(adminUser);
        localDb.saveUsers(users);
      }
      localStorage.setItem("kingatv_active_user", JSON.stringify(adminUser));
      localDb.triggerUpdate();
      return adminUser;
    }

    if (normalizedEmail === "admin@kingatv.com") {
      if (password !== "tanganyika") {
        throw new Error("Nenosiri si sahihi (Incorrect password).");
      }
      const users = localDb.getUsers();
      let generalAdmin = users.find(u => u.email.toLowerCase() === "admin@kingatv.com");
      if (!generalAdmin) {
        generalAdmin = {
          uid: "user-admin-gen",
          email: "admin@kingatv.com",
          name: "Kinga Admin",
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          freeSecondsRemaining: 120,
          subscriptionExpiresAt: "2030-12-31T23:59:59Z",
          approvedByAdmin: true,
          password: "tanganyika"
        };
        users.push(generalAdmin);
        localDb.saveUsers(users);
      }
      localStorage.setItem("kingatv_active_user", JSON.stringify(generalAdmin));
      localDb.triggerUpdate();
      return generalAdmin;
    }

    const users = localDb.getUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!existingUser) {
      throw new Error("Mtumiaji hajapatikana. Tafadhali jisajili kwanza.");
    }

    // Verify password if user has password set
    if (existingUser.password && existingUser.password !== password) {
      throw new Error("Nenosiri si sahihi (Incorrect password).");
    }

    if (existingUser.status === UserStatus.BLOCKED) {
      throw new Error("Akaunti yako imezuiwa na msimamizi (Blocked). Siliana nasi.");
    }

    localStorage.setItem("kingatv_active_user", JSON.stringify(existingUser));
    localDb.triggerUpdate();
    return existingUser;
  },
  logout() {
    localStorage.removeItem("kingatv_active_user");
    localDb.triggerUpdate();
  }
};
