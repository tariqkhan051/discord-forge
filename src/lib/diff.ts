import type {
  BlueprintCategory,
  BlueprintChannel,
  BlueprintRole,
  ServerBlueprint,
} from "./blueprint.js";
import { aliasesFor } from "./blueprint.js";
import { matchesAny, normalizeName } from "./normalize.js";

export interface LiveRole {
  id: string;
  name: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  topic?: string | null;
}

export interface LiveCategory {
  id: string;
  name: string;
}

export interface LiveStructure {
  guildId: string;
  guildName: string;
  roles: LiveRole[];
  categories: LiveCategory[];
  channels: LiveChannel[];
}

export type DiffAction = "create" | "skip" | "alias-match";

export interface RoleDiff {
  action: DiffAction;
  blueprintName: string;
  matchedLiveName?: string;
  matchedLiveId?: string;
  reason: string;
}

export interface CategoryDiff {
  action: DiffAction;
  blueprintName: string;
  matchedLiveName?: string;
  matchedLiveId?: string;
  reason: string;
}

export interface ChannelDiff {
  action: DiffAction;
  blueprintId: string;
  blueprintName: string;
  categoryName: string;
  matchedLiveName?: string;
  matchedLiveId?: string;
  reason: string;
  type: string;
}

export interface StructureDiff {
  roles: RoleDiff[];
  categories: CategoryDiff[];
  channels: ChannelDiff[];
  summary: {
    rolesCreate: number;
    rolesSkip: number;
    categoriesCreate: number;
    categoriesSkip: number;
    channelsCreate: number;
    channelsSkip: number;
  };
}

function findLiveByAliases(
  liveNames: { id: string; name: string }[],
  canonical: string,
  aliases: string[],
): { id: string; name: string } | undefined {
  const canonicalNorm = normalizeName(canonical);
  // Exact normalized equality only — never substring matches (e.g. "welcome-and-rules"
  // must not bind to a channel named "rules").
  const exact = liveNames.find((item) => normalizeName(item.name) === canonicalNorm);
  if (exact) return exact;

  const aliasNorms = new Set(
    aliases.map(normalizeName).filter((a) => Boolean(a) && a !== canonicalNorm),
  );
  return liveNames.find((item) => aliasNorms.has(normalizeName(item.name)));
}

export function computeDiff(blueprint: ServerBlueprint, live: LiveStructure): StructureDiff {
  const roles: RoleDiff[] = [];
  const categories: CategoryDiff[] = [];
  const channels: ChannelDiff[] = [];

  for (const role of blueprint.roles) {
    const aliases = aliasesFor(blueprint, role.name);
    const match = findLiveByAliases(live.roles, role.name, aliases);
    if (match) {
      const action: DiffAction =
        normalizeName(match.name) === normalizeName(role.name) ? "skip" : "alias-match";
      roles.push({
        action,
        blueprintName: role.name,
        matchedLiveName: match.name,
        matchedLiveId: match.id,
        reason:
          action === "alias-match"
            ? `Existing role "${match.name}" matches via alias — will not create "${role.name}"`
            : `Role "${match.name}" already exists`,
      });
    } else {
      roles.push({
        action: "create",
        blueprintName: role.name,
        reason: `Role "${role.name}" not found — will create`,
      });
    }
  }

  for (const category of blueprint.categories) {
    const aliases = aliasesFor(blueprint, category.name);
    const match = findLiveByAliases(live.categories, category.name, [
      ...aliases,
      category.name,
    ]);
    if (match) {
      const action: DiffAction =
        normalizeName(match.name) === normalizeName(category.name) ? "skip" : "alias-match";
      categories.push({
        action,
        blueprintName: category.name,
        matchedLiveName: match.name,
        matchedLiveId: match.id,
        reason:
          action === "alias-match"
            ? `Existing category "${match.name}" matches — will reuse`
            : `Category "${match.name}" already exists`,
      });
    } else {
      categories.push({
        action: "create",
        blueprintName: category.name,
        reason: `Category "${category.name}" not found — will create`,
      });
    }
  }

  for (const category of blueprint.categories) {
    for (const channel of category.channels) {
      channels.push(diffChannel(blueprint, live, category, channel));
    }
  }

  const summary = {
    rolesCreate: roles.filter((r) => r.action === "create").length,
    rolesSkip: roles.filter((r) => r.action !== "create").length,
    categoriesCreate: categories.filter((c) => c.action === "create").length,
    categoriesSkip: categories.filter((c) => c.action !== "create").length,
    channelsCreate: channels.filter((c) => c.action === "create").length,
    channelsSkip: channels.filter((c) => c.action !== "create").length,
  };

  return { roles, categories, channels, summary };
}

