import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { localDb } from "./firebase";
import { Channel, SlideshowItem, Match, UserProfile, SystemNotification, GlobalConfig } from "./types";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

/**
 * Gets the active Supabase client instance.
 * Credentials can come from Vite build-time environment variables, or
 * dynamically from the Admin dashboard stored in local storage config.
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Check build environment first
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

  // Otherwise check local DB Admin settings
  let localUrl = "";
  let localKey = "";
  try {
    const config = localDb.getGlobalConfig();
    localUrl = config.supabaseUrl || "";
    localKey = config.supabaseAnonKey || "";
  } catch (e) {
    // localDb might not be initialized yet
  }

  const url = (envUrl || localUrl).trim();
  const key = (envKey || localKey).trim();

  if (!url || !key) {
    return null;
  }

  // Reuse previous client if credentials didn't change
  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    return null;
  }
}

/**
 * Checks if Supabase connection is fully configured and ready.
 */
export function isSupabaseConnected(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Generates SQL statements that the user can execute in Supabase SQL Editor
 * to prepare their database schema instantly.
 */
export const SUPABASE_SETUP_SQL = `-- 1. WATU / WATUMIAJI (KINGA TV USER PROFILE)
CREATE TABLE IF NOT EXISTS public.ktv_users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    free_seconds_remaining INT NOT NULL DEFAULT 120,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    approved_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    password TEXT
);

-- Enable RLS on user profile
ALTER TABLE public.ktv_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_users FOR ALL USING (true) WITH CHECK (true);

-- 2. VITUO YA TV / CHANNELS (KINGA TV CHANNELS)
CREATE TABLE IF NOT EXISTS public.ktv_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT NOT NULL,
    poster TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    "order" INT NOT NULL,
    stream_type TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    clear_key_kid TEXT,
    clear_key_key TEXT,
    use_global_token BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.ktv_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_channels FOR ALL USING (true) WITH CHECK (true);

-- 3. MATCHES (MICHUANO YA MPIRA YA LIVE)
CREATE TABLE IF NOT EXISTS public.ktv_matches (
    id TEXT PRIMARY KEY,
    team_a_name TEXT NOT NULL,
    team_a_logo TEXT NOT NULL,
    team_b_name TEXT NOT NULL,
    team_b_logo TEXT NOT NULL,
    time TEXT NOT NULL,
    date TEXT NOT NULL,
    channel_id TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL,
    score TEXT
);

ALTER TABLE public.ktv_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_matches FOR ALL USING (true) WITH CHECK (true);

-- 4. BANNER SLIDESHOW INFO
CREATE TABLE IF NOT EXISTS public.ktv_slideshow (
    id TEXT PRIMARY KEY,
    image TEXT NOT NULL,
    title TEXT NOT NULL,
    match_info TEXT,
    channel_id TEXT NOT NULL,
    "order" INT NOT NULL
);

ALTER TABLE public.ktv_slideshow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_slideshow FOR ALL USING (true) WITH CHECK (true);

-- 5. NOTIFICATIONS (TAARIFA ZA MIKO YA ADMIN)
CREATE TABLE IF NOT EXISTS public.ktv_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ktv_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_notifications FOR ALL USING (true) WITH CHECK (true);

-- 6. DYNAMIC GLOBAL APP SETTINGS
CREATE TABLE IF NOT EXISTS public.ktv_config (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    global_token TEXT NOT NULL,
    app_logo TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ktv_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select/write" ON public.ktv_config FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 7. INITIAL TABLE ENTRIES / DATA SEEDING (Sakata la Awali)
-- ==========================================================

-- Seed Global App Configuration Settings
INSERT INTO public.ktv_config (id, global_token, app_logo, updated_at)
VALUES (
    'global_settings', 
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3Nzk0NjQ5NjYsInNpcCI6IjE1LjE1OC4yMTIuNzMifQ.3nuVgj-Mv7WgX6tcKPbW5rIJvdN_AuvGbexT54mPXxd-D7HyNoEfdQe62YaCKdNWmPDQ3mIlyeF1IXCJv693Tw', 
    'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/tv.svg', 
    timezone('utc'::text, now())
)
ON CONFLICT (id) DO UPDATE 
SET global_token = EXCLUDED.global_token, app_logo = EXCLUDED.app_logo, updated_at = timezone('utc'::text, now());

-- Seed Initial TV Channels
INSERT INTO public.ktv_channels (id, name, logo, poster, description, category, "order", stream_type, stream_url, clear_key_kid, clear_key_key, use_global_token)
VALUES 
  (
    'ch1', 
    'A-SPORTS HD', 
    'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/tv.svg', 
    'https://images.unsplash.com/photo-1540747737956-378724044453?w=800', 
    'Chaneli inayoongoza kwa soka la nyumbani na kimataifa tangu asubuhi hadi jioni.', 
    'SPORTS', 
    1, 
    'HLS', 
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 
    null, 
    null, 
    true
  ),
  (
    'ch2', 
    'K-SPORTS PREMIUM', 
    'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/play.svg', 
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800', 
    'Matukio yote ya michezo LIVE masaa 24 na uchambuzi wa kina wa washambuliaji wetu.', 
    'SPORTS', 
    2, 
    'DASH', 
    'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd', 
    null, 
    null, 
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Football Matches (Mechi za Live)
INSERT INTO public.ktv_matches (id, team_a_name, team_a_logo, team_b_name, team_b_logo, time, date, channel_id, is_featured, status, score)
VALUES 
  (
    'm1', 
    'Real Madrid', 
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', 
    'Barcelona', 
    'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=100', 
    '22:00', 
    'Leo', 
    'ch1', 
    true, 
    'LIVE', 
    '2 - 1'
  ),
  (
    'm2', 
    'Manchester City', 
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100', 
    'Arsenal', 
    'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=100', 
    '18:30', 
    'Kesho', 
    'ch2', 
    false, 
    'UPCOMING', 
    null
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Banner Slideshow Info
INSERT INTO public.ktv_slideshow (id, image, title, match_info, channel_id, "order")
VALUES 
  (
    'slide1', 
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200', 
    'Ligi Kuu Uingereza (EPL) Nyumbani', 
    'Man City vs Arsenal - Kesho 18:30 LIVE', 
    'ch2', 
    1
  ),
  (
    'slide2', 
    'https://images.unsplash.com/photo-1540747737956-378724044453?w=1200', 
    'Dabi Kuu ya El Clasico Iko Live Sasa', 
    'Real Madrid vs Barcelona - Inachezwa sasa', 
    'ch1', 
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Initial System Notifications Announcements
INSERT INTO public.ktv_notifications (id, title, message, created_at)
VALUES 
  (
    'notif1', 
    'Karibu Kinga TV Supabase Cloud Server', 
    'Karibu kwenye mfumo wetu mkuu unaoungwa mkono na Supabase Backend. Takwimu zako zote sasa zinahifadhiwa kwa urahisi kwenye wingu!', 
    timezone('utc'::text, now())
  )
ON CONFLICT (id) DO NOTHING;
`;

/**
 * Perform absolute verification of Supabase integration credentials
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(url, key);
    // Try to execute a simple count query on users, or if table doesn't exist, it's connected but empty
    const { error } = await tempClient.from("ktv_users").select("count", { count: "exact", head: true }).limit(1);
    
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      return { success: false, message: `Hitilafu ya muunganisho: ${error.message}` };
    }
    
    return { 
      success: true, 
      message: error?.code === "42P01" 
        ? "Muunganisho Umefanikiwa! Kumbuka kutengeneza Jedwali (Tables) kwa kutumia SQL Script iliyoko chini."
        : "Muunganisho na Supabase Umefanikiwa na jedwali zimepatikana!" 
    };
  } catch (err: any) {
    return { success: false, message: `Supabase iko offline au data sio sahihi: ${err.message || err}` };
  }
}

/**
 * High-fidelity, error-insensitive Sync Engine for all entities.
 * Safely fetches recent tables from Supabase and populates local database,
 * and publishes current local adjustments to Supabase dynamically.
 */
export async function syncDatabaseWithSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    console.log("Supabase Sync: Inaanza upatanishi...");

    // 1. SYNC: USERS
    const localUsers = localDb.getUsers();
    
    // Retrieve locally deleted user tracking to prevent them from resurrecting
    let deletedUids: string[] = [];
    try {
      deletedUids = JSON.parse(localStorage.getItem("kingatv_deleted_users") || "[]");
    } catch (_) {}

    const { data: remoteUsers, error: errU } = await client.from("ktv_users").select("*");
    if (!errU && remoteUsers) {
      const mergedUsers: UserProfile[] = [...localUsers];
      
      // Sync remote into local first, skipping any deleted ones
      for (const ru of remoteUsers) {
        if (deletedUids.includes(ru.uid)) {
          // If the entry remains dynamically on Supabase, force a cleanup in the background
          client.from("ktv_users").delete().eq("uid", ru.uid).then(() => {}, () => {});
          continue;
        }
        const uProfile: UserProfile = {
          uid: ru.uid,
          email: ru.email,
          name: ru.name,
          phone: ru.phone,
          status: ru.status,
          createdAt: ru.created_at,
          freeSecondsRemaining: ru.free_seconds_remaining,
          subscriptionExpiresAt: ru.subscription_expires_at,
          approvedByAdmin: ru.approved_by_admin,
          password: ru.password
        };
        const idx = mergedUsers.findIndex(u => u.uid === uProfile.uid);
        if (idx !== -1) {
          // Keep the newer status or values (e.g., if approved)
          mergedUsers[idx] = { ...mergedUsers[idx], ...uProfile };
        } else {
          mergedUsers.push(uProfile);
        }
      }
      
      // Strict filter for local storage
      const finalMerged = mergedUsers.filter(u => !deletedUids.includes(u.uid));
      localStorage.setItem("kingatv_users", JSON.stringify(finalMerged));

      // Push any unique local users to Supabase
      const remoteUserIds = new Set(remoteUsers.map(u => u.uid));
      for (const lu of localUsers) {
        if (deletedUids.includes(lu.uid)) continue;
        if (!remoteUserIds.has(lu.uid)) {
          await client.from("ktv_users").insert({
            uid: lu.uid,
            email: lu.email,
            name: lu.name,
            phone: lu.phone,
            status: lu.status,
            created_at: lu.createdAt,
            free_seconds_remaining: lu.freeSecondsRemaining,
            subscription_expires_at: lu.subscriptionExpiresAt,
            approved_by_admin: lu.approvedByAdmin,
            password: lu.password
          });
        }
      }
    }

    // 2. SYNC: CHANNELS
    const localChans = localDb.getChannels();
    
    // Retrieve locally deleted channel tracking to prevent them from resurrecting
    let deletedChanIds: string[] = [];
    try {
      deletedChanIds = JSON.parse(localStorage.getItem("kingatv_deleted_channels") || "[]");
    } catch (_) {}

    const { data: remoteChans, error: errC } = await client.from("ktv_channels").select("*");
    if (!errC && remoteChans) {
      const formattedChans: Channel[] = [];
      for (const rc of remoteChans) {
        if (deletedChanIds.includes(rc.id)) {
          // Force delete on Supabase in background
          client.from("ktv_channels").delete().eq("id", rc.id).then(() => {}, () => {});
          continue;
        }

        const lc = localChans.find(c => c.id === rc.id);
        let finalKid = rc.clear_key_kid;
        let finalKey = rc.clear_key_key;
        let finalStreamUrl = rc.stream_url;
        let finalName = rc.name;
        let finalLogo = rc.logo;
        let finalPoster = rc.poster;
        let finalDesc = rc.description || "";
        let finalCategory = rc.category;
        let finalOrder = rc.order;
        let finalStreamType = rc.stream_type;
        let finalUseGlobalToken = rc.use_global_token;

        if (lc) {
          // If the local channel is modified compared to Supabase, preserve user's local edits as the source of truth!
          const isLocalModified = 
            (lc.clearKeyKid || "").trim() !== (rc.clear_key_kid || "").trim() ||
            (lc.clearKeyKey || "").trim() !== (rc.clear_key_key || "").trim() ||
            (lc.streamUrl || "").trim() !== (rc.stream_url || "").trim() ||
            (lc.name || "").trim() !== (rc.name || "").trim() ||
            (lc.logo || "").trim() !== (rc.logo || "").trim() ||
            (lc.poster || "").trim() !== (rc.poster || "").trim() ||
            (lc.description || "").trim() !== (rc.description || "").trim() ||
            (lc.category || "").trim() !== (rc.category || "").trim() ||
            (lc.order || 0) !== (rc.order || 0) ||
            (lc.streamType || "").trim() !== (rc.stream_type || "").trim() ||
            (lc.useGlobalToken || false) !== (rc.use_global_token || false);

          if (isLocalModified) {
            finalKid = lc.clearKeyKid;
            finalKey = lc.clearKeyKey;
            finalStreamUrl = lc.streamUrl;
            finalName = lc.name;
            finalLogo = lc.logo;
            finalPoster = lc.poster;
            finalDesc = lc.description || "";
            finalCategory = lc.category;
            finalOrder = lc.order;
            finalStreamType = lc.streamType;
            finalUseGlobalToken = lc.useGlobalToken;

            // Push those local edits up to Supabase and await them to succeed
            try {
              await client.from("ktv_channels").upsert({
                id: lc.id,
                name: lc.name,
                logo: lc.logo,
                poster: lc.poster,
                description: lc.description,
                category: lc.category,
                order: lc.order,
                stream_type: lc.streamType,
                stream_url: lc.streamUrl,
                clear_key_kid: lc.clearKeyKid,
                clear_key_key: lc.clearKeyKey,
                use_global_token: lc.useGlobalToken
              });
            } catch (errCh) {
              console.warn("Marekebisho ya channel kushindwa kuingia Supabase:", errCh);
            }
          }
        }

        formattedChans.push({
          id: rc.id,
          name: finalName,
          logo: finalLogo,
          poster: finalPoster,
          description: finalDesc,
          category: finalCategory,
          order: finalOrder,
          streamType: finalStreamType as any,
          streamUrl: finalStreamUrl,
          clearKeyKid: finalKid,
          clearKeyKey: finalKey,
          useGlobalToken: finalUseGlobalToken
        });
      }

      // Filter local storage to make sure no deleted ones remain
      const finalChans = formattedChans.filter(c => !deletedChanIds.includes(c.id));
      localStorage.setItem("kingatv_channels", JSON.stringify(finalChans));

      // Push any unique local channels that aren't on Supabase yet & not deleted
      if (localChans.length > 0) {
        const remoteChanIds = new Set(remoteChans.map(rc => rc.id));
        for (const lc of localChans) {
          if (deletedChanIds.includes(lc.id)) continue;
          if (!remoteChanIds.has(lc.id)) {
            await client.from("ktv_channels").insert({
              id: lc.id,
              name: lc.name,
              logo: lc.logo,
              poster: lc.poster,
              description: lc.description,
              category: lc.category,
              order: lc.order,
              stream_type: lc.streamType,
              stream_url: lc.streamUrl,
              clear_key_kid: lc.clearKeyKid,
              clear_key_key: lc.clearKeyKey,
              use_global_token: lc.useGlobalToken
            });
          }
        }
      }
    }

    // 3. SYNC: MATCHES
    const localMatches = localDb.getMatches();
    let deletedMatchIds: string[] = [];
    try {
      deletedMatchIds = JSON.parse(localStorage.getItem("kingatv_deleted_matches") || "[]");
    } catch (_) {}

    const { data: remoteMatches, error: errM } = await client.from("ktv_matches").select("*");
    if (!errM && remoteMatches) {
      const formattedMatches: Match[] = [];
      for (const rm of remoteMatches) {
        if (deletedMatchIds.includes(rm.id)) {
          // Force background remote clean in Supabase
          client.from("ktv_matches").delete().eq("id", rm.id).then(() => {}, () => {});
          continue;
        }
        formattedMatches.push({
          id: rm.id,
          teamAName: rm.team_a_name,
          teamALogo: rm.team_a_logo,
          teamBName: rm.team_b_name,
          teamBLogo: rm.team_b_logo,
          time: rm.time,
          date: rm.date,
          channelId: rm.channel_id,
          isFeatured: rm.is_featured,
          status: rm.status as any,
          score: rm.score
        });
      }

      const finalMatches = formattedMatches.filter(m => !deletedMatchIds.includes(m.id));
      localStorage.setItem("kingatv_matches", JSON.stringify(finalMatches));

      if (localMatches.length > 0) {
        const remoteMatchIds = new Set(remoteMatches.map(rm => rm.id));
        for (const lm of localMatches) {
          if (deletedMatchIds.includes(lm.id)) continue;
          if (!remoteMatchIds.has(lm.id)) {
            await client.from("ktv_matches").insert({
              id: lm.id,
              team_a_name: lm.teamAName,
              team_a_logo: lm.teamALogo,
              team_b_name: lm.teamBName,
              team_b_logo: lm.teamBLogo,
              time: lm.time,
              date: lm.date,
              channel_id: lm.channelId,
              is_featured: lm.isFeatured,
              status: lm.status,
              score: lm.score
            });
          }
        }
      }
    }

    // 4. SYNC: SLIDESHOW
    const localSlides = localDb.getSlideshow();
    let deletedSlideIds: string[] = [];
    try {
      deletedSlideIds = JSON.parse(localStorage.getItem("kingatv_deleted_slides") || "[]");
    } catch (_) {}

    const { data: remoteSlides, error: errS } = await client.from("ktv_slideshow").select("*");
    if (!errS && remoteSlides) {
      const formattedSlides: SlideshowItem[] = [];
      for (const rs of remoteSlides) {
        if (deletedSlideIds.includes(rs.id)) {
          // Force background remote clean in Supabase
          client.from("ktv_slideshow").delete().eq("id", rs.id).then(() => {}, () => {});
          continue;
        }
        formattedSlides.push({
          id: rs.id,
          image: rs.image,
          title: rs.title,
          matchInfo: rs.match_info,
          channelId: rs.channel_id,
          order: rs.order
        });
      }

      const finalSlides = formattedSlides.filter(s => !deletedSlideIds.includes(s.id));
      localStorage.setItem("kingatv_slideshow", JSON.stringify(finalSlides));

      if (localSlides.length > 0) {
        const remoteSlideIds = new Set(remoteSlides.map(rs => rs.id));
        for (const ls of localSlides) {
          if (deletedSlideIds.includes(ls.id)) continue;
          if (!remoteSlideIds.has(ls.id)) {
            await client.from("ktv_slideshow").insert({
              id: ls.id,
              image: ls.image,
              title: ls.title,
              match_info: ls.matchInfo,
              channel_id: ls.channelId,
              order: ls.order
            });
          }
        }
      }
    }

    // 5. SYNC: GLOBAL CONFIG
    const localConf = localDb.getGlobalConfig();
    const { data: remoteConf, error: errCO } = await client.from("ktv_config").select("*").eq("id", "global_settings").maybeSingle();
    if (!errCO && remoteConf) {
      const localTime = localConf.updatedAt ? new Date(localConf.updatedAt).getTime() : 0;
      const remoteTime = remoteConf.updated_at ? new Date(remoteConf.updated_at).getTime() : 0;
      
      if (localTime >= remoteTime) {
        // Local configuration is newer or equal (edited in Admin Dashboard): Push local changes to Supabase!
        const finalToken = localConf.globalToken?.trim() || remoteConf.global_token?.trim() || "";
        await client.from("ktv_config").upsert({
          id: "global_settings",
          global_token: finalToken,
          app_logo: localConf.appLogo || remoteConf.app_logo || "",
          updated_at: localConf.updatedAt
        });
      } else {
        // Remote configuration is newer: Pull remote configuration to local storage!
        // BUT protect the token: do not overwrite a custom local token with remote token
        const isCustom = localStorage.getItem("kingatv_token_is_custom") === "true";
        const finalToken = isCustom 
          ? (localStorage.getItem("kingatv_user_saved_token") || remoteConf.global_token?.trim() || "")
          : (remoteConf.global_token?.trim() || localConf.globalToken?.trim() || "");

        const mergedConfig: GlobalConfig = {
          globalToken: finalToken,
          appLogo: remoteConf.app_logo || localConf.appLogo || "",
          supabaseUrl: localConf.supabaseUrl, // Keep current working DB credential references locally
          supabaseAnonKey: localConf.supabaseAnonKey,
          updatedAt: remoteConf.updated_at
        };
        localStorage.setItem("kingatv_config", JSON.stringify(mergedConfig));
        if (finalToken) {
          localStorage.setItem("kingatv_user_saved_token", finalToken);
        }
      }
    } else {
      // Upload local config
      await client.from("ktv_config").upsert({
        id: "global_settings",
        global_token: localConf.globalToken || "",
        app_logo: localConf.appLogo || "",
        updated_at: localConf.updatedAt
      });
    }

    // Trigger local updates
    localDb.triggerUpdate();
    console.log("Supabase Sync: Upatanishi umekamilika kikamilifu!");
    return true;
  } catch (err) {
    console.error("Supabase Sync error:", err);
    return false;
  }
}

