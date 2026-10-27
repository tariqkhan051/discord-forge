import {
  EmbedBuilder,
  type Client,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { config } from "../lib/config.js";
import { loadBlueprint } from "../lib/blueprint.js";
import { findChannel, findRole } from "../lib/discord-client.js";
import { matchesAny } from "../lib/normalize.js";

export function registerWelcome(client: Client): void {
  if (!config.enableWelcome && !config.enableAutoRole) return;

  client.on("guildMemberAdd", async (member: GuildMember) => {
    if (member.guild.id !== config.guildId) return;
    const blueprint = loadBlueprint();

    if (config.enableAutoRole) {
      const role = findRole(member.guild, blueprint, config.newMemberRoleName);
      if (role) {
        try {
          await member.roles.add(role, "discord-forge: auto New Member");
        } catch (err) {
          console.error("Failed to assign New Member role:", err);
        }
      }
    }

    if (!config.enableWelcome) return;

    const channel =
      findChannel(member.guild, blueprint, config.welcomeChannelName) ??
      member.guild.channels.cache.find(
        (c): c is TextChannel =>
          c.isTextBased() &&
          !c.isDMBased() &&
          matchesAny(c.name, config.welcomeChannelName, ["welcome"]),
      );

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`Welcome to ${member.guild.name}`)
      .setDescription(
        [
          `Hey ${member}, glad you joined **Guardians Guild**.`,
          "",
          "Start here:",
          "• Read the rules",
          "• Introduce yourself",
          "• Grab game roles with `/roles`",
          "• Jump into MLBB, CS2, or Marvel Rivals channels",
          "",
          `YouTube: ${config.youtubeChannelUrl}`,
          config.facebookUrl ? `Facebook: ${config.facebookUrl}` : null,
          config.instagramUrl ? `Instagram: ${config.instagramUrl}` : null,
          "",
          "Party up, share clips, and have fun — no toxicity.",
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Failed to send welcome message:", err);
    }
  });
}
