/**
 * KINGA TV Types Definition
 */

export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED"
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  freeSecondsRemaining: number;
  subscriptionExpiresAt: string | null;
  approvedByAdmin: boolean;
  password?: string;
}

export type StreamType = "hls" | "mpd" | "mp4" | "ts";

export interface Channel {
  id: string;
  name: string;
  logo: string;
  poster: string;
  description: string;
  category: string;
  order: number;
  streamType: StreamType;
  streamUrl: string;
  clearKeyKid?: string; // ClearKey key ID (hex)
  clearKeyKey?: string; // ClearKey key value (hex)
  useGlobalToken: boolean;
}

export interface SlideshowItem {
  id: string;
  image: string;
  title: string;
  matchInfo?: string;
  channelId: string;
  order: number;
}

export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";

export interface Match {
  id: string;
  teamAName: string;
  teamALogo: string;
  teamBName: string;
  teamBLogo: string;
  time: string; // e.g. "21:00"
  date: string; // e.g. "2026-05-25"
  channelId?: string; // Channel to stream
  isFeatured: boolean;
  status: MatchStatus;
  score?: string; // e.g. "1 - 1"
}

export interface GlobalConfig {
  globalToken: string;
  appLogo?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  updatedAt: string;
  slideshowIntervalSeconds?: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}