/**
 * Perform target upsert of profiles, updates, matches, channels, config directly to Cloud when users make edits.
 */
export async function pushUserUpdateToSupabase(user: UserProfile) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_users").upsert({
      uid: user.uid,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      created_at: user.createdAt,
      free_seconds_remaining: user.freeSecondsRemaining,
      subscription_expires_at: user.subscriptionExpiresAt,
      approved_by_admin: user.approvedByAdmin,
      password: user.password
    });
  } catch (e) {
    console.warn("Supabase background user sync error:", e);
  }
}

export async function pushChannelUpdateToSupabase(chan: Channel) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_channels").upsert({
      id: chan.id,
      name: chan.name,
      logo: chan.logo,
      poster: chan.poster,
      description: chan.description,
      category: chan.category,
      order: chan.order,
      stream_type: chan.streamType,
      stream_url: chan.streamUrl,
      clear_key_kid: chan.clearKeyKid,
      clear_key_key: chan.clearKeyKey,
      use_global_token: chan.useGlobalToken
    });
  } catch (e) {
    console.warn("Supabase background channel sync error:", e);
  }
}

export async function pushMatchUpdateToSupabase(match: Match) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_matches").upsert({
      id: match.id,
      team_a_name: match.teamAName,
      team_a_logo: match.teamALogo,
      team_b_name: match.teamBName,
      team_b_logo: match.teamBLogo,
      time: match.time,
      date: match.date,
      channel_id: match.channelId,
      is_featured: match.isFeatured,
      status: match.status,
      score: match.score
    });
  } catch (e) {
    console.warn("Supabase background match sync error:", e);
  }
}

