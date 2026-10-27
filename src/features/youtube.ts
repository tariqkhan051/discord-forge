import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { XMLParser } from "fast-xml-parser";
import { config } from "../lib/config.js";
import { loadBlueprint } from "../lib/blueprint.js";
import { findChannel } from "../lib/discord-client.js";

const STATE_PATH = join(process.cwd(), "reports", "youtube-state.json");

interface YoutubeState {
  lastVideoId?: string;
}

function loadState(): YoutubeState {
  try {
    if (!existsSync(STATE_PATH)) return {};
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as YoutubeState;
  } catch {
    return {};
  }
}

function saveState(state: YoutubeState): void {
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

interface FeedEntry {
  id?: string | { "#text"?: string };
  title?: string | { "#text"?: string };
  link?: { "@_href"?: string } | Array<{ "@_href"?: string }>;
  published?: string;
  author?: { name?: string };
}

function textOf(value: string | { "#text"?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value["#text"] ?? "";
}

function linkOf(entry: FeedEntry): string {
  if (!entry.link) return "";
  if (Array.isArray(entry.link)) return entry.link[0]?.["@_href"] ?? "";
  return entry.link["@_href"] ?? "";
}

function videoIdFromEntry(entry: FeedEntry): string {
  const raw = textOf(entry.id);
  // yt:video:VIDEOID
  const parts = raw.split(":");
  return parts[parts.length - 1] ?? raw;
}

async function fetchLatestVideo(): Promise<{
  id: string;
  title: string;
  url: string;
  published?: string;
} | null> {
  if (!config.youtubeChannelId) {
    console.warn(
      "YOUTUBE_CHANNEL_ID is empty — skip YouTube poll. Run: npm run resolve-youtube",
    );
    return null;
  }

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${config.youtubeChannelId}`;
  const res = await fetch(feedUrl);
  if (!res.ok) {
    console.error(`YouTube RSS failed: ${res.status}`);
    return null;
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml) as { feed?: { entry?: FeedEntry | FeedEntry[] } };
  const entries = doc.feed?.entry;
  if (!entries) return null;
  const entry = Array.isArray(entries) ? entries[0] : entries;
  if (!entry) return null;

  const id = videoIdFromEntry(entry);
  const title = textOf(entry.title) || "New video";
  const url = linkOf(entry) || `https://www.youtube.com/watch?v=${id}`;

  return { id, title, url, published: entry.published };
}

export function registerYoutube(client: Client): void {
  if (!config.enableYoutube) return;

  const minutes = Math.max(5, config.youtubePollMinutes);
  const intervalMs = minutes * 60 * 1000;

  const tick = async () => {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.channels.fetch();
      const blueprint = loadBlueprint();
      const channel = findChannel(guild, blueprint, config.youtubeAnnounceChannel);
      if (!channel || !channel.isTextBased()) {
        console.warn(`YouTube announce channel "${config.youtubeAnnounceChannel}" not found`);
        return;
      }

      const latest = await fetchLatestVideo();
      if (!latest) return;

      const state = loadState();
      if (state.lastVideoId === latest.id) return;

      // First run: seed state without announcing historical video
      if (!state.lastVideoId) {
        saveState({ lastVideoId: latest.id });
        console.log(`YouTube state seeded with ${latest.id}`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(latest.title)
        .setURL(latest.url)
        .setDescription(
          [
            "New Guardians Guild upload is live.",
            "",
            latest.url,
            "",
            "Drop a reaction and talk about it in #new-videos.",
          ].join("\n"),
        )
        .setFooter({ text: "Guardians Guild • YouTube" })
        .setTimestamp(latest.published ? new Date(latest.published) : new Date());

      const textChannel = channel as TextChannel;
      const msg = await textChannel.send({
        content: "**New video** — watch & discuss!",
        embeds: [embed],
      });
      await msg.react("🔥").catch(() => undefined);
      await msg.react("👍").catch(() => undefined);

      saveState({ lastVideoId: latest.id });
      console.log(`Announced YouTube video ${latest.id}`);
    } catch (err) {
      console.error("YouTube poll error:", err);
    }
  };

  client.once("ready", () => {
    void tick();
    setInterval(() => void tick(), intervalMs);
    console.log(`YouTube poller every ${minutes}m`);
  });
}