function diffChannel(
  blueprint: ServerBlueprint,
  live: LiveStructure,
  category: BlueprintCategory,
  channel: BlueprintChannel,
): ChannelDiff {
  const aliases = [
    ...aliasesFor(blueprint, channel.name),
    ...aliasesFor(blueprint, channel.id),
  ];
  const match = findLiveByAliases(live.channels, channel.name, aliases);

  if (match) {
    const action: DiffAction =
      normalizeName(match.name) === normalizeName(channel.name) ? "skip" : "alias-match";
    return {
      action,
      blueprintId: channel.id,
      blueprintName: channel.name,
      categoryName: category.name,
      matchedLiveName: match.name,
      matchedLiveId: match.id,
      type: channel.type,
      reason:
        action === "alias-match"
          ? `Existing channel "${match.name}" matches via alias — will not create "${channel.name}" (preserving existing)`
          : `Channel "${match.name}" already exists`,
    };
  }

  return {
    action: "create",
    blueprintId: channel.id,
    blueprintName: channel.name,
    categoryName: category.name,
    type: channel.type,
    reason: `Channel "${channel.name}" not found under any alias — will create in "${category.name}"`,
  };
}

export function formatDiffMarkdown(diff: StructureDiff, live: LiveStructure): string {
  const lines: string[] = [
    `# Dry-run report — ${live.guildName} (\`${live.guildId}\`)`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Kind | Create | Skip / alias-match |`,
    `| --- | ---: | ---: |`,
    `| Roles | ${diff.summary.rolesCreate} | ${diff.summary.rolesSkip} |`,
    `| Categories | ${diff.summary.categoriesCreate} | ${diff.summary.categoriesSkip} |`,
    `| Channels | ${diff.summary.channelsCreate} | ${diff.summary.channelsSkip} |`,
    "",
    "> **Safety:** apply creates missing items only. Nothing is deleted or renamed.",
    "",
    "## Roles",
    "",
  ];

  for (const r of diff.roles) {
    lines.push(
      `- **${r.action}** \`${r.blueprintName}\`${r.matchedLiveName ? ` → \`${r.matchedLiveName}\`` : ""} — ${r.reason}`,
    );
  }

  lines.push("", "## Categories", "");
  for (const c of diff.categories) {
    lines.push(
      `- **${c.action}** \`${c.blueprintName}\`${c.matchedLiveName ? ` → \`${c.matchedLiveName}\`` : ""} — ${c.reason}`,
    );
  }

  lines.push("", "## Channels", "");
  for (const ch of diff.channels) {
    lines.push(
      `- **${ch.action}** [\`${ch.categoryName}\`] \`${ch.blueprintName}\` (${ch.type})${ch.matchedLiveName ? ` → \`${ch.matchedLiveName}\`` : ""} — ${ch.reason}`,
    );
  }

  lines.push(
    "",
    "## Next step",
    "",
    "Review this report. If it looks correct, explicitly approve apply (e.g. say **approve apply** in chat, or run `npm run apply` yourself).",
    "",
  );

  return lines.join("\n");
}
