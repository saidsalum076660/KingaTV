/**
 * Dynamic Firebase & Client-Side Local Database Engine for KINGA TV
 * Automatically falls back to high-fidelity Local Storage sync when Firebase is not yet connected.
 */

import { Channel, SlideshowItem, Match, UserProfile, UserStatus, GlobalConfig, SystemNotification } from "./types";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6gUL9GPdo2xjxqPcFZo_E64OwwE0_Kqw",
  authDomain: "kingatv-d5189.firebaseapp.com",
  projectId: "kingatv-d5189",
  storageBucket: "kingatv-d5189.firebasestorage.app",
  messagingSenderId: "697366143552",
  appId: "1:697366143552:web:92cf70a0901aec4b48f5a5"
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuthInstance = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
const isRealFirebase = true;

// Firestore Error Handling utilities
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuthInstance.currentUser?.uid,
      email: firebaseAuthInstance.currentUser?.email,
      emailVerified: firebaseAuthInstance.currentUser?.emailVerified,
      isAnonymous: firebaseAuthInstance.currentUser?.isAnonymous,
      tenantId: firebaseAuthInstance.currentUser?.tenantId,
      providerInfo: firebaseAuthInstance.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error details: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

// Write helpers
export async function fsSaveChannel(channel: Channel) {
  try {
    const { ...plain } = channel;
    await setDoc(doc(firestoreDb, "channels", channel.id), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `channels/${channel.id}`);
  }
}

