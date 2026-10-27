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
import { postVerifyPanel, findVerifyChannel } from "./verification.js";

/** Posts verify + self-role panels once when the bot starts (skips if already posted). */
export function registerSetupPanels(client: Client): void {
  client.once("clientReady", () => {
    void (async () => {
      try {
        const guild = await client.guilds.fetch(config.guildId);
        await guild.channels.fetch();
        await guild.roles.fetch();
        const blueprint = loadBlueprint();

        const verifyCh = await findVerifyChannel(guild);
        if (verifyCh) {
          const recent = await verifyCh.messages.fetch({ limit: 20 });
          const already = recent.some(
            (m) => m.author.id === client.user?.id && m.components.length > 0,
          );
          if (!already) {
            await postVerifyPanel(verifyCh);
            console.log(`Posted verify panel in #${verifyCh.name}`);
          }
        }

        const pickRoles =
          findChannel(guild, blueprint, "pick-roles") ??
          guild.channels.cache.find(
            (c): c is TextChannel =>
              c.isTextBased() &&
              !c.isDMBased() &&
              matchesAny(c.name, "pick-roles", ["pick roles", "roles"]),
          );

        if (pickRoles && pickRoles.isTextBased()) {
          const text = pickRoles as TextChannel;
          const recent = await text.messages.fetch({ limit: 20 });
          const already = recent.some(
            (m) =>
              m.author.id === client.user?.id &&
              m.embeds[0]?.title === "Game & community roles",
          );
          if (!already) {
            const resolved = blueprint.roles
              .filter((r) => r.selfAssignable)
              .map((r) => findRole(guild, blueprint, r.name))
              .filter((r): r is NonNullable<typeof r> => Boolean(r));

            const embed = new EmbedBuilder()
              .setColor(0x3498db)
              .setTitle("Game & community roles")
              .setDescription(
                "Toggle the roles you play. You can also use `/roles` anytime.",
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
            if (resolved.length) {
              await text.send({ embeds: [embed], components });
              console.log(`Posted roles panel in #${text.name}`);
            }
          }
        }
      } catch (err) {
        console.error("Setup panels error:", err);
      }
    })();
  });
}