export async function pushSlideshowUpdateToSupabase(slide: SlideshowItem) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_slideshow").upsert({
      id: slide.id,
      image: slide.image,
      title: slide.title,
      match_info: slide.matchInfo,
      channel_id: slide.channelId,
      order: slide.order
    });
  } catch (e) {
    console.warn("Supabase background slideshow sync error:", e);
  }
}

export async function pushConfigUpdateToSupabase(config: GlobalConfig) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_config").upsert({
      id: "global_settings",
      global_token: config.globalToken,
      app_logo: config.appLogo,
      updated_at: config.updatedAt
    });
  } catch (e) {
    console.warn("Supabase background config sync error:", e);
  }
}

export async function deleteUserFromSupabase(uid: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_users").delete().eq("uid", uid);
  } catch (e) {
    console.warn("Supabase delete user sync error:", e);
  }
}

export async function deleteChannelFromSupabase(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_channels").delete().eq("id", id).then(() => {}, () => {});
  } catch (e) {
    console.warn("Supabase delete channel sync error:", e);
  }
}

export async function deleteSlideFromSupabase(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_slideshow").delete().eq("id", id).then(() => {}, () => {});
  } catch (e) {
    console.warn("Supabase delete slide sync error:", e);
  }
}

export async function deleteMatchFromSupabase(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from("ktv_matches").delete().eq("id", id).then(() => {}, () => {});
  } catch (e) {
    console.warn("Supabase delete match sync error:", e);
  }
}