export async function fsDeleteChannel(id: string) {
  try {
    await deleteDoc(doc(firestoreDb, "channels", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `channels/${id}`);
  }
}

export async function fsSaveSlide(slide: SlideshowItem) {
  try {
    const { ...plain } = slide;
    await setDoc(doc(firestoreDb, "slideshow", slide.id), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `slideshow/${slide.id}`);
  }
}

export async function fsDeleteSlide(id: string) {
  try {
    await deleteDoc(doc(firestoreDb, "slideshow", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `slideshow/${id}`);
  }
}

export async function fsSaveMatch(match: Match) {
  try {
    const { ...plain } = match;
    await setDoc(doc(firestoreDb, "matches", match.id), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `matches/${match.id}`);
  }
}

export async function fsDeleteMatch(id: string) {
  try {
    await deleteDoc(doc(firestoreDb, "matches", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
  }
}

export async function fsSaveConfig(config: GlobalConfig) {
  try {
    const { ...plain } = config;
    await setDoc(doc(firestoreDb, "settings", "global"), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings/global");
  }
}

export async function fsSaveNotification(notif: SystemNotification) {
  try {
    const { ...plain } = notif;
    await setDoc(doc(firestoreDb, "notifications", notif.id), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function fsDeleteNotification(id: string) {
  try {
    await deleteDoc(doc(firestoreDb, "notifications", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
  }
}

export async function fsSaveUser(user: UserProfile) {
  try {
    const { ...plain } = user;
    await setDoc(doc(firestoreDb, "users", user.uid), plain);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function fsDeleteUser(uid: string) {
  try {
    await deleteDoc(doc(firestoreDb, "users", uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

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
  supabaseAnonKey: "sb_publishable_rUpbgSlp-1xauhgjdf-ozw_TzfLnvy_",
  updatedAt: "2020-01-01T00:00:00Z",
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
  const localChannelsRaw = localStorage.getItem("kingatv_channels");
  if (!localChannelsRaw || localChannelsRaw === "[]") {
    localStorage.setItem("kingatv_channels", JSON.stringify(DEFAULT_CHANNELS));
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
      const preloadedIds = ["CH-azam-sport-1", "CH-azam-sport-2", "CH-azam-sport-3", "CH-azam-sport-4", "CH-kix-movies"];
      const updatedDeleted = deletedTrack.filter((id: string) => !preloadedIds.includes(id));
      localStorage.setItem("kingatv_deleted_channels", JSON.stringify(updatedDeleted));
    } catch (_) {}
  }
  if (!localStorage.getItem("kingatv_slideshow")) {
    localStorage.setItem("kingatv_slideshow", JSON.stringify(DEFAULT_SLIDESHOW));
  }
  const localMatchesRaw = localStorage.getItem("kingatv_matches");
  if (!localMatchesRaw || localMatchesRaw === "[]") {
    localStorage.setItem("kingatv_matches", JSON.stringify(DEFAULT_MATCHES));
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_matches") || "[]");
      const preloadedMatchIds = ["match-1", "match-2", "match-3"];
      const updatedDeleted = deletedTrack.filter((id: string) => !preloadedMatchIds.includes(id));
      localStorage.setItem("kingatv_deleted_matches", JSON.stringify(updatedDeleted));
    } catch (_) {}
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

function wipeAllUserCreatedChannelsKeepSlides() {
  if (!localStorage.getItem("kingatv_v12_wipe_user_channels_done_v2")) {
    try {
      const rawChannels = localStorage.getItem("kingatv_channels") || "[]";
      let channelIds: string[] = [];
      try {
        const parsed = JSON.parse(rawChannels);
        if (Array.isArray(parsed)) {
          channelIds = parsed.map((c: any) => c.id);
        }
      } catch (_) {}

      // Clear the local storage list of channels
      localStorage.setItem("kingatv_channels", JSON.stringify([]));

      // Append these channel IDs to the deleted tracking list to avoid re-syncing them back from Supabase
      const deletedTrackChans: string[] = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
      channelIds.forEach(id => {
        if (!deletedTrackChans.includes(id)) deletedTrackChans.push(id);
      });
      localStorage.setItem("kingatv_deleted_channels", JSON.stringify(deletedTrackChans));

      // Mark the execution done
      localStorage.setItem("kingatv_v12_wipe_user_channels_done_v2", "true");

      // Signal Supabase background cleans immediately
      import("./supabase").then(m => {
        channelIds.forEach(id => {
          m.deleteChannelFromSupabase(id).catch(() => {});
        });
        m.syncDatabaseWithSupabase().catch(() => {});
      }).catch(() => {});
    } catch (e) {
      console.warn("Error running local channels wipe:", e);
    }
  }
}

// wipeAllUserCreatedChannelsKeepSlides();


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
    
    // Parse persistent overrides if any to prevent auto-changing
    let overrides: Record<string, any> = {};
    try {
      const overridesRaw = localStorage.getItem("kingatv_persistent_keys_map");
      if (overridesRaw) {
        overrides = JSON.parse(overridesRaw);
      }
    } catch (_) {}

    return raw.map(c => {
      const ov = overrides[c.id];
      return {
        ...c,
        logo: getSafeLogoUrl(c.logo, c.poster),
        ...(ov || {}) // Apply overrides over base properties
      };
    });
  },
  saveChannels(channels: Channel[]) {
    localStorage.setItem("kingatv_channels", JSON.stringify(channels));

    // Also store each channel's keys as persistent overrides
    try {
      const overridesRaw = localStorage.getItem("kingatv_persistent_keys_map") || "{}";
      const overrides = JSON.parse(overridesRaw);
      channels.forEach(c => {
        overrides[c.id] = {
          clearKeyKid: c.clearKeyKid,
          clearKeyKey: c.clearKeyKey,
          streamUrl: c.streamUrl,
          useGlobalToken: c.useGlobalToken
        };
      });
      localStorage.setItem("kingatv_persistent_keys_map", JSON.stringify(overrides));
    } catch (_) {}

    this.triggerUpdate();

    // Sync to Firestore
    channels.forEach(c => {
      fsSaveChannel(c).catch(e => console.warn("Firestore save channel error:", e));
    });
  },
  deleteChannel(id: string) {
    const channels = this.getChannels();
    const updated = channels.filter(c => c.id !== id);
    localStorage.setItem("kingatv_channels", JSON.stringify(updated));
    
    // Also remove from persistent overrides
    try {
      const overridesRaw = localStorage.getItem("kingatv_persistent_keys_map") || "{}";
      const overrides = JSON.parse(overridesRaw);
      delete overrides[id];
      localStorage.setItem("kingatv_persistent_keys_map", JSON.stringify(overrides));
    } catch (_) {}
    
    // Save locally deleted channel IDs to prevent sync re-syncing them back
    try {
      const deletedTrack = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
      if (!deletedTrack.includes(id)) {
        deletedTrack.push(id);
        localStorage.setItem("kingatv_deleted_channels", JSON.stringify(deletedTrack));
      }
    } catch (_) {}

    this.triggerUpdate();

    // Sync deletion to Firestore
    fsDeleteChannel(id).catch(e => console.warn("Firestore delete channel error:", e));
  },
  getSlideshow(): SlideshowItem[] {
    return JSON.parse(localStorage.getItem("kingatv_slideshow") || "[]").sort((a: any, b: any) => a.order - b.order);
  },
  saveSlideshow(slides: SlideshowItem[]) {
    localStorage.setItem("kingatv_slideshow", JSON.stringify(slides));
    this.triggerUpdate();

    // Sync to Firestore
    slides.forEach(s => {
      fsSaveSlide(s).catch(e => console.warn("Firestore save slide error:", e));
    });
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

    // Sync deletion to Firestore
    fsDeleteSlide(id).catch(e => console.warn("Firestore delete slide error:", e));
  },
  getMatches(): Match[] {
    return JSON.parse(localStorage.getItem("kingatv_matches") || "[]");
  },
  saveMatches(matches: Match[]) {
    localStorage.setItem("kingatv_matches", JSON.stringify(matches));
    this.triggerUpdate();

    // Sync to Firestore
    matches.forEach(m => {
      fsSaveMatch(m).catch(e => console.warn("Firestore save match error:", e));
    });
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

    // Sync deletion to Firestore
    fsDeleteMatch(id).catch(e => console.warn("Firestore delete match error:", e));
  },
  getGlobalConfig(): GlobalConfig {
    const raw = localStorage.getItem("kingatv_config");
    let baseConfig = DEFAULT_GLOBAL_CONFIG;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        baseConfig = {
          ...DEFAULT_GLOBAL_CONFIG,
          ...parsed,
          supabaseUrl: parsed.supabaseUrl || DEFAULT_GLOBAL_CONFIG.supabaseUrl,
          supabaseAnonKey: parsed.supabaseAnonKey || DEFAULT_GLOBAL_CONFIG.supabaseAnonKey
        };
      } catch (e) {
        baseConfig = DEFAULT_GLOBAL_CONFIG;
      }
    }
    
    // Always preserve specifically saved custom user token if available
    const savedToken = localStorage.getItem("kingatv_user_saved_token");
    if (savedToken !== null) {
      baseConfig.globalToken = savedToken;
    }
    return baseConfig;
  },
  saveGlobalConfig(config: GlobalConfig) {
    if (config.globalToken !== undefined) {
      localStorage.setItem("kingatv_user_saved_token", config.globalToken);
      localStorage.setItem("kingatv_token_is_custom", "true");
    }
    localStorage.setItem("kingatv_config", JSON.stringify(config));
    this.triggerUpdate();

    // Sync to Firestore
    fsSaveConfig(config).catch(e => console.warn("Firestore save config error:", e));
  },
  getNotifications(): SystemNotification[] {
    return JSON.parse(localStorage.getItem("kingatv_notifications") || "[]");
  },
  saveNotifications(notifs: SystemNotification[]) {
    localStorage.setItem("kingatv_notifications", JSON.stringify(notifs));
    this.triggerUpdate();

    // Sync notifications to Firestore
    notifs.forEach(n => {
      fsSaveNotification(n).catch(e => console.warn("Firestore save notification error:", e));
    });
  },
  getUsers(): UserProfile[] {
    return JSON.parse(localStorage.getItem("kingatv_users") || "[]");
  },
  saveUsers(users: UserProfile[]) {
    localStorage.setItem("kingatv_users", JSON.stringify(users));
    this.triggerUpdate();

    // Sync users to Firestore
    users.forEach(u => {
      fsSaveUser(u).catch(e => console.warn("Firestore save user error:", e));
    });
  },
  getUser(uid: string): UserProfile | null {
    const users = this.getUsers();
    return users.find(u => u.uid === uid) || null;
  },
  updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const users = this.getUsers();
    let updatedUser: UserProfile | null = null;
    const updated = users.map(u => {
      if (u.uid === uid) {
        const copy = { ...u, ...updates };
        updatedUser = copy;
        return copy;
      }
      return u;
    });
    localStorage.setItem("kingatv_users", JSON.stringify(updated));
    this.triggerUpdate();

    // Sync single updated user to Firestore
    if (updatedUser) {
      fsSaveUser(updatedUser).catch(e => console.warn("Firestore update user error:", e));
    }
    
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

    // Sync deletion to Firestore
    fsDeleteUser(uid).catch(e => console.warn("Firestore delete user error:", e));
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
 * Real-time background sync function for Firestore
 */
export function startFirestoreSync() {
  try {
    // 1. Sync channels - if empty, pre-populate default channels
    onSnapshot(collection(firestoreDb, "channels"), (snapshot) => {
      if (snapshot.empty) {
        console.log("Firestore empty! Initializing standard preloaded channels...");
        DEFAULT_CHANNELS.forEach(c => {
          fsSaveChannel(c).catch(e => console.warn(e));
        });
        return;
      }
      const dbChannels: Channel[] = [];
      snapshot.forEach((doc) => {
        dbChannels.push({ id: doc.id, ...doc.data() } as Channel);
      });
      dbChannels.sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem("kingatv_channels", JSON.stringify(dbChannels));
      localDb.triggerUpdate();
    }, (error) => {
      console.warn("Firestore error syncing channels:", error);
    });

    // 2. Sync slideshow
    onSnapshot(collection(firestoreDb, "slideshow"), (snapshot) => {
      const dbSlides: SlideshowItem[] = [];
      snapshot.forEach((doc) => {
        dbSlides.push({ id: doc.id, ...doc.data() } as SlideshowItem);
      });
      dbSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem("kingatv_slideshow", JSON.stringify(dbSlides));
      localDb.triggerUpdate();
    }, (error) => {
      console.warn("Firestore error syncing slideshow:", error);
    });

    // 3. Sync matches
    onSnapshot(collection(firestoreDb, "matches"), (snapshot) => {
      const dbMatches: Match[] = [];
      snapshot.forEach((doc) => {
        dbMatches.push({ id: doc.id, ...doc.data() } as Match);
      });
      localStorage.setItem("kingatv_matches", JSON.stringify(dbMatches));
      localDb.triggerUpdate();
    }, (error) => {
      console.warn("Firestore error syncing matches:", error);
    });

    // 4. Sync notifications
    onSnapshot(collection(firestoreDb, "notifications"), (snapshot) => {
      const dbNotifs: SystemNotification[] = [];
      snapshot.forEach((doc) => {
        dbNotifs.push({ id: doc.id, ...doc.data() } as SystemNotification);
      });
      dbNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem("kingatv_notifications", JSON.stringify(dbNotifs));
      localDb.triggerUpdate();
    }, (error) => {
      console.warn("Firestore error syncing notifications:", error);
    });

    // 5. Sync global settings
    onSnapshot(doc(firestoreDb, "settings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        const config = { ...DEFAULT_GLOBAL_CONFIG, ...snapshot.data() } as GlobalConfig;
        localStorage.setItem("kingatv_config", JSON.stringify(config));
        localDb.triggerUpdate();
      } else {
        console.log("settings/global does not exist in Firestore. Initializing with defaults...");
        fsSaveConfig(DEFAULT_GLOBAL_CONFIG).catch(e => console.warn(e));
      }
    }, (error) => {
      console.warn("Firestore error syncing settings:", error);
    });

    // 6. Sync users
    onSnapshot(collection(firestoreDb, "users"), (snapshot) => {
      const dbUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        dbUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      if (dbUsers.length > 0) {
        localStorage.setItem("kingatv_users", JSON.stringify(dbUsers));
        
        // Update current user cache if changed
        const activeItem = localStorage.getItem("kingatv_active_user");
        if (activeItem) {
          const activeObj = JSON.parse(activeItem) as UserProfile;
          const matched = dbUsers.find(u => u.uid === activeObj.uid);
          if (matched) {
            localStorage.setItem("kingatv_active_user", JSON.stringify(matched));
          }
        }
        localDb.triggerUpdate();
      } else {
        // Pre-populate if empty
        const initialUsers: UserProfile[] = [
          {
            uid: "user-admin-said",
            email: "saidsalum076660@gmail.com",
            name: "Said Salum (Admin)",
            phone: "076660",
            status: UserStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            freeSecondsRemaining: 120,
            subscriptionExpiresAt: "2030-12-31T23:59:59Z",
            approvedByAdmin: true,
            password: "tanganyika"
          }
        ];
        initialUsers.forEach(u => {
          fsSaveUser(u).catch(e => console.warn(e));
        });
      }
    }, (error) => {
      console.warn("Firestore error syncing users:", error);
    });

  } catch (err) {
    console.error("Failed to start Firestore synchronization:", err);
  }
}

// Start realtime sync immediately on load
startFirestoreSync();

/**
 * Fallback auth controller, now backed by Firebase Authentication
 */
export const localAuth = {
  getCurrentUser(): UserProfile | null {
    const u = localStorage.getItem("kingatv_active_user");
    return u ? JSON.parse(u) : null;
  },
  async register(name: string, email: string, phone: string, status: UserStatus = UserStatus.PENDING, password?: string, autoLogin: boolean = true): Promise<UserProfile> {
    const pwd = password || "12345";
    
    // Create Firebase Auth user first
    let firebaseUser;
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, pwd);
      firebaseUser = userCredential.user;
    } catch (err: any) {
      console.error("Firebase auth registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        throw new Error("Email tayari imesajiliwa kwenye mfumo (Email already in use).");
      } else if (err.code === "auth/weak-password") {
        throw new Error("Nenosiri lako ni dhaifu mno, weka herufi zisizopungua 6.");
      } else if (err.code === "auth/invalid-email") {
        throw new Error("Barua pepe (Email) sio sahihi.");
      } else {
        throw new Error(err.message || "Failed to register in Firebase Auth.");
      }
    }

    const newUser: UserProfile = {
      uid: firebaseUser.uid, // Use Firebase Generated UID!
      email,
      name,
      phone,
      status,
      createdAt: new Date().toISOString(),
      freeSecondsRemaining: 120,
      subscriptionExpiresAt: null,
      approvedByAdmin: false,
      password: pwd
    };

    // Store in all users list
    const users = localDb.getUsers();
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], uid: firebaseUser.uid, name, phone, password: pwd };
    } else {
      users.push(newUser);
    }
    localDb.saveUsers(users);

    // Save as active session only if autoLogin is true
    if (autoLogin) {
      localStorage.setItem("kingatv_active_user", JSON.stringify(newUser));
    }
    localDb.triggerUpdate();
    return newUser;
  },
  async login(email: string, password?: string): Promise<UserProfile> {
    const normalizedEmail = email.trim().toLowerCase();
    const pwd = password || "";

    // 1. Admin local override bypass checks in case they aren't registered yet in Firebase Auth
    if (normalizedEmail === "saidsalum076660@gmail.com" || normalizedEmail === "saidsalum076660@gmailo.com" || normalizedEmail === "admin@kingatv.com") {
      if (pwd === "tanganyika") {
        const users = localDb.getUsers();
        let adminUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
        if (!adminUser) {
          adminUser = {
            uid: normalizedEmail === "saidsalum076660@gmail.com" ? "user-admin-said" : (normalizedEmail === "admin@kingatv.com" ? "user-admin-gen" : "user-admin-typo"),
            email: normalizedEmail,
            name: normalizedEmail === "saidsalum076660@gmail.com" ? "Said Salum" : "Kinga Admin",
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
        
        // Quietly create or login on Firebase Auth so that Firebase stays in sync
        try {
          await signInWithEmailAndPassword(firebaseAuthInstance, normalizedEmail, pwd);
        } catch (fbErr: any) {
          if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/invalid-credential") {
            try {
              await createUserWithEmailAndPassword(firebaseAuthInstance, normalizedEmail, pwd);
            } catch (_) {}
          }
        }

        localStorage.setItem("kingatv_active_user", JSON.stringify(adminUser));
        localDb.triggerUpdate();
        return adminUser;
      }
    }

    // 2. Perform Firebase Login for standard users
    let firebaseUser;
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, normalizedEmail, pwd);
      firebaseUser = userCredential.user;
    } catch (err: any) {
      console.warn("Firebase signin failed, searching for local fallback...", err);
      
      const users = localDb.getUsers();
      const localMatches = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (localMatches && localMatches.password === pwd) {
        try {
          console.log("Dynamically registering local user on Firebase...");
          const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, normalizedEmail, pwd);
          firebaseUser = userCredential.user;
          
          localMatches.uid = firebaseUser.uid;
          localDb.saveUsers(users);
        } catch (regErr) {
          console.error("Failed to dynamically register existing user in Firebase Auth:", regErr);
          throw new Error("Imeshindwa kuingia na akaunti yako. " + (err.message || ""));
        }
      } else {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
          throw new Error("Barua pepe (Email) au nenosiri sio sahihi. Tafadhali jaribu tena.");
        } else if (err.code === "auth/user-disabled") {
          throw new Error("Akaunti yako imezimwa na msimamizi wetu.");
        } else {
          throw new Error(err.message || "Imeshindwa kuingia kwenye akaunti.");
        }
      }
    }

    // Retrieve full profile from local database
    const users = localDb.getUsers();
    let existingUser = users.find(u => u.uid === firebaseUser.uid || u.email.toLowerCase() === normalizedEmail);

    if (!existingUser) {
      existingUser = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0],
        status: UserStatus.PENDING,
        createdAt: new Date().toISOString(),
        freeSecondsRemaining: 120,
        subscriptionExpiresAt: null,
        approvedByAdmin: false,
        password: pwd
      };
      users.push(existingUser);
      localDb.saveUsers(users);
    } else {
      if (existingUser.uid !== firebaseUser.uid) {
        existingUser.uid = firebaseUser.uid;
        localDb.saveUsers(users);
      }
    }

    if (existingUser.status === UserStatus.BLOCKED) {
      throw new Error("Akaunti yako imezuiwa na msimamizi (Blocked). Siliana nasi.");
    }

    localStorage.setItem("kingatv_active_user", JSON.stringify(existingUser));
    localDb.triggerUpdate();
    return existingUser;
  },
  async logout() {
    try {
      await signOut(firebaseAuthInstance);
    } catch (e) {
      console.warn("SignOut Firebase error:", e);
    }
    localStorage.removeItem("kingatv_active_user");
    localDb.triggerUpdate();
  }
};
