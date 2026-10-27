import {
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  PermissionsBitField,
  type CategoryChannel,
  type Guild,
  type OverwriteResolvable,
  type Role,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import type { BlueprintChannel, BlueprintRole, ServerBlueprint } from "./blueprint.js";
import { aliasesFor, loadBlueprint } from "./blueprint.js";
import { config } from "./config.js";
import {
  computeDiff,
  type LiveStructure,
  type StructureDiff,
} from "./diff.js";
import { matchesAny } from "./normalize.js";

const PERM_MAP: Record<string, bigint> = {
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ManageNicknames: PermissionFlagsBits.ManageNicknames,
  ViewAuditLog: PermissionFlagsBits.ViewAuditLog,
  MentionEveryone: PermissionFlagsBits.MentionEveryone,
  MuteMembers: PermissionFlagsBits.MuteMembers,
  DeafenMembers: PermissionFlagsBits.DeafenMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  ManageEvents: PermissionFlagsBits.ManageEvents,
  CreateEvents: PermissionFlagsBits.CreateEvents,
  ViewChannel: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  EmbedLinks: PermissionFlagsBits.EmbedLinks,
  AttachFiles: PermissionFlagsBits.AttachFiles,
  AddReactions: PermissionFlagsBits.AddReactions,
  UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
  ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
  Connect: PermissionFlagsBits.Connect,
  Speak: PermissionFlagsBits.Speak,
  UseVAD: PermissionFlagsBits.UseVAD,
  Stream: PermissionFlagsBits.Stream,
};

function bitsFromNames(names: string[]): bigint {
  let bits = 0n;
  for (const name of names) {
    const bit = PERM_MAP[name];
    if (bit !== undefined) bits |= bit;
  }
  return bits;
}

/** CLI setup only needs Guilds — avoids privileged-intent errors during inspect/dry-run/apply. */
export async function withClient<T>(fn: (client: Client, guild: Guild) => Promise<T>): Promise<T> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  try {
    await client.login(config.token);
    const guild = await client.guilds.fetch(config.guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();
    return await fn(client, guild);
  } finally {
    client.destroy();
  }
}

export function snapshotLive(guild: Guild): LiveStructure {
  const categories = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .map((c) => ({ id: c.id, name: c.name }));

  const channels = guild.channels.cache
    .filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildVoice ||
        c.type === ChannelType.GuildAnnouncement,
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      topic: "topic" in c ? (c.topic ?? null) : null,
    }));

  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id)
    .map((r) => ({ id: r.id, name: r.name }));

  return {
    guildId: guild.id,
    guildName: guild.name,
    roles,
    categories,
    channels,
  };
}

export function findRole(guild: Guild, blueprint: ServerBlueprint, name: string): Role | undefined {
  const aliases = aliasesFor(blueprint, name);
  return guild.roles.cache.find((r) => matchesAny(r.name, name, aliases));
}

export function findCategory(
  guild: Guild,
  blueprint: ServerBlueprint,
  name: string,
): CategoryChannel | undefined {
  const aliases = aliasesFor(blueprint, name);
  return guild.channels.cache.find(
    (c): c is CategoryChannel =>
      c.type === ChannelType.GuildCategory && matchesAny(c.name, name, [...aliases, name]),
  );
}

export function findChannel(
  guild: Guild,
  blueprint: ServerBlueprint,
  name: string,
  idKey?: string,
): TextChannel | VoiceChannel | undefined {
  const aliases = [
    ...aliasesFor(blueprint, name),
    ...(idKey ? aliasesFor(blueprint, idKey) : []),
  ];
  return guild.channels.cache.find(
    (c): c is TextChannel | VoiceChannel =>
      (c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildVoice ||
        c.type === ChannelType.GuildAnnouncement) &&
      matchesAny(c.name, name, aliases),
  ) as TextChannel | VoiceChannel | undefined;
}

function staffRoles(guild: Guild, blueprint: ServerBlueprint): Role[] {
  return blueprint.roles
    .filter((r) => r.staff)
    .map((r) => findRole(guild, blueprint, r.name))
    .filter((r): r is Role => Boolean(r));
}

function adminRoles(guild: Guild, blueprint: ServerBlueprint): Role[] {
  return ["Admin"]
    .map((name) => findRole(guild, blueprint, name))
    .filter((r): r is Role => Boolean(r));
}

