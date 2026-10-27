import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type Interaction,
} from "discord.js";
import { config } from "../../lib/config.js";
import { loadBlueprint } from "../../lib/blueprint.js";
import { findChannel, findRole } from "../../lib/discord-client.js";

export const commandData = [
  new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
  new SlashCommandBuilder().setName("rules").setDescription("Show community rules"),
  new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Open the self-assignable game roles panel"),
  new SlashCommandBuilder()
    .setName("squad")
    .setDescription("Post a looking-for-squad call")
    .addStringOption((o) =>
      o.setName("game").setDescription("Game name").setRequired(true).addChoices(
        { name: "MLBB", value: "MLBB" },
        { name: "CS2", value: "CS2" },
        { name: "Marvel Rivals", value: "Marvel Rivals" },
        { name: "Other", value: "Other" },
      ),
    )
    .addStringOption((o) =>
      o.setName("details").setDescription("Rank, role, region, party size").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Suggest a video idea for Guardians Guild")
    .addStringOption((o) =>
      o.setName("idea").setDescription("Your video suggestion").setRequired(true),
    ),
  new SlashCommandBuilder().setName("server-info").setDescription("Show server info"),
].map((c) => c.toJSON());

const RULES_TEXT = [
  "**Guardians Guild — Rules**",
  "",
  "1. Be respectful — no harassment, hate speech, or discrimination.",
  "2. No spam, scams, or malicious links.",
  "3. No cheating, account selling, or boosting scams.",
  "4. No unauthorized self-promotion (use share-your-content when allowed).",
  "5. Keep gaming sessions chill — no toxicity in chat or voice.",
  "6. Do not share personal or private information.",
  "7. Follow Discord ToS and staff directions.",
  "",
  "**Escalation:** warn → timeout → kick → ban (staff discretion for severe cases).",
].join("\n");

async function handleRoles(interaction: ChatInputCommandInteraction): Promise<void> {
  const blueprint = loadBlueprint();
  if (!interaction.guild) {
    await interaction.reply({ content: "Guild only.", ephemeral: true });
    return;
  }
  const resolved = blueprint.roles
    .filter((r) => r.selfAssignable)
    .map((r) => findRole(interaction.guild!, blueprint, r.name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Game & community roles")
    .setDescription(
      "Toggle the roles you want. These help others find teammates and interests.",
    );

  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const role of resolved.slice(0, 5)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`role:${role.name}`)
        .setLabel(role.name.slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
    );
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>();
  for (const role of resolved.slice(5, 10)) {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`role:${role.name}`)
        .setLabel(role.name.slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
    );
  }

  const components = [row];
  if (row2.components.length) components.push(row2);

  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

export function registerCommands(client: Client): void {
  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith("role:")) {
        if (!interaction.inGuild() || !interaction.member || !interaction.guild) return;
        const roleName = interaction.customId.slice("role:".length);
        const blueprint = loadBlueprint();
        const role = findRole(interaction.guild, blueprint, roleName);
        if (!role) {
          await interaction.reply({ content: `Role "${roleName}" not found.`, ephemeral: true });
          return;
        }
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role, "discord-forge self-role toggle");
          await interaction.reply({ content: `Removed **${role.name}**.`, ephemeral: true });
        } else {
          await member.roles.add(role, "discord-forge self-role toggle");
          await interaction.reply({ content: `Added **${role.name}**.`, ephemeral: true });
        }
        return;
      }

      if (!interaction.isChatInputCommand()) return;
      if (interaction.guildId && interaction.guildId !== config.guildId) return;

      switch (interaction.commandName) {
        case "ping": {
          await interaction.reply({
            content: `Pong — ${client.ws.ping}ms`,
            ephemeral: true,
          });
          break;
        }
        case "rules": {
          await interaction.reply({ content: RULES_TEXT, ephemeral: true });
          break;
        }
        case "roles": {
          await handleRoles(interaction);
          break;
        }
        case "squad": {
          const game = interaction.options.getString("game", true);
          const details = interaction.options.getString("details", true);
          const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`Looking for squad — ${game}`)
            .setDescription(details)
            .setFooter({ text: `Posted by ${interaction.user.tag}` })
            .setTimestamp();
          await interaction.reply({ embeds: [embed] });
          break;
        }
        case "suggest": {
          const idea = interaction.options.getString("idea", true);
          const blueprint = loadBlueprint();
          const guild = interaction.guild;
          if (!guild) {
            await interaction.reply({ content: "Guild only.", ephemeral: true });
            return;
          }
          const channel = findChannel(guild, blueprint, config.suggestChannelName);
          if (channel?.isTextBased()) {
            await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xe67e22)
                  .setTitle("Video suggestion")
                  .setDescription(idea)
                  .setFooter({ text: `From ${interaction.user.tag}` })
                  .setTimestamp(),
              ],
            });
            await interaction.reply({
              content: "Thanks — your suggestion was posted.",
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: `Suggestion noted (channel "${config.suggestChannelName}" missing):\n${idea}`,
              ephemeral: true,
            });
          }
          break;
        }
        case "server-info": {
          const guild = interaction.guild;
          if (!guild) {
            await interaction.reply({ content: "Guild only.", ephemeral: true });
            return;
          }
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle(guild.name)
                .setDescription("Guardians Guild — gaming community hub")
                .addFields(
                  { name: "Members", value: String(guild.memberCount), inline: true },
                  {
                    name: "YouTube",
                    value: config.youtubeChannelUrl,
                    inline: false,
                  },
                  ...(config.facebookUrl
                    ? [{ name: "Facebook", value: config.facebookUrl, inline: false }]
                    : []),
                  ...(config.instagramUrl
                    ? [{ name: "Instagram", value: config.instagramUrl, inline: false }]
                    : []),
                )
                .setTimestamp(),
            ],
            ephemeral: true,
          });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("Command error:", err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: "Something went wrong.", ephemeral: true }).catch(() => undefined);
      }
    }
  });
}
