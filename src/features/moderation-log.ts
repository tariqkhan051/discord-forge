import {
  AuditLogEvent,
  EmbedBuilder,
  type Client,
  type Guild,
  type TextChannel,
} from "discord.js";
import { config } from "../lib/config.js";
import { loadBlueprint } from "../lib/blueprint.js";
import { findChannel } from "../lib/discord-client.js";

async function modLogChannel(guild: Guild): Promise<TextChannel | null> {
  const blueprint = loadBlueprint();
  const ch = findChannel(guild, blueprint, config.modLogChannelName);
  if (ch && ch.isTextBased()) return ch as TextChannel;
  return null;
}

export function registerModLog(client: Client): void {
  if (!config.enableModLog) return;

  client.on("messageDelete", async (message) => {
    if (!message.guild || message.guild.id !== config.guildId) return;
    if (message.author?.bot) return;
    const log = await modLogChannel(message.guild);
    if (!log) return;

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("Message deleted")
      .addFields(
        { name: "Author", value: message.author ? `${message.author.tag}` : "Unknown", inline: true },
        { name: "Channel", value: message.channel.toString(), inline: true },
        {
          name: "Content",
          value: message.content?.slice(0, 1000) || "(embed/attachment or empty)",
        },
      )
      .setTimestamp();

    await log.send({ embeds: [embed] }).catch(() => undefined);
  });

  client.on("guildBanAdd", async (ban) => {
    if (ban.guild.id !== config.guildId) return;
    const log = await modLogChannel(ban.guild);
    if (!log) return;

    let executor = "Unknown";
    try {
      const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
      const entry = logs.entries.first();
      if (entry?.target?.id === ban.user.id) {
        executor = entry.executor?.tag ?? "Unknown";
      }
    } catch {
      /* ignore */
    }

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle("Member banned")
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})` },
        { name: "Moderator", value: executor },
      )
      .setTimestamp();

    await log.send({ embeds: [embed] }).catch(() => undefined);
  });
}
