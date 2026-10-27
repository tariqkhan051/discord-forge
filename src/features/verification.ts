import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type TextChannel,
} from "discord.js";
import { config } from "../lib/config.js";
import { loadBlueprint } from "../lib/blueprint.js";
import { findChannel, findRole } from "../lib/discord-client.js";
import { matchesAny } from "../lib/normalize.js";

const VERIFY_BUTTON_ID = "ggx:verify";

export function registerVerification(client: Client): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== VERIFY_BUTTON_ID) return;
    if (!interaction.inGuild() || !interaction.guild || !interaction.member) return;
    if (interaction.guild.id !== config.guildId) return;

    try {
      const blueprint = loadBlueprint();
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const memberRole =
        findRole(interaction.guild, blueprint, config.memberRoleName) ??
        findRole(interaction.guild, blueprint, "Newbie");
      const unverified = interaction.guild.roles.cache.find((r) =>
        matchesAny(r.name, "Unverified", ["unverified"]),
      );

      if (memberRole && !member.roles.cache.has(memberRole.id)) {
        await member.roles.add(memberRole, "GuardiansGuildX verification");
      }
      if (unverified && member.roles.cache.has(unverified.id)) {
        await member.roles.remove(unverified, "GuardiansGuildX verification");
      }

      await interaction.reply({
        content: "You're verified — welcome to Guardians Guild. Grab game roles with `/roles`.",
        ephemeral: true,
      });
    } catch (err) {
      console.error("Verify failed:", err);
      await interaction
        .reply({ content: "Verification failed — ask staff to check bot role order.", ephemeral: true })
        .catch(() => undefined);
    }
  });
}

export async function postVerifyPanel(channel: TextChannel): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Verify to enter")
    .setDescription(
      [
        "Tap the button below to unlock the server.",
        "",
        "By verifying you agree to follow the rules in the rules channel.",
      ].join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

export async function findVerifyChannel(
  guild: import("discord.js").Guild,
): Promise<TextChannel | null> {
  const blueprint = loadBlueprint();
  const ch =
    findChannel(guild, blueprint, "verify-here") ??
    guild.channels.cache.find(
      (c): c is TextChannel =>
        c.isTextBased() && !c.isDMBased() && matchesAny(c.name, "verify-here", ["verify"]),
    );
  return ch && ch.isTextBased() ? (ch as TextChannel) : null;
}