function buildOverwrites(
  guild: Guild,
  blueprint: ServerBlueprint,
  channel: BlueprintChannel,
): OverwriteResolvable[] {
  const profile = blueprint.permissionProfiles[channel.permissionProfile];
  if (!profile) return [];

  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.id,
      allow: bitsFromNames(profile.everyone.allow),
      deny: bitsFromNames(profile.everyone.deny),
    },
  ];

  if (profile.staffOnly || profile.staffCanSend) {
    for (const role of staffRoles(guild, blueprint)) {
      overwrites.push({
        id: role.id,
        allow: new PermissionsBitField([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ]),
      });
    }
  }

  if (profile.adminOnly) {
    for (const role of adminRoles(guild, blueprint)) {
      overwrites.push({
        id: role.id,
        allow: new PermissionsBitField([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ]),
      });
    }
  }

  return overwrites;
}

function rolePermissions(role: BlueprintRole): PermissionsBitField {
  return new PermissionsBitField(bitsFromNames(role.permissions));
}

function parseColor(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export interface ApplyResult {
  createdRoles: string[];
  createdCategories: string[];
  createdChannels: string[];
  skipped: string[];
  errors: string[];
}

export async function applyDiff(
  guild: Guild,
  blueprint: ServerBlueprint,
  diff: StructureDiff,
): Promise<ApplyResult> {
  const result: ApplyResult = {
    createdRoles: [],
    createdCategories: [],
    createdChannels: [],
    skipped: [],
    errors: [],
  };

  // Roles first (needed for channel overwrites)
  for (const roleDiff of diff.roles) {
    if (roleDiff.action !== "create") {
      result.skipped.push(`role:${roleDiff.blueprintName}`);
      continue;
    }
    const spec = blueprint.roles.find((r) => r.name === roleDiff.blueprintName);
    if (!spec) continue;
    try {
      await guild.roles.create({
        name: spec.name,
        colors: { primaryColor: parseColor(spec.color) },
        hoist: spec.hoist,
        mentionable: spec.mentionable,
        permissions: rolePermissions(spec),
        reason: "discord-forge apply: create missing role",
      });
      result.createdRoles.push(spec.name);
    } catch (err) {
      result.errors.push(`role ${spec.name}: ${String(err)}`);
    }
  }

  // Refresh roles cache after creates
  await guild.roles.fetch();

  for (const catDiff of diff.categories) {
    if (catDiff.action !== "create") {
      result.skipped.push(`category:${catDiff.blueprintName}`);
      continue;
    }
    try {
      await guild.channels.create({
        name: catDiff.blueprintName,
        type: ChannelType.GuildCategory,
        reason: "discord-forge apply: create missing category",
      });
      result.createdCategories.push(catDiff.blueprintName);
    } catch (err) {
      result.errors.push(`category ${catDiff.blueprintName}: ${String(err)}`);
    }
  }

  await guild.channels.fetch();

  for (const chDiff of diff.channels) {
    if (chDiff.action !== "create") {
      result.skipped.push(`channel:${chDiff.blueprintName}`);
      continue;
    }
    const categorySpec = blueprint.categories.find((c) => c.name === chDiff.categoryName);
    const channelSpec = categorySpec?.channels.find((c) => c.name === chDiff.blueprintName);
    if (!categorySpec || !channelSpec) continue;

    const parent = findCategory(guild, blueprint, categorySpec.name);
    const type =
      channelSpec.type === "GuildVoice" ? ChannelType.GuildVoice : ChannelType.GuildText;

    try {
      const overwrites = buildOverwrites(guild, blueprint, channelSpec);
      await guild.channels.create({
        name: channelSpec.name,
        type,
        parent: parent?.id,
        topic: channelSpec.topic,
        userLimit: channelSpec.userLimit,
        permissionOverwrites: overwrites,
        reason: "discord-forge apply: create missing channel",
      });
      result.createdChannels.push(channelSpec.name);
    } catch (err) {
      result.errors.push(`channel ${channelSpec.name}: ${String(err)}`);
    }
  }

  return result;
}

export async function inspectGuild(): Promise<{ live: LiveStructure; blueprint: ServerBlueprint }> {
  const blueprint = loadBlueprint();
  return withClient(async (_client, guild) => {
    const live = snapshotLive(guild);
    return { live, blueprint };
  });
}

export async function dryRunGuild(): Promise<{
  live: LiveStructure;
  blueprint: ServerBlueprint;
  diff: StructureDiff;
}> {
  const blueprint = loadBlueprint();
  return withClient(async (_client, guild) => {
    const live = snapshotLive(guild);
    const diff = computeDiff(blueprint, live);
    return { live, blueprint, diff };
  });
}

export async function applyGuild(): Promise<{
  live: LiveStructure;
  diff: StructureDiff;
  result: ApplyResult;
}> {
  const blueprint = loadBlueprint();
  return withClient(async (_client, guild) => {
    const liveBefore = snapshotLive(guild);
    const diff = computeDiff(blueprint, liveBefore);
    const result = await applyDiff(guild, blueprint, diff);
    const live = snapshotLive(guild);
    return { live, diff, result };
  });
}
