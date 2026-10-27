import "dotenv/config";

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  token: process.env.DISCORD_TOKEN?.trim() ?? "",
  guildId: process.env.GUILD_ID?.trim() ?? "",
  clientId: process.env.CLIENT_ID?.trim() ?? "",
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID?.trim() ?? "",
  youtubeChannelUrl:
    process.env.YOUTUBE_CHANNEL_URL?.trim() || "https://www.youtube.com/@GuardiansGuildX",
  facebookUrl: process.env.FACEBOOK_URL?.trim() ?? "",
  instagramUrl: process.env.INSTAGRAM_URL?.trim() ?? "",
  welcomeChannelName: process.env.WELCOME_CHANNEL_NAME?.trim() || "welcome",
  youtubeAnnounceChannel: process.env.YOUTUBE_ANNOUNCE_CHANNEL?.trim() || "youtube-updates",
  suggestChannelName: process.env.SUGGEST_CHANNEL_NAME?.trim() || "video-suggestions",
  modLogChannelName: process.env.MOD_LOG_CHANNEL_NAME?.trim() || "mod-logs",
  enableWelcome: envBool("ENABLE_WELCOME", true),
  enableYoutube: envBool("ENABLE_YOUTUBE", true),
  enableModLog: envBool("ENABLE_MOD_LOG", true),
  enableAutoRole: envBool("ENABLE_AUTO_ROLE", true),
  youtubePollMinutes: envInt("YOUTUBE_POLL_MINUTES", 15),
  newMemberRoleName: process.env.NEW_MEMBER_ROLE_NAME?.trim() || "New Member",
  memberRoleName: process.env.MEMBER_ROLE_NAME?.trim() || "Member",
};

export function requireDiscordCredentials(): void {
  const missing: string[] = [];
  if (!config.token) missing.push("DISCORD_TOKEN");
  if (!config.guildId) missing.push("GUILD_ID");
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill in values.`,
    );
  }
}
