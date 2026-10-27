import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ChannelTypeName = "GuildText" | "GuildVoice";

export interface BlueprintChannel {
  id: string;
  name: string;
  type: ChannelTypeName;
  topic?: string;
  userLimit?: number;
  permissionProfile: string;
  preferExistingAliases?: boolean;
}

export interface BlueprintCategory {
  id: string;
  name: string;
  channels: BlueprintChannel[];
}

export interface BlueprintRole {
  id: string;
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
  permissions: string[];
  staff?: boolean;
  selfAssignable?: boolean;
}

export interface PermissionSide {
  allow: string[];
  deny: string[];
}

export interface PermissionProfile {
  everyone: PermissionSide;
  staffCanSend?: boolean;
  staffOnly?: boolean;
  adminOnly?: boolean;
}

export interface ServerBlueprint {
  name: string;
  version: string;
  aliases: Record<string, string[]>;
  roles: BlueprintRole[];
  categories: BlueprintCategory[];
  permissionProfiles: Record<string, PermissionProfile>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadBlueprint(): ServerBlueprint {
  const path = join(__dirname, "..", "blueprint", "server-blueprint.json");
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as ServerBlueprint;
}

export function aliasesFor(blueprint: ServerBlueprint, key: string): string[] {
  return blueprint.aliases[key] ?? [];
}
