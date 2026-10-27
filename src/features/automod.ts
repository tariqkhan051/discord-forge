import { type Client, type Message } from "discord.js";
import { config } from "../lib/config.js";

const recent = new Map<string, number[]>();
const WINDOW_MS = 7000;
const MAX_MESSAGES = 6;

/**
 * Lightweight anti-spam (replaces basic Dyno/Carl flood filters).
 * Deletes rapid message bursts from the same member.
 */
export function registerAutomod(client: Client): void {
  client.on("messageCreate", async (message: Message) => {
    if (!message.guild || message.guild.id !== config.guildId) return;
    if (message.author.bot || !message.member) return;
    if (message.member.permissions.has("ManageMessages")) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const times = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    times.push(now);
    recent.set(key, times);

    if (times.length < MAX_MESSAGES) return;

    recent.set(key, []);
    try {
      await message.delete();
      if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
      const warn = await message.channel.send({
        content: `${message.author}, slow down — spam isn't allowed.`,
      });
      setTimeout(() => void warn.delete().catch(() => undefined), 5000);
    } catch {
      /* missing Manage Messages */
    }
  });
}
