import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type Message,
  type TextChannel,
} from "discord.js";
import { config } from "../lib/config.js";
import { loadBlueprint } from "../lib/blueprint.js";
import { findChannel } from "../lib/discord-client.js";

export const reportSlashData = new SlashCommandBuilder()
  .setName("report")
  .setDescription("Report a user or issue to staff")
  .addStringOption((o) =>
    o.setName("details").setDescription("What happened?").setRequired(true),
  )
  .addUserOption((o) =>
    o.setName("user").setDescription("User to report (optional)").setRequired(false),
  )
  .toJSON();

async function staffReportChannel(guild: import("discord.js").Guild): Promise<TextChannel | null> {
  const blueprint = loadBlueprint();
  const ch =
    findChannel(guild, blueprint, config.modLogChannelName) ??
    findChannel(guild, blueprint, "staff-chat");
  if (ch && ch.isTextBased()) return ch as TextChannel;
  return null;
}

export async function sendReport(opts: {
  guild: import("discord.js").Guild;
  reporterTag: string;
  reporterId: string;
  targetTag?: string;
  targetId?: string;
  details: string;
  source: string;
}): Promise<boolean> {
  const log = await staffReportChannel(opts.guild);
  if (!log) return false;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("Member report")
    .addFields(
      { name: "Reporter", value: `${opts.reporterTag} (\`${opts.reporterId}\`)`, inline: false },
      {
        name: "Reported user",
        value: opts.targetTag
          ? `${opts.targetTag} (\`${opts.targetId}\`)`
          : "(not specified)",
        inline: false,
      },
      { name: "Details", value: opts.details.slice(0, 1000) },
      { name: "Source", value: opts.source, inline: true },
    )
    .setTimestamp();

  await log.send({
    content: "🛡 **New report** — please review.",
    embeds: [embed],
  });
  return true;
}

export function registerReportPrefix(client: Client): void {
  client.on("messageCreate", async (message: Message) => {
    if (!message.guild || message.guild.id !== config.guildId) return;
    if (message.author.bot) return;
    if (!config.enableMessageContentIntent) return;

    const content = message.content.trim();
    if (!content.toLowerCase().startsWith("!report")) return;

    const rest = content.slice("!report".length).trim();
    if (!rest) {
      await message.reply(
        "Usage: `!report @user reason` or `!report reason` — or use `/report`.",
      );
      return;
    }

    const mention = message.mentions.users.first();
    let details = rest;
    if (mention) {
      details = rest.replace(new RegExp(`<@!?${mention.id}>`), "").trim() || rest;
    }

    const ok = await sendReport({
      guild: message.guild,
      reporterTag: message.author.tag,
      reporterId: message.author.id,
      targetTag: mention?.tag,
      targetId: mention?.id,
      details,
      source: `!report in #${"name" in message.channel ? message.channel.name : "unknown"}`,
    });

    if (ok) {
      await message.reply("Report sent to staff. Thanks for looking out for the Guild.");
    } else {
      await message.reply("Couldn't reach the mod-log channel — ping a Moderator.");
    }
  });
}

export async function handleReportSlash(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "Guild only.", ephemeral: true });
    return;
  }
  const details = interaction.options.getString("details", true);
  const user = interaction.options.getUser("user");

  const ok = await sendReport({
    guild: interaction.guild,
    reporterTag: interaction.user.tag,
    reporterId: interaction.user.id,
    targetTag: user?.tag,
    targetId: user?.id,
    details,
    source: "/report",
  });

  await interaction.reply({
    content: ok
      ? "Report sent to staff. Thanks for looking out for the Guild."
      : "Couldn't reach the mod-log channel — ping a Moderator.",
    ephemeral: true,
  });
}
