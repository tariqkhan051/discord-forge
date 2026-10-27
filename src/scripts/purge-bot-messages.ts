/**
 * Delete messages posted by other bots (not GuardiansGuildX).
 *
 * Usage:
 *   npx tsx src/scripts/purge-bot-messages.ts
 *   npx tsx src/scripts/purge-bot-messages.ts --execute
 *   npx tsx src/scripts/purge-bot-messages.ts --execute --include-own
 */
import "dotenv/config";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  type GuildBasedChannel,
  type Message,
  type TextChannel,
} from "discord.js";

const EXECUTE = process.argv.includes("--execute");
const INCLUDE_OWN = process.argv.includes("--include-own");
const OWN_NAMES = new Set(["guardiansguildx", "guardians guild x"]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isOwnBot(tagOrName: string, userId: string, clientUserId: string): boolean {
  if (clientUserId && userId === clientUserId) return true;
  const n = tagOrName.toLowerCase().replace(/#\d+$/, "").trim();
  return OWN_NAMES.has(n) || n.includes("guardiansguild");
}

function isTarget(m: Message, clientUserId: string): boolean {
  if (!m.author.bot) return false;
  if (!INCLUDE_OWN && isOwnBot(m.author.tag, m.author.id, clientUserId)) return false;
  return true;
}

async function collectTargets(
  channel: TextChannel,
  clientUserId: string,
): Promise<Message[]> {
  const targets: Message[] = [];
  let lastId: string | undefined;
  let scanned = 0;

  for (;;) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {}),
    });
    if (batch.size === 0) break;

    scanned += batch.size;
    for (const m of batch.values()) {
      if (isTarget(m, clientUserId)) targets.push(m);
    }

    if (scanned % 500 === 0 || batch.size < 100) {
      process.stdout.write(`\r  #${channel.name}: scanned ${scanned}, targets ${targets.length}   `);
    }

    lastId = batch.last()?.id;
    if (batch.size < 100) break;
    await sleep(250);
  }

  if (scanned > 0) process.stdout.write("\n");
  return targets;
}

async function deleteTargets(
  channel: TextChannel,
  targets: Message[],
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = targets.filter((m) => m.createdTimestamp > twoWeeks);
  const older = targets.filter((m) => m.createdTimestamp <= twoWeeks);

  for (let i = 0; i < recent.length; i += 100) {
    const chunk = recent.slice(i, i + 100);
    try {
      if (chunk.length === 1) {
        await chunk[0].delete();
        deleted += 1;
      } else {
        const removed = await channel.bulkDelete(
          chunk.map((m) => m.id),
          true,
        );
        deleted += removed.size;
      }
    } catch {
      for (const m of chunk) {
        try {
          await m.delete();
          deleted += 1;
          await sleep(300);
        } catch {
          errors += 1;
        }
      }
    }
    process.stdout.write(`\r  deleting recent ${Math.min(i + chunk.length, recent.length)}/${recent.length}   `);
    await sleep(1000);
  }

  for (let i = 0; i < older.length; i++) {
    try {
      await older[i].delete();
      deleted += 1;
    } catch {
      errors += 1;
    }
    if (i % 10 === 0 || i === older.length - 1) {
      process.stdout.write(`\r  deleting older ${i + 1}/${older.length}   `);
    }
    await sleep(450);
  }

  if (targets.length) process.stdout.write("\n");
  return { deleted, errors };
}

function isPurgeable(ch: GuildBasedChannel): ch is TextChannel {
  return (
    ch.type === ChannelType.GuildText ||
    ch.type === ChannelType.GuildAnnouncement
  );
}

async function main(): Promise<void> {
  const token = process.env.DISCORD_TOKEN?.trim();
  const guildId = process.env.GUILD_ID?.trim();
  if (!token || !guildId) throw new Error("DISCORD_TOKEN and GUILD_ID required");

  console.log(EXECUTE ? "*** EXECUTE MODE ***" : "*** DRY-RUN ***");
  console.log(
    INCLUDE_OWN
      ? "Including GuardiansGuildX messages"
      : "Keeping GuardiansGuildX messages",
  );

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  await guild.channels.fetch();
  const ownId = client.user?.id ?? "";

  let totalWould = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  const channels = [...guild.channels.cache.values()]
    .filter(isPurgeable)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const channel of channels) {
    const me = guild.members.me;
    if (me && !channel.permissionsFor(me)?.has(["ViewChannel", "ReadMessageHistory"])) {
      console.log(`skip #${channel.name} (no read)`);
      continue;
    }
    if (EXECUTE && me && !channel.permissionsFor(me)?.has("ManageMessages")) {
      console.log(`skip #${channel.name} (no Manage Messages)`);
      continue;
    }

    console.log(`#${channel.name}`);
    const targets = await collectTargets(channel, ownId);
    totalWould += targets.length;

    if (!EXECUTE) {
      console.log(`  would delete ${targets.length}`);
      continue;
    }

    if (!targets.length) {
      console.log("  nothing to delete");
      continue;
    }

    const { deleted, errors } = await deleteTargets(channel, targets);
    totalDeleted += deleted;
    totalErrors += errors;
    console.log(`  deleted ${deleted}, errors ${errors}`);
  }

  console.log("\n--- Summary ---");
  console.log(`Would/found: ${totalWould}`);
  if (EXECUTE) {
    console.log(`Deleted: ${totalDeleted}`);
    console.log(`Errors: ${totalErrors}`);
  } else {
    console.log("Re-run with --execute to delete.");
  }

  client.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
